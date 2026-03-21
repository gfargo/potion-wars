# Potion Wars - Architecture Refactor Specification

**Status**: Planning Phase
**Created**: 2025-01-03
**Priority**: Critical - Addresses core gameplay bugs

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Bug Analysis](#critical-bug-analysis)
3. [Current Architecture Deep Dive](#current-architecture-deep-dive)
4. [Root Cause Analysis](#root-cause-analysis)
5. [Proposed Solution A: Unified React Reducer](#proposed-solution-a-unified-react-reducer)
6. [Proposed Solution B: Zustand Store](#proposed-solution-b-zustand-store)
7. [Comparison Matrix](#comparison-matrix)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Testing Strategy](#testing-strategy)
10. [Rollback Plan](#rollback-plan)

---

## Executive Summary

### The Problem

Potion Wars suffers from critical race conditions caused by **asynchronous state updates competing with synchronous screen transitions**. The architecture splits responsibilities across three contexts (Game, UI, Message) with interdependencies that create unpredictable behavior.

### Manifestation

- **Events trigger but never display** (Rival Encounters, Mysterious Stranger)
- **Multiple events conflict** (second event overwrites first before resolution)
- **Game effects lost** (inventory changes, reputation, price modifications)
- **Game Over state persists** across new games
- **Screen transitions happen too early** before state propagates

### Root Cause

React's `useReducer` dispatch is **asynchronous** but screen logic reads state **synchronously**. When:

1. Action dispatches state change (async, queued)
2. Action returns result data (sync, immediate)
3. Screen transition triggered based on result (sync, immediate)
4. Screen renders and checks game state (stale, not updated yet)
5. Next render cycle processes queued state update (too late)

Result: **Screens render with stale state, missing critical data like `currentEvent`**.

### Solution Approach

**Unify state management** to eliminate timing issues. Two options:

- **Option A**: Single unified reducer managing game + UI + screens (pure React)
- **Option B**: Zustand store with synchronous updates (lightweight library)

Both eliminate race conditions by ensuring state updates complete before screen logic runs.

---

## Critical Bug Analysis

### Bug Category 1: Events Not Displaying

**Severity**: CRITICAL
**Frequency**: ~60% of multi-step events
**User Impact**: Core gameplay loop broken

#### Symptoms

```bash
# Game log shows event triggered
[6:12:01 PM] Rival Encounter: Goldbeard the Trader: Ah, a fellow entrepreneur!
            Perhaps we can come to a mutually beneficial arrangement?
            "Perhaps we can come to some sort of... arrangement?"

# But screen shows main game UI, not MultiStepEventScreen
# User never sees choices, event is effectively skipped
```

#### Technical Flow

```
User travels → TravelingScreen completes (4s timer)
    ↓
GameContext.handleAction('completeTravelAnimation')
    ↓
actions.travel(destination)        [Dispatch #1 - async]
actions.advanceDay(true, true)     [Dispatch #2 - async]
    ↓
advanceDay returns dayResult.eventResult = { currentEvent, message, ... }
GameContext logs: "Event triggered: Goldbeard the Trader"
    ↓
useEffect sees travelState.status === 'complete'
    ↓
Promise.resolve().then(() => setScreen('game'))
    ↓
GameScreen renders
    ↓
const showEvent = Boolean(gameState.currentEvent)  // ← currentEvent is UNDEFINED
    ↓
showEvent = false → renders main UI instead of MultiStepEventScreen
    ↓
[Next render cycle]: dispatch propagates, currentEvent now set, but TOO LATE
```

#### Root Cause Location

- **File**: `src/contexts/GameContext.tsx`
- **Lines**: 200-269 (`completeTravelAnimation` case)
- **Issue**: useEffect (lines 145-156) transitions screen before dispatch propagates

- **File**: `src/core/state/hooks/useGameState.ts`
- **Lines**: 30-38 (`advanceDay` implementation)
- **Issue**: Pre-compute result + dispatch async + return sync pattern

- **File**: `src/screens/GameScreen.tsx`
- **Line**: 35 (`showEvent` derivation)
- **Issue**: Derives state from gameState in render (reads stale value)

---

### Bug Category 2: Multiple Events Conflicting

**Severity**: HIGH
**Frequency**: ~40% when events trigger back-to-back
**User Impact**: Events lost, unpredictable gameplay

#### Symptoms

```bash
# Two events trigger in sequence
[6:14:21 PM] Mysterious Stranger: A cloaked figure approaches...
[6:14:30 PM] You chose: Try to negotiate a truce
[6:14:30 PM] Goldbeard the Trader undercut your prices!

# User never saw Mysterious Stranger screen
# Goldbeard event overwrote Mysterious Stranger in state
# User was only shown Goldbeard choices
```

#### Technical Flow

```
Travel completes → Event A triggers (Mysterious Stranger)
    ↓
gameState.currentEvent = EventA
    ↓
[Screen should display EventA but doesn't due to Bug #1]
    ↓
User performs action (brew, sell, etc.) → advances day
    ↓
Event B triggers (Goldbeard)
    ↓
gameState.currentEvent = EventB  // ← OVERWRITES EventA
    ↓
Screen finally displays event, but shows EventB
    ↓
EventA is permanently lost, never resolved
```

#### Root Cause Location

- **File**: `src/core/state/reducers/gameReducer.ts`
- **Lines**: 89-116 (`advanceDay` case)
- **Issue**: Only single `currentEvent` field in state, no queue

- **File**: `src/types/game.types.ts`
- **Line**: 23 (`GameState` type definition)
- **Issue**: `currentEvent?: MultiStepEvent` - should be event queue

---

### Bug Category 3: Game Effects Not Applying

**Severity**: HIGH
**Frequency**: ~30% of events with effects
**User Impact**: Game state corruption, broken balance

#### Symptoms

```bash
# Event says inventory halved
[6:17:09 PM] Royal Inspection: The royal guards inspect your potions!
            You lose half of your inventory.

# But inventory unchanged
Inventory 🎒
Wisdom Draught: 17  # ← Should be 8 or 9

# Event says prices doubled
[6:18:12 PM] Ingredient Shortage: There's a shortage of potion ingredients!
            Prices double for the day.

# But prices are same as previous location
Market Prices 🧪
Wisdom Draught: 37g →  # ← Should be ~74g
```

#### Technical Flow

```
Event effect function runs:
    ↓
return {
    ...state,
    inventory: { ...state.inventory, [item]: Math.floor(quantity / 2) },
    message: "You lose half of your inventory."
}
    ↓
Reducer receives new state with modified inventory
    ↓
BUT: User never sees event screen (Bug #1)
    ↓
Next action triggers, event cleared from state
    ↓
Effect modifications might get overwritten by next action
    OR
    Effect never properly commits because event wasn't resolved
```

#### Root Cause Location

- **File**: `src/core/events/handlers/standard.ts`
- **Lines**: Various effect functions
- **Issue**: Effects apply to reducer result but may not persist if event isn't resolved

- **File**: `src/core/events/index.ts`
- **Lines**: 88-94 (single-step events), 127-135 (multi-step completion)
- **Issue**: State changes need explicit commit, not just return value

---

### Bug Category 4: Game Over State Persistence

**Severity**: MEDIUM
**Frequency**: 100% when saving during game over transition
**User Impact**: Cannot start new game without multiple attempts

#### Symptoms

```bash
# Get game over, return to menu, select "New Game"
# Choose same slot that just got game over
# Game loads, instantly shows "Game Over" again

# Second attempt: Menu shows "Game Over" on slot
# Select slot again for new game
# NOW it works - fresh game starts
```

#### Technical Flow

```
Game Over condition met (health = 0 or debt too high)
    ↓
GameContext.handleAction end check (line 419):
if (selectors.isGameOver) { setScreen('game-over') }
    ↓
Game saves state to disk (async file I/O)
    ↓
State might include transient fields: currentEvent, etc.
    ↓
User returns to menu, selects "New Game" on same slot
    ↓
GameContext.handleAction('startGame'):
    actions.initializeGame()  // ← Dispatches async
    actions.saveGame(slot)
    ↓
Game Over check runs BEFORE initializeGame dispatch propagates
    ↓
Check sees old state (still has health=0), triggers game-over screen
    ↓
Second attempt: Saved file now has initial state, works correctly
```

#### Root Cause Location

- **File**: `src/contexts/GameContext.tsx`
- **Lines**: 419-421 (game over check)
- **Issue**: Check runs synchronously after async action

- **File**: `src/core/state/reducers/gameReducer.ts`
- **Lines**: 291-312 (`loadGame` case)
- **Issue**: Loaded state might include transient fields not properly cleared

- **File**: `src/core/persistence/dataValidation.ts`
- **Lines**: 352-387 (`sanitizeGameState`)
- **Issue**: Clears transient state but only when saving, not when loading

---

## Current Architecture Deep Dive

### State Management Structure

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                             │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │ UIProvider   │  │ GameProvider │  │ MessageProvider│   │
│  │              │  │              │  │                │   │
│  │ - screen     │  │ - gameState  │  │ - messages[]   │   │
│  │ - travelState│  │ - handleAction│  │ - addMessage   │   │
│  └──────────────┘  └──────────────┘  └────────────────┘   │
│         ↓                  ↓                  ↓             │
│    Interdependent - Create Race Conditions                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────────────────────┐
              │     Screen Components       │
              │                             │
              │  - GameScreen               │
              │  - TravelingScreen          │
              │  - MultiStepEventScreen     │
              │  - NPCInteractionScreen     │
              └─────────────────────────────┘
```

### Context Responsibilities

#### UIContext (`src/contexts/UIContext.tsx`)

**Purpose**: Manage screen navigation and UI state

**State**:

```typescript
{
  currentScreen: Screen,           // 'title' | 'game' | 'traveling' | 'game-over'
  showHelp: boolean,
  quitConfirmation: boolean,
  travelState: TravelState,        // { status: 'idle' | 'animating' | 'complete', destination?: string }
}
```

**Actions**:

- `setScreen(screen)`
- `toggleHelp()`
- `toggleQuitConfirmation()`
- `setTravelDestination(destination)`
- `completeTravelAnimation()`
- `resetTravelState()`

**Issues**:

- `travelState` tracks animation progress but is separate from game state
- `currentScreen` is manually managed, creates opportunity for desync
- Multiple setScreen calls can race

#### GameContext (`src/contexts/GameContext.tsx`)

**Purpose**: Manage game state and actions

**State** (delegated to `useGameState`):

```typescript
{
  day: number,
  cash: number,
  debt: number,
  health: number,
  location: Location,
  inventory: Record<string, number>,
  prices: Record<string, number>,
  currentEvent?: MultiStepEvent,
  currentStep?: number,
  isShowingEventOutcome?: boolean,
  currentNPCInteraction?: NPCInteractionState,
  // ... plus reputation, marketData, tradeHistory
}
```

**Actions**:

- `handleAction(action, parameters)` - Central dispatcher
- `handleEventChoice(choiceIndex)` - Special handler for events
- `acknowledgeEventOutcome()` - Clear event after display

**Issues**:

- `handleAction` contains 15+ case statements mixing concerns
- Actions dispatch to reducer (async) but return results (sync)
- useEffect watches `travelState` from UIContext - cross-context dependency
- Game Over check runs at end of every action, races with state updates

#### MessageContext (`src/contexts/MessageContext.tsx`)

**Purpose**: Manage game log messages

**State**:

```typescript
{
  messages: Message[]              // { text, type, timestamp }
}
```

**Actions**:

- `addMessage(type, text)`
- `clearMessages()`

**Issues** (Minor):

- Least problematic context, mostly works fine
- Could be integrated with game state for consistency

### State Flow Diagram

```
User Action (e.g., Travel)
    ↓
┌─────────────────────────────────────────────────────────────┐
│ ActionMenu.tsx                                              │
│   handleAction('travel', destination)                       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ GameContext.handleAction                                    │
│   case 'travel':                                            │
│     setTravelDestination(destination)  ← UIContext update   │
│     setScreen('traveling')             ← UIContext update   │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ GameScreen - Re-renders with screen='traveling'             │
│   Renders TravelingScreen                                   │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ TravelingScreen                                             │
│   Plays animation for 4 seconds                             │
│   useEffect timer expires:                                  │
│     completeTravelAnimation()          ← UIContext update   │
│     handleAction('completeTravelAnimation')                 │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ GameContext.handleAction                                    │
│   case 'completeTravelAnimation':                           │
│     actions.travel(destination)        ← Dispatch to reducer│
│     actions.advanceDay(true, true)     ← Dispatch to reducer│
│     (Both dispatches are ASYNC, queued by React)           │
│     dayResult = { eventResult: { currentEvent, message } }  │
│     (dayResult computed with OLD state, returned sync)      │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ GameContext useEffect - Watches travelState.status          │
│   if (status === 'complete' && screen === 'traveling'):     │
│     Promise.resolve().then(() => setScreen('game'))         │
│   ← Runs IMMEDIATELY, doesn't wait for dispatches           │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ React Batch Update Cycle                                    │
│   1. UIContext updates (screen = 'game')                    │
│   2. GameContext reducer processes (DELAYED, not yet)       │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ GameScreen - Re-renders with screen='game'                  │
│   const showEvent = Boolean(gameState.currentEvent)         │
│   ← currentEvent is UNDEFINED (dispatch not propagated yet) │
│   showEvent = false                                          │
│   ← Renders main game UI                                    │
└─────────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────────┐
│ Next Render Cycle (too late)                                │
│   GameContext reducer updates complete                      │
│   gameState.currentEvent now set to event                   │
│   But screen already rendered main UI                       │
│   Event never displays                                      │
└─────────────────────────────────────────────────────────────┘
```

### Critical Race Condition Points

#### Race Condition #1: Travel Completion

**Location**: `GameContext.tsx:145-156` (useEffect) + `GameContext.tsx:200-269` (action handler)

```typescript
// useEffect runs when travel animation completes
useEffect(() => {
  if (travelState.status === 'complete' && currentScreen === 'traveling') {
    // Transition back to game screen
    Promise.resolve().then(() => {
      setScreen('game')  // ← Screen changes BEFORE state updates
      resetTravelState()
    })
  }
}, [travelState.status, currentScreen])

// Meanwhile in handleAction:
case 'completeTravelAnimation': {
  actions.travel(destination)        // ← Async dispatch
  actions.advanceDay(true, true)     // ← Async dispatch
  // useEffect above fires before these propagate
  break
}
```

**Issue**: Two independent update paths racing:

- Path A: useEffect → setScreen (synchronous)
- Path B: dispatch → reducer → state update (asynchronous)
- Path A always wins, screen changes before state ready

#### Race Condition #2: Pre-computed Results

**Location**: `useGameState.ts:30-38` (advanceDay action)

```typescript
const advanceDay = useCallback(
  (triggerEvent?: boolean, triggerDebt?: boolean) => {
    const action = actions.advanceDay(triggerEvent, triggerDebt)
    const result = gameReducer(state, action) // ← Compute with CURRENT state
    dispatch(action) // ← Queue update for NEXT render
    return result._result // ← Return immediately
  },
  [state] // ← Captures state in closure
)
```

**Issue**:

- `gameReducer(state, action)` computes result synchronously
- `dispatch(action)` queues React state update
- Caller gets result data immediately
- But `gameState` in context won't update until next render
- Screen logic uses result data to make decisions, then checks `gameState` - mismatch!

#### Race Condition #3: Derived State in Render

**Location**: `GameScreen.tsx:35`

```typescript
const showEvent = Boolean(
  gameState.currentEvent || gameState.isShowingEventOutcome
)

// Later in render:
if (showEvent) {
  return <MultiStepEventScreen />
}
```

**Issue**:

- `gameState` comes from context via `useGame()` hook
- Context value is the state from the last completed render
- If dispatch is still pending, `gameState.currentEvent` is stale
- Derived value (`showEvent`) based on stale data
- Screen renders with wrong decision

### File-by-File Responsibilities

| File                                 | Purpose                                   | State Managed                             | Issues                                                |
| ------------------------------------ | ----------------------------------------- | ----------------------------------------- | ----------------------------------------------------- |
| `contexts/UIContext.tsx`             | Screen navigation, travel animation state | screen, travelState, showHelp, quit       | Separate from game state, manual transitions          |
| `contexts/GameContext.tsx`           | Action dispatcher, game state coordinator | None directly (delegates to useGameState) | Giant handleAction switch, cross-context dependencies |
| `contexts/MessageContext.tsx`        | Game log messages                         | messages array                            | Minor, works mostly fine                              |
| `core/state/hooks/useGameState.ts`   | Game state reducer integration            | gameState via useReducer                  | Pre-compute + async dispatch pattern                  |
| `core/state/reducers/gameReducer.ts` | Game state transformations                | N/A (pure function)                       | Large monolithic reducer                              |
| `core/state/actions/`                | Action creators and types                 | N/A (pure functions)                      | Works fine, well-typed                                |
| `screens/GameScreen.tsx`             | Main game UI, conditional rendering       | Local UI state only                       | Derives showEvent from context state                  |
| `screens/TravelingScreen.tsx`        | Travel animation                          | Animation frame state                     | Timing-based transition trigger                       |
| `screens/MultiStepEventScreen.tsx`   | Event choice UI with phases               | Phase state machine (local)               | Works correctly when shown                            |
| `screens/NPCInteractionScreen.tsx`   | NPC dialogue UI                           | None                                      | Works fine                                            |
| `core/events/index.ts`               | Event triggering logic                    | N/A (pure functions)                      | Single currentEvent, no queue                         |
| `core/events/handlers/`              | Event definitions and effects             | N/A (pure functions)                      | Effects work correctly                                |

### Key Insights

1. **Split Responsibilities**: Game state (GameContext) and UI state (UIContext) managed separately creates synchronization burden

2. **Async Dispatch Pattern**: useGameState pre-computes results with current state, dispatches update, returns immediately - consumers get result data but context state lags

3. **Manual Screen Transitions**: setScreen() calls scattered across codebase, not derived from state

4. **No Event Queue**: Single `currentEvent` field means events overwrite each other

5. **Derived State Timing**: Components derive showEvent, showNPC, etc. from context state that updates asynchronously

---

## Root Cause Analysis

### Primary Root Cause: State Update Lag

**Core Issue**: React's `useReducer` dispatch is **asynchronous** (batched), but application logic treats it as **synchronous**.

**Pattern**:

```typescript
// Inside useGameState action handler:
const result = gameReducer(state, action) // Compute result NOW
dispatch(action) // Queue update for LATER
return result // Return result NOW

// Caller:
const result = actions.someAction() // Gets result immediately
doSomethingWithResult(result) // Uses result data
// But gameState in context hasn't updated yet!
```

**Why This Happens**:

- useReducer dispatch is async to allow batching
- We want synchronous return values for logging, decisions
- Pattern creates temporal gap between result data and context state

**Manifestation**:

- GameContext receives event data, logs it, adds message
- useEffect triggers screen transition based on travel state
- GameScreen renders, checks gameState.currentEvent
- Value is undefined because dispatch hasn't propagated
- Screen renders wrong UI (main game instead of event)

### Secondary Root Cause: Multiple Sources of Truth

**Core Issue**: State spread across three contexts with interdependencies

**Example**:

- UIContext tracks `currentScreen` and `travelState`
- GameContext tracks `gameState` including events
- Screen logic needs both to decide what to render
- Updates to one don't automatically sync with the other

**Interdependencies**:

```
TravelState (UIContext) ←→ Game Actions (GameContext)
    "Travel animation complete" should trigger game logic

CurrentScreen (UIContext) ←→ Game Events (GameContext)
    "Event triggered" should show event screen

Messages (MessageContext) ←→ Game Actions (GameContext)
    Every action logs messages
```

**Problem**: No coordinator, manual synchronization, race-prone

### Tertiary Root Cause: Derived State in Render

**Core Issue**: Components derive state (showEvent, showNPC) in render phase from potentially stale context

**Pattern**:

```typescript
// GameScreen.tsx
const { gameState } = useGame() // Context value
const showEvent = Boolean(gameState.currentEvent) // Derive in render
```

**Why This Fails**:

- Context value is from last completed render
- If dispatch pending, value is stale
- Derivation based on stale data produces wrong result
- Component renders wrong UI

**Better Pattern**: Store derived state in reducer, access directly

### Event-Specific Root Causes

#### Events Not Displaying

**Direct Cause**: Screen transitions before `currentEvent` propagates

**Contributing Factors**:

1. useEffect timing (triggers on travelState.status change)
2. Async dispatch (state update queued)
3. Derived showEvent (checks stale gameState)

**Chain**: Travel completes → useEffect fires → setScreen('game') → GameScreen renders → checks gameState.currentEvent (undefined) → renders main UI → dispatch propagates (too late)

#### Multiple Events Conflicting

**Direct Cause**: Single `currentEvent` field, no queue

**Contributing Factors**:

1. Events can trigger on any day advance
2. Only one event can be active at a time
3. Second event overwrites first before resolution

**Chain**: Event A triggers → currentEvent = A → User never sees (Bug #1) → Day advances → Event B triggers → currentEvent = B (overwrites A) → Event A lost

#### Effects Not Applying

**Direct Cause**: Event effects modify state but event isn't resolved

**Contributing Factors**:

1. Effect functions return modified state
2. Reducer applies modifications
3. But if event screen never shows, user can't interact
4. Next action might overwrite event state before effects commit

**Chain**: Event triggers → Effect modifies inventory → Reducer returns new state → Event screen doesn't show (Bug #1) → User performs action → Next action overwrites → Effect lost

#### Game Over Persistence

**Direct Cause**: Transient state in saves + async init check

**Contributing Factors**:

1. Game saves include currentEvent, currentNPCInteraction, etc.
2. loadGame restores all fields
3. initializeGame dispatches async
4. Game Over check runs before init propagates

**Chain**: Save during game over → File includes transient state → Load game → initializeGame dispatches → Game Over check runs immediately → Sees old state (health=0) → Triggers game-over screen → Init propagates next render (too late)

---

## Proposed Solution A: Unified React Reducer

### Overview

**Concept**: Merge GameContext, UIContext, and MessageContext into single `AppStateContext` with unified reducer managing all state.

**Key Principles**:

1. **Single Source of Truth**: All state in one place
2. **Derived Screen State**: Screen determined by state fields, not manual tracking
3. **Event Queue**: Multiple events can be queued and processed sequentially
4. **Synchronous Transitions**: Screen changes only after state fully updated
5. **Predictable Flow**: State → Derive UI → Render

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        AppStateProvider                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Unified State (useReducer)                   │ │
│  │                                                           │ │
│  │  Game State:                                              │ │
│  │    - day, cash, debt, health, location, inventory        │ │
│  │    - prices, reputation, marketData, tradeHistory        │ │
│  │                                                           │ │
│  │  UI State:                                                │ │
│  │    - activeScreen: 'title' | 'loading' | 'game' |        │ │
│  │                    'traveling' | 'game-over'              │ │
│  │    - showHelp: boolean                                    │ │
│  │    - quitConfirmation: boolean                            │ │
│  │                                                           │ │
│  │  Event State:                                             │ │
│  │    - eventQueue: Event[]                                  │ │
│  │    - currentEvent: Event | null                           │ │
│  │    - eventPhase: 'choice' | 'outcome' | 'acknowledged'   │ │
│  │                                                           │ │
│  │  Travel State:                                            │ │
│  │    - travelPhase: 'idle' | 'animating' | 'processing'    │ │
│  │    - travelDestination: string | null                     │ │
│  │    - travelOrigin: string | null                          │ │
│  │                                                           │ │
│  │  NPC State:                                               │ │
│  │    - currentNPC: NPC | null                               │ │
│  │    - npcDialogueState: { ... }                            │ │
│  │                                                           │ │
│  │  Messages:                                                │ │
│  │    - messages: Message[]                                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Unified Reducer (appReducer)                 │ │
│  │                                                           │ │
│  │  Handles all actions:                                     │ │
│  │    - Game actions (brew, sell, travel, repay, etc.)      │ │
│  │    - UI actions (setScreen, toggleHelp, etc.)            │ │
│  │    - Event actions (trigger, choose, acknowledge)        │ │
│  │    - Travel actions (start, animate, complete)           │ │
│  │    - NPC actions (interact, dialogue, end)               │ │
│  │    - Message actions (add, clear)                        │ │
│  │                                                           │ │
│  │  Returns new complete state on each action               │ │
│  │  All updates synchronous within reducer                  │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Selectors (Derived State)                    │ │
│  │                                                           │ │
│  │  - selectActiveScreen() → Determines which screen        │ │
│  │  - selectShouldShowEvent() → Event display check         │ │
│  │  - selectShouldShowNPC() → NPC display check             │ │
│  │  - selectIsGameOver() → Game over condition              │ │
│  │  - selectCanAfford() → Purchasing checks                 │ │
│  │  - ... all existing selectors                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────────────────────┐
              │     Screen Components         │
              │                               │
              │  Read from unified context    │
              │  Dispatch to unified reducer  │
              │  No local screen logic        │
              └───────────────────────────────┘
```

### New State Structure

```typescript
// src/types/app.types.ts

export type AppState = {
  // === Game State ===
  game: {
    day: number
    cash: number
    debt: number
    health: number
    strength: number
    agility: number
    intelligence: number
    location: Location
    inventory: Record<string, number>
    prices: Record<string, number>
    weather: Weather
    reputation: ReputationState
    marketData: LocationMarketState
    tradeHistory: TradeTransaction[]
    playerName?: string
    lastSave?: number
  }

  // === UI State ===
  ui: {
    activeScreen: Screen
    showHelp: boolean
    quitConfirmation: boolean
  }

  // === Event State ===
  events: {
    queue: QueuedEvent[] // NEW: Event queue
    current: Event | null
    phase: EventPhase // 'choice' | 'outcome' | 'acknowledged'
    currentStep: number
  }

  // === Travel State ===
  travel: {
    phase: TravelPhase // 'idle' | 'animating' | 'processing' | 'complete'
    destination: string | null
    origin: string | null
    animationStartTime: number | null
  }

  // === NPC State ===
  npc: {
    current: NPC | null
    dialogueState: NPCDialogueState | null
  }

  // === Messages ===
  messages: Message[]
}

export type Screen = 'title' | 'loading' | 'game' | 'traveling' | 'game-over'
export type EventPhase = 'choice' | 'outcome' | 'acknowledged'
export type TravelPhase = 'idle' | 'animating' | 'processing' | 'complete'

export type QueuedEvent = {
  event: MultiStepEvent | Event
  priority: number // Higher = process first
  triggeredOnDay: number
}
```

### Unified Reducer Structure

```typescript
// src/core/state/reducers/appReducer.ts

export const appReducer = (state: AppState, action: AppAction): AppState => {
  // Pre-process: Add message if needed
  let newState = state

  // Handle action
  switch (action.type) {
    // === Game Actions ===
    case 'game/brew':
      return handleBrew(newState, action.payload)

    case 'game/sell':
      return handleSell(newState, action.payload)

    case 'game/travel/start':
      return handleTravelStart(newState, action.payload)

    case 'game/travel/complete':
      return handleTravelComplete(newState, action.payload)

    case 'game/advanceDay':
      return handleAdvanceDay(newState, action.payload)

    // === Event Actions ===
    case 'event/trigger':
      return handleEventTrigger(newState, action.payload)

    case 'event/choose':
      return handleEventChoice(newState, action.payload)

    case 'event/acknowledge':
      return handleEventAcknowledge(newState)

    case 'event/processQueue':
      return handleEventQueueProcess(newState)

    // === UI Actions ===
    case 'ui/setScreen':
      return {
        ...newState,
        ui: { ...newState.ui, activeScreen: action.payload.screen },
      }

    case 'ui/toggleHelp':
      return {
        ...newState,
        ui: { ...newState.ui, showHelp: !newState.ui.showHelp },
      }

    // === Message Actions ===
    case 'message/add':
      return {
        ...newState,
        messages: [
          ...newState.messages,
          {
            text: action.payload.text,
            type: action.payload.type,
            timestamp: Date.now(),
          },
        ],
      }

    // === NPC Actions ===
    case 'npc/interact':
      return handleNPCInteract(newState, action.payload)

    // ... etc

    default:
      return state
  }
}
```

### Key Handler Examples

#### Travel Flow (Fixed)

```typescript
// src/core/state/reducers/handlers/travel.ts

export const handleTravelStart = (
  state: AppState,
  payload: { destination: string }
): AppState => {
  return {
    ...state,
    travel: {
      phase: 'animating',
      destination: payload.destination,
      origin: state.game.location.name,
      animationStartTime: Date.now(),
    },
    // Don't change activeScreen here - let screen logic derive it
  }
}

export const handleTravelComplete = (
  state: AppState,
  payload: {}
): AppState => {
  const { destination } = state.travel

  if (!destination || state.travel.phase !== 'animating') {
    return state
  }

  // 1. Update location
  const newLocation = locations.find((l) => l.name === destination)!
  let newState: AppState = {
    ...state,
    game: {
      ...state.game,
      location: newLocation,
    },
    travel: {
      ...state.travel,
      phase: 'processing', // Mark as processing game logic
    },
  }

  // 2. Regenerate prices
  newState = {
    ...newState,
    game: {
      ...newState.game,
      prices: generateDynamicPrices(newState.game),
    },
  }

  // 3. Advance day
  newState = handleAdvanceDay(newState, {
    triggerEvent: true,
    triggerDebt: true,
  })

  // 4. Complete travel
  newState = {
    ...newState,
    travel: {
      phase: 'complete',
      destination: null,
      origin: null,
      animationStartTime: null,
    },
    messages: [
      ...newState.messages,
      {
        text: `Traveled from ${state.travel.origin} to ${destination}`,
        type: 'info',
        timestamp: Date.now(),
      },
    ],
  }

  // 5. Process event queue if any events triggered
  if (newState.events.queue.length > 0 && !newState.events.current) {
    newState = handleEventQueueProcess(newState)
  }

  return newState
}
```

**Key Differences**:

- All state updates happen in one reducer pass
- No async dispatch - everything synchronous
- Messages added in reducer, not external
- Event queue processed at end
- Screen logic will derive that event should show (if currentEvent set)

#### Event Queue System (New)

```typescript
// src/core/state/reducers/handlers/events.ts

export const handleEventTrigger = (
  state: AppState,
  payload: { event: MultiStepEvent | Event; priority?: number }
): AppState => {
  const queuedEvent: QueuedEvent = {
    event: payload.event,
    priority: payload.priority ?? 0,
    triggeredOnDay: state.game.day,
  }

  return {
    ...state,
    events: {
      ...state.events,
      queue: [...state.events.queue, queuedEvent].sort(
        (a, b) => b.priority - a.priority
      ),
    },
  }
}

export const handleEventQueueProcess = (state: AppState): AppState => {
  // If already showing an event, don't process queue
  if (state.events.current) {
    return state
  }

  // Pop next event from queue
  const [nextEvent, ...remainingQueue] = state.events.queue

  if (!nextEvent) {
    return state
  }

  // If multi-step event, set it as current
  if ('steps' in nextEvent.event) {
    return {
      ...state,
      events: {
        queue: remainingQueue,
        current: nextEvent.event,
        phase: 'choice',
        currentStep: 0,
      },
      messages: [
        ...state.messages,
        {
          text: `${nextEvent.event.name}: ${nextEvent.event.description}`,
          type: nextEvent.event.type === 'negative' ? 'error' : 'random_event',
          timestamp: Date.now(),
        },
      ],
    }
  }

  // Single-step event: apply effect immediately
  const effect = nextEvent.event.effect
  const newGameState = effect(state.game)

  return {
    ...state,
    game: newGameState,
    events: {
      ...state.events,
      queue: remainingQueue,
    },
    messages: [
      ...state.messages,
      {
        text: `${nextEvent.event.name}: ${nextEvent.event.description}`,
        type: nextEvent.event.type === 'negative' ? 'error' : 'random_event',
        timestamp: Date.now(),
      },
    ],
  }
}

export const handleEventChoice = (
  state: AppState,
  payload: { choiceIndex: number }
): AppState => {
  const { current, currentStep } = state.events

  if (!current || !('steps' in current)) {
    return state
  }

  const step = current.steps[currentStep]
  const choice = step.choices[payload.choiceIndex]

  if (!choice) {
    return state
  }

  // Apply choice effect
  const newGameState = choice.effect(state.game)

  // Check if this was the last step
  const isLastStep = currentStep >= current.steps.length - 1

  if (isLastStep) {
    // Move to outcome phase
    return {
      ...state,
      game: newGameState,
      events: {
        ...state.events,
        phase: 'outcome',
      },
      messages: [
        ...state.messages,
        {
          text: `You chose: ${choice.text}`,
          type: current.type === 'negative' ? 'error' : 'random_event',
          timestamp: Date.now(),
        },
        ...(newGameState.message
          ? [
              {
                text: newGameState.message,
                type: current.type === 'negative' ? 'error' : 'random_event',
                timestamp: Date.now(),
              },
            ]
          : []),
      ],
    }
  }

  // Move to next step
  return {
    ...state,
    game: newGameState,
    events: {
      ...state.events,
      currentStep: currentStep + 1,
    },
    messages: [
      ...state.messages,
      {
        text: `You chose: ${choice.text}`,
        type: current.type === 'negative' ? 'error' : 'random_event',
        timestamp: Date.now(),
      },
    ],
  }
}

export const handleEventAcknowledge = (state: AppState): AppState => {
  return {
    ...state,
    events: {
      queue: state.events.queue,
      current: null,
      phase: 'choice',
      currentStep: 0,
    },
    messages: [
      ...state.messages,
      {
        text: `${state.events.current?.name} concluded.`,
        type: 'info',
        timestamp: Date.now(),
      },
    ],
  }
}
```

**Key Features**:

- Events queue up instead of overwriting
- Priority system for urgent events
- Sequential processing (one at a time)
- Single-step events apply immediately, don't enter queue as "current"
- Multi-step events set as current, show screen
- Messages added in reducer alongside state changes

### Screen Derivation Logic

```typescript
// src/core/state/selectors/screenSelectors.ts

export const selectActiveScreen = (state: AppState): Screen => {
  // Priority order:

  // 1. Title/Loading (explicit UI states)
  if (
    state.ui.activeScreen === 'title' ||
    state.ui.activeScreen === 'loading'
  ) {
    return state.ui.activeScreen
  }

  // 2. Game Over (game state condition)
  if (state.game.health <= 0 || state.game.debt > 10000) {
    return 'game-over'
  }

  // 3. Traveling (travel phase)
  if (state.travel.phase === 'animating') {
    return 'traveling'
  }

  // 4. Event (current event exists)
  if (state.events.current && state.events.phase !== 'acknowledged') {
    return 'game' // GameScreen will render MultiStepEventScreen
  }

  // 5. NPC Interaction (current NPC exists)
  if (state.npc.current) {
    return 'game' // GameScreen will render NPCInteractionScreen
  }

  // 6. Default: Game
  return 'game'
}

export const selectShouldShowEvent = (state: AppState): boolean => {
  return state.events.current !== null && state.events.phase !== 'acknowledged'
}

export const selectShouldShowNPC = (state: AppState): boolean => {
  return state.npc.current !== null
}

export const selectShouldShowQuitMenu = (state: AppState): boolean => {
  return state.ui.quitConfirmation
}
```

### Updated GameScreen

```typescript
// src/screens/GameScreen.tsx

export function GameScreen() {
  const { state } = useAppState()

  // Derive what to show from state (no manual logic)
  const activeScreen = selectActiveScreen(state)
  const showEvent = selectShouldShowEvent(state)
  const showNPC = selectShouldShowNPC(state)
  const showQuit = selectShouldShowQuitMenu(state)

  // Screen routing based on derived state
  if (activeScreen === 'traveling') {
    return <TravelingScreen />
  }

  if (showQuit) {
    return <QuitMenu />
  }

  if (showEvent) {
    return <MultiStepEventScreen />
  }

  if (showNPC) {
    return <NPCInteractionScreen />
  }

  // Default: main game UI
  return (
    <Box flexDirection="column" height="100%">
      {/* ... existing main game UI ... */}
    </Box>
  )
}
```

**Key Changes**:

- No local state derivation
- All decisions based on selectors
- Selectors read from unified state (always consistent)
- No race conditions - state is complete before render

### Migration Strategy

#### Phase 1: Create New State Structure

1. **Create `src/types/app.types.ts`**

   - Define `AppState` with all sub-states
   - Define action types union `AppAction`

2. **Create `src/core/state/reducers/appReducer.ts`**

   - Skeleton reducer with case statements
   - Delegate to handler functions

3. **Create handler files** in `src/core/state/reducers/handlers/`

   - `game.ts` - brew, sell, repay, etc.
   - `travel.ts` - travel start/complete
   - `events.ts` - event queue, trigger, choose, acknowledge
   - `npc.ts` - NPC interactions
   - `ui.ts` - screen, help, quit
   - `messages.ts` - add, clear messages

4. **Create selectors** in `src/core/state/selectors/`
   - `screenSelectors.ts` - screen derivation logic
   - `gameSelectors.ts` - existing game selectors updated
   - `eventSelectors.ts` - event queue selectors

#### Phase 2: Create New Context

1. **Create `src/contexts/AppStateContext.tsx`**

   - Single context provider with useReducer
   - Exposes `state` and `dispatch`
   - Exposes action creator functions (type-safe)

2. **Update `src/app.tsx`**
   - Replace UIProvider + GameProvider + MessageProvider
   - Wrap with single AppStateProvider

#### Phase 3: Migrate Screens

1. **Update `src/screens/GameScreen.tsx`**

   - Replace `useGame()` and `useUI()` with `useAppState()`
   - Use selectors for derivation
   - Test screen routing logic

2. **Update `src/screens/TravelingScreen.tsx`**

   - Replace context hooks
   - Update action dispatching
   - Remove manual completion trigger (handled in reducer)

3. **Update `src/screens/MultiStepEventScreen.tsx`**

   - Replace context hooks
   - Use event phase from state
   - Update choice/acknowledge actions

4. **Update other screens**
   - TitleScreen
   - LoadingScreen
   - GameOverScreen
   - NPCInteractionScreen

#### Phase 4: Migrate Components

1. **Update action menus**

   - `src/ui/components/game/ActionMenu.tsx`
   - Replace `handleAction` with `dispatch`
   - Use action creators

2. **Update status components**

   - PlayerStatus
   - Location
   - InventoryDisplay
   - PriceList
   - All components using state

3. **Update game log**
   - GameLog component
   - Read messages from unified state

#### Phase 5: Remove Old Contexts

1. **Delete old context files**

   - `src/contexts/UIContext.tsx`
   - `src/contexts/GameContext.tsx`
   - `src/contexts/MessageContext.tsx`

2. **Delete old hooks**

   - `src/core/state/hooks/useGameState.ts` (logic moved to reducer)

3. **Update imports across codebase**

#### Phase 6: Testing & Validation

1. **Run full test suite**
2. **Manual testing checklist** (see Testing Strategy section)
3. **Fix any regressions**

### Files to Create/Modify

**New Files** (~10):

- `src/types/app.types.ts`
- `src/core/state/reducers/appReducer.ts`
- `src/core/state/reducers/handlers/game.ts`
- `src/core/state/reducers/handlers/travel.ts`
- `src/core/state/reducers/handlers/events.ts`
- `src/core/state/reducers/handlers/npc.ts`
- `src/core/state/reducers/handlers/ui.ts`
- `src/core/state/reducers/handlers/messages.ts`
- `src/core/state/selectors/screenSelectors.ts`
- `src/contexts/AppStateContext.tsx`

**Modified Files** (~25):

- `src/app.tsx`
- `src/screens/GameScreen.tsx`
- `src/screens/TravelingScreen.tsx`
- `src/screens/MultiStepEventScreen.tsx`
- `src/screens/TitleScreen.tsx`
- `src/screens/LoadingScreen.tsx`
- `src/screens/GameOverScreen.tsx`
- `src/screens/NPCInteractionScreen.tsx`
- `src/ui/components/game/ActionMenu.tsx`
- `src/ui/components/game/PlayerStatus.tsx`
- `src/ui/components/game/Location.tsx`
- `src/ui/components/game/InventoryDisplay.tsx`
- `src/ui/components/game/PriceList.tsx`
- `src/ui/components/game/GameLog.tsx`
- `src/ui/components/game/Day.tsx`
- `src/ui/components/game/Weather.tsx`
- `src/ui/components/game/QuitMenu.tsx`
- `src/core/state/selectors/gameSelectors.ts`
- `src/core/persistence/saveLoad.ts` (update to use new state structure)
- `src/core/persistence/dataValidation.ts` (update validation)
- All test files (~10-15 files)

**Deleted Files** (~4):

- `src/contexts/UIContext.tsx`
- `src/contexts/GameContext.tsx`
- `src/contexts/MessageContext.tsx`
- `src/core/state/hooks/useGameState.ts`

**Total Impact**: ~35 files

---

## Proposed Solution B: Zustand Store

### Overview

**Concept**: Replace React Context + useReducer with Zustand, a lightweight state management library that provides synchronous updates and simpler patterns.

**Key Advantages**:

- Synchronous state updates (no dispatch lag)
- Simpler action handling (direct function calls)
- Better DevTools integration
- Less boilerplate than unified reducer
- Middleware for logging, persistence

**Library Size**: ~3kb gzipped
**Learning Curve**: Low (similar to useState but global)

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    Zustand Store (create)                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    State                               │ │
│  │  Same as AppState from Option A:                       │ │
│  │    - game: { day, cash, location, ... }               │ │
│  │    - ui: { activeScreen, showHelp, ... }              │ │
│  │    - events: { queue, current, phase, ... }           │ │
│  │    - travel: { phase, destination, ... }              │ │
│  │    - npc: { current, dialogueState }                  │ │
│  │    - messages: Message[]                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  Actions (Methods)                     │ │
│  │                                                        │ │
│  │  brewPotion: (name, qty) => void                      │ │
│  │  sellPotion: (name, qty) => void                      │ │
│  │  startTravel: (dest) => void                          │ │
│  │  completeTravel: () => void                           │ │
│  │  triggerEvent: (event) => void                        │ │
│  │  chooseEvent: (index) => void                         │ │
│  │  acknowledgeEvent: () => void                         │ │
│  │  processEventQueue: () => void                        │ │
│  │  addMessage: (type, text) => void                     │ │
│  │  // ... all other actions                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           Middleware (Optional)                        │ │
│  │  - Logger: Log all state changes                      │ │
│  │  - Persist: Auto-save to disk                         │ │
│  │  - DevTools: Time-travel debugging                    │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                             ↓
              ┌──────────────────────────────┐
              │   Components (useStore)      │
              │                              │
              │  const cash = useStore(s =>  │
              │  s.game.cash)                │
              │                              │
              │  const brew = useStore(s =>  │
              │  s.brewPotion)               │
              │                              │
              │  brew('Wisdom Draught', 5)   │
              └──────────────────────────────┘
```

### Store Definition

```typescript
// src/store/appStore.ts

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type AppState = {
  // State structure (same as Option A)
  game: GameState
  ui: UIState
  events: EventState
  travel: TravelState
  npc: NPCState
  messages: Message[]
}

export type AppStore = AppState & {
  // Game actions
  brewPotion: (potionName: string, quantity: number) => void
  sellPotion: (potionName: string, quantity: number) => void
  startTravel: (destination: string) => void
  completeTravel: () => void
  advanceDay: (triggerEvent?: boolean, triggerDebt?: boolean) => void
  repayDebt: (amount: number) => void

  // Event actions
  triggerEvent: (event: MultiStepEvent | Event, priority?: number) => void
  chooseEvent: (choiceIndex: number) => void
  acknowledgeEvent: () => void
  processEventQueue: () => void

  // UI actions
  setScreen: (screen: Screen) => void
  toggleHelp: () => void
  toggleQuitConfirmation: () => void

  // NPC actions
  startNPCInteraction: (npc: NPC) => void
  endNPCInteraction: () => void

  // Message actions
  addMessage: (type: MessageType, text: string) => void
  clearMessages: () => void

  // Persistence
  saveGame: (slot: number) => void
  loadGame: (slot: number) => void
  initializeGame: () => void
}

export const useStore = create<AppStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        game: {
          day: 0,
          cash: 2000,
          debt: 5000,
          health: 100,
          // ... rest of initial game state
        },
        ui: {
          activeScreen: 'title',
          showHelp: false,
          quitConfirmation: false,
        },
        events: {
          queue: [],
          current: null,
          phase: 'choice',
          currentStep: 0,
        },
        travel: {
          phase: 'idle',
          destination: null,
          origin: null,
          animationStartTime: null,
        },
        npc: {
          current: null,
          dialogueState: null,
        },
        messages: [],

        // Actions
        brewPotion: (potionName, quantity) => {
          set((state) => {
            const potion = potions.find((p) => p.name === potionName)
            if (!potion) return

            const cost = state.game.prices[potionName] * quantity
            if (state.game.cash < cost) {
              state.messages.push({
                text: `Not enough gold to brew ${quantity} ${potionName}`,
                type: 'error',
                timestamp: Date.now(),
              })
              return
            }

            // Update game state
            state.game.cash -= cost
            state.game.inventory[potionName] =
              (state.game.inventory[potionName] || 0) + quantity

            // Add message
            state.messages.push({
              text: `Brewed ${quantity} ${potionName}`,
              type: 'info',
              timestamp: Date.now(),
            })
          })
        },

        completeTravel: () => {
          set((state) => {
            const { destination } = state.travel

            if (!destination || state.travel.phase !== 'animating') {
              return
            }

            // 1. Update location
            const newLocation = locations.find((l) => l.name === destination)
            if (!newLocation) return

            const origin = state.game.location.name
            state.game.location = newLocation

            // 2. Regenerate prices (synchronous!)
            state.game.prices = generateDynamicPrices(state.game)

            // 3. Advance day (inline, synchronous)
            state.game.day += 1

            // Apply debt interest
            state.game.debt = Math.floor(state.game.debt * 1.1)

            // Trigger event
            const eventResult = triggerRandomEvent(state.game)
            if (eventResult.currentEvent) {
              get().triggerEvent(eventResult.currentEvent, 1)
            }

            // 4. Update travel state
            state.travel = {
              phase: 'complete',
              destination: null,
              origin: null,
              animationStartTime: null,
            }

            // 5. Add message
            state.messages.push({
              text: `Traveled from ${origin} to ${destination}`,
              type: 'info',
              timestamp: Date.now(),
            })

            // 6. Process event queue
            get().processEventQueue()
          })
        },

        triggerEvent: (event, priority = 0) => {
          set((state) => {
            state.events.queue.push({
              event,
              priority,
              triggeredOnDay: state.game.day,
            })
            state.events.queue.sort((a, b) => b.priority - a.priority)
          })
        },

        processEventQueue: () => {
          set((state) => {
            // If already showing event, don't process
            if (state.events.current) return

            // Pop next event
            const nextEvent = state.events.queue.shift()
            if (!nextEvent) return

            // Multi-step: set as current
            if ('steps' in nextEvent.event) {
              state.events.current = nextEvent.event
              state.events.phase = 'choice'
              state.events.currentStep = 0

              state.messages.push({
                text: `${nextEvent.event.name}: ${nextEvent.event.description}`,
                type:
                  nextEvent.event.type === 'negative'
                    ? 'error'
                    : 'random_event',
                timestamp: Date.now(),
              })
            } else {
              // Single-step: apply immediately
              const newGameState = nextEvent.event.effect(state.game)
              Object.assign(state.game, newGameState)

              state.messages.push({
                text: `${nextEvent.event.name}: ${nextEvent.event.description}`,
                type:
                  nextEvent.event.type === 'negative'
                    ? 'error'
                    : 'random_event',
                timestamp: Date.now(),
              })
            }
          })
        },

        chooseEvent: (choiceIndex) => {
          set((state) => {
            const { current, currentStep } = state.events
            if (!current || !('steps' in current)) return

            const step = current.steps[currentStep]
            const choice = step.choices[choiceIndex]
            if (!choice) return

            // Apply effect
            const newGameState = choice.effect(state.game)
            Object.assign(state.game, newGameState)

            // Check if last step
            const isLastStep = currentStep >= current.steps.length - 1

            if (isLastStep) {
              state.events.phase = 'outcome'
              state.messages.push({
                text: `You chose: ${choice.text}`,
                type: current.type === 'negative' ? 'error' : 'random_event',
                timestamp: Date.now(),
              })
            } else {
              state.events.currentStep += 1
              state.messages.push({
                text: `You chose: ${choice.text}`,
                type: 'info',
                timestamp: Date.now(),
              })
            }
          })
        },

        acknowledgeEvent: () => {
          set((state) => {
            if (state.events.current) {
              state.messages.push({
                text: `${state.events.current.name} concluded.`,
                type: 'info',
                timestamp: Date.now(),
              })
            }

            state.events.current = null
            state.events.phase = 'choice'
            state.events.currentStep = 0

            // Process next event in queue if any
            get().processEventQueue()
          })
        },

        // ... other actions
      })),
      {
        name: 'potion-wars-storage',
        partialize: (state) => ({
          // Only persist game state, not UI/temp state
          game: state.game,
          messages: state.messages.slice(-100), // Keep last 100 messages
        }),
      }
    )
  )
)
```

**Key Features**:

- `immer` middleware: Allows direct "mutation" syntax (actually immutable)
- `devtools` middleware: Redux DevTools integration
- `persist` middleware: Auto-saves to localStorage (can be adapted for files)
- All actions are **synchronous** - state updates immediately
- Can call other actions within actions (`get().processEventQueue()`)
- Type-safe with TypeScript

### Component Usage

```typescript
// src/screens/GameScreen.tsx

import { useStore } from '../store/appStore'

export function GameScreen() {
  // Select only what you need (prevents unnecessary re-renders)
  const activeScreen = useStore((state) => {
    // Derive screen
    if (state.ui.activeScreen === 'title') return 'title'
    if (state.game.health <= 0) return 'game-over'
    if (state.travel.phase === 'animating') return 'traveling'
    return 'game'
  })

  const showEvent = useStore(
    (state) =>
      state.events.current !== null && state.events.phase !== 'acknowledged'
  )

  const showNPC = useStore((state) => state.npc.current !== null)
  const showQuit = useStore((state) => state.ui.quitConfirmation)

  // Render based on derived state
  if (activeScreen === 'traveling') {
    return <TravelingScreen />
  }

  if (showQuit) {
    return <QuitMenu />
  }

  if (showEvent) {
    return <MultiStepEventScreen />
  }

  if (showNPC) {
    return <NPCInteractionScreen />
  }

  return (
    <Box flexDirection="column" height="100%">
      {/* Main game UI */}
    </Box>
  )
}
```

```typescript
// src/ui/components/game/ActionMenu.tsx

import { useStore } from '../../../store/appStore'

export function ActionMenu() {
  // Get actions
  const brewPotion = useStore((state) => state.brewPotion)
  const sellPotion = useStore((state) => state.sellPotion)
  const startTravel = useStore((state) => state.startTravel)

  // Get state for validation
  const cash = useStore((state) => state.game.cash)
  const inventory = useStore((state) => state.game.inventory)

  const handleBrew = (potion: string, qty: number) => {
    brewPotion(potion, qty) // Direct call, synchronous!
  }

  // ... rest of component
}
```

### Middleware for Persistence

```typescript
// src/store/middleware/fileSystemPersist.ts

import { StateStorage } from 'zustand/middleware'
import {
  saveGameToFile,
  loadGameFromFile,
} from '../../core/persistence/saveLoad'

export const fileSystemStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      const slot = parseInt(name.split('-').pop() || '1')
      const data = loadGameFromFile(slot)
      return data ? JSON.stringify(data) : null
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      const slot = parseInt(name.split('-').pop() || '1')
      const data = JSON.parse(value)
      saveGameToFile(slot, data)
    } catch (error) {
      console.error('Failed to save:', error)
    }
  },
  removeItem: (name: string): void => {
    // Optional: implement delete save slot
  },
}

// Use in store:
export const useStore = create<AppStore>()(
  persist(
    immer((set, get) => ({
      /* ... */
    })),
    {
      name: 'potion-wars-game',
      storage: fileSystemStorage,
    }
  )
)
```

### Migration Strategy

#### Phase 1: Install and Setup

1. **Install Zustand**

   ```bash
   yarn add zustand
   yarn add -D @types/zustand
   ```

2. **Create store file** `src/store/appStore.ts`
   - Define state structure
   - Define action methods
   - Set up middleware

#### Phase 2: Migrate Actions

1. **Port game logic from reducers to store actions**

   - Each reducer case becomes a store method
   - Use `set((state) => { ... })` pattern with immer
   - All synchronous, no dispatch

2. **Port event system**
   - Create event queue actions
   - Implement queue processing
   - Migrate event handlers

#### Phase 3: Update Components

1. **Replace context hooks with useStore**

   - `useGame()` → `useStore((s) => s.game)`
   - `useUI()` → `useStore((s) => s.ui)`
   - Actions become direct function calls

2. **Update screen components**

   - GameScreen
   - TravelingScreen
   - MultiStepEventScreen
   - etc.

3. **Update UI components**
   - ActionMenu
   - PlayerStatus
   - All components using state

#### Phase 4: Remove Old Code

1. **Delete context files**

   - UIContext, GameContext, MessageContext

2. **Delete reducer files**

   - gameReducer, action creators, etc.

3. **Clean up imports**

#### Phase 5: Testing

1. **Run tests**
2. **Manual validation**
3. **Performance check** (Zustand is faster than Context)

### Files to Create/Modify

**New Files** (~5):

- `src/store/appStore.ts` (main store)
- `src/store/middleware/fileSystemPersist.ts` (custom persistence)
- `src/store/selectors.ts` (derived state selectors)
- `src/store/types.ts` (store-specific types)

**Modified Files** (~25):

- `src/app.tsx` (remove providers, no wrapper needed!)
- All screen components (~7 files)
- All UI components (~15 files)
- `src/core/persistence/saveLoad.ts` (adapt for Zustand)
- Test files (~10-15 files)

**Deleted Files** (~15):

- `src/contexts/*.tsx` (all 3 contexts)
- `src/core/state/hooks/*.ts` (useGameState)
- `src/core/state/reducers/*.ts` (gameReducer, etc.)
- `src/core/state/actions/*.ts` (action creators)

**Total Impact**: ~30 files

---

## Comparison Matrix

| Criterion                | Option A: Unified Reducer        | Option B: Zustand               | Winner |
| ------------------------ | -------------------------------- | ------------------------------- | ------ |
| **No New Dependencies**  | ✅ Pure React                    | ❌ +3kb library                 | A      |
| **Synchronous Updates**  | ❌ Still async dispatch          | ✅ Immediate updates            | **B**  |
| **Developer Experience** | ⚠️ More verbose                  | ✅ Simpler API                  | **B**  |
| **Learning Curve**       | ✅ Familiar React patterns       | ⚠️ New library to learn         | A      |
| **Boilerplate**          | ❌ High (reducer cases, actions) | ✅ Low (direct methods)         | **B**  |
| **Type Safety**          | ✅ Full TypeScript support       | ✅ Full TypeScript support      | Tie    |
| **DevTools**             | ⚠️ React DevTools only           | ✅ Redux DevTools + Time Travel | **B**  |
| **Testing**              | ✅ Well-established patterns     | ✅ Easy to test pure functions  | Tie    |
| **Performance**          | ⚠️ Context re-render overhead    | ✅ Selector-based subscriptions | **B**  |
| **Migration Effort**     | 🔴 High (~35 files, complex)     | 🟡 Medium (~30 files, simpler)  | **B**  |
| **Code Organization**    | ⚠️ Large reducer, many files     | ✅ Actions inline with state    | **B**  |
| **Debugging**            | ⚠️ Async timing issues remain    | ✅ Synchronous, predictable     | **B**  |
| **Future Maintenance**   | ⚠️ Complex state flow            | ✅ Straightforward              | **B**  |
| **Bundle Size**          | ✅ 0kb additional                | ⚠️ +3kb (negligible)            | A      |
| **Ecosystem Fit**        | ✅ Pure React philosophy         | ⚠️ External dependency          | A      |

### Scoring

**Option A (Unified Reducer)**:

- Wins: 4 criteria (no dependencies, familiar, type safety, testing)
- Loses: 9 criteria
- Ties: 2 criteria
- **Total Score**: 5/15

**Option B (Zustand)**:

- Wins: 9 criteria (sync updates, DX, boilerplate, DevTools, performance, migration, organization, debugging, maintenance)
- Loses: 2 criteria (new dependency, learning curve)
- Ties: 2 criteria
- **Total Score**: 10/15

### Detailed Comparison

#### State Update Timing

**Option A**:

```typescript
// Dispatch is still async
dispatch({ type: 'game/travel', payload: { destination } })
// State doesn't update until next render
// Screen logic might still read stale state
```

**Option B**:

```typescript
// Immediate update
startTravel(destination)
// State updated synchronously
// Can immediately read new state
```

**Winner**: Option B - Solves the root cause directly

#### Action Handling

**Option A**:

```typescript
// In reducer:
case 'game/brew': {
  return handleBrew(state, action.payload)
}

// In handler file:
export const handleBrew = (state: AppState, payload: { potionName: string, quantity: number }) => {
  const potion = potions.find(p => p.name === payload.potionName)
  if (!potion) return state

  const cost = state.game.prices[payload.potionName] * payload.quantity
  if (state.game.cash < cost) {
    return {
      ...state,
      messages: [...state.messages, {
        text: 'Not enough gold',
        type: 'error',
        timestamp: Date.now()
      }]
    }
  }

  return {
    ...state,
    game: {
      ...state.game,
      cash: state.game.cash - cost,
      inventory: {
        ...state.game.inventory,
        [payload.potionName]: (state.game.inventory[payload.potionName] || 0) + payload.quantity
      }
    },
    messages: [...state.messages, {
      text: `Brewed ${payload.quantity} ${payload.potionName}`,
      type: 'info',
      timestamp: Date.now()
    }]
  }
}
```

**Option B**:

```typescript
// In store:
brewPotion: (potionName, quantity) => {
  set((state) => {
    const potion = potions.find((p) => p.name === potionName)
    if (!potion) return

    const cost = state.game.prices[potionName] * quantity
    if (state.game.cash < cost) {
      state.messages.push({
        text: 'Not enough gold',
        type: 'error',
        timestamp: Date.now(),
      })
      return
    }

    state.game.cash -= cost
    state.game.inventory[potionName] =
      (state.game.inventory[potionName] || 0) + quantity
    state.messages.push({
      text: `Brewed ${quantity} ${potionName}`,
      type: 'info',
      timestamp: Date.now(),
    })
  })
}
```

**Winner**: Option B - Less boilerplate, more readable

#### Component Usage

**Option A**:

```typescript
// Component:
const { state, dispatch } = useAppState()
const cash = state.game.cash

const brew = (potion: string, qty: number) => {
  dispatch({
    type: 'game/brew',
    payload: { potionName: potion, quantity: qty },
  })
}
```

**Option B**:

```typescript
// Component:
const cash = useStore((s) => s.game.cash)
const brew = useStore((s) => s.brewPotion)

brew('Wisdom Draught', 5) // Direct call!
```

**Winner**: Option B - Simpler, more intuitive

#### Migration Complexity

**Option A**:

- Create unified state type (complex, nested)
- Create large reducer with all cases
- Split into many handler files
- Create comprehensive selector files
- Update all components to use new context
- Replace all action calls with dispatch + action creators
- Test entire flow end-to-end

**Option B**:

- Create store with state + methods
- Port reducer logic to store methods (mostly copy-paste with syntax changes)
- Update components to use useStore
- Replace action calls with direct method calls
- Test (simpler because synchronous)

**Winner**: Option B - Fewer steps, simpler changes

---

## Implementation Roadmap

### Recommended Approach: Option B (Zustand)

Based on the comparison matrix, **Option B (Zustand)** is the clear winner for this refactor. It solves the root cause (async dispatch timing) while providing better DX, easier migration, and superior debugging capabilities.

### Phase 1: Foundation (Session 1)

**Goal**: Set up Zustand store with core game state

**Tasks**:

1. Install Zustand

   ```bash
   yarn add zustand
   ```

2. Create `src/store/appStore.ts` with:

   - State structure (game, ui, events, travel, npc, messages)
   - Core actions (brew, sell, travel, advanceDay)
   - Event queue system

3. Create `src/store/selectors.ts`:

   - Screen derivation logic
   - Game state selectors

4. Test store in isolation:
   - Write unit tests for actions
   - Verify state updates are synchronous

**Success Criteria**:

- Store compiles without errors
- Basic actions work in tests
- Event queue processes correctly

### Phase 2: Screen Migration (Session 2)

**Goal**: Migrate main screens to use Zustand

**Tasks**:

1. Update `src/app.tsx`:

   - Remove UIProvider, GameProvider, MessageProvider
   - No provider needed for Zustand!

2. Migrate `src/screens/GameScreen.tsx`:

   - Replace useGame/useUI with useStore
   - Use screen derivation from selectors
   - Test all screen transitions

3. Migrate `src/screens/TravelingScreen.tsx`:

   - Update to use store
   - Test animation → travel complete flow

4. Migrate `src/screens/MultiStepEventScreen.tsx`:

   - Update to use event actions
   - Test choice → outcome → acknowledge flow

5. Test manually:
   - Start game
   - Travel between locations
   - Verify events display correctly
   - Check no race conditions

**Success Criteria**:

- All screens render correctly
- Events display reliably
- No console errors
- Travel flow works end-to-end

### Phase 3: Component Migration (Session 3)

**Goal**: Update all UI components to use Zustand

**Tasks**:

1. Update `src/ui/components/game/ActionMenu.tsx`:

   - Replace handleAction with direct action calls
   - Test all menu actions

2. Update status components:

   - PlayerStatus, Day, Weather, Location
   - Replace context hooks with useStore selectors

3. Update inventory/pricing:

   - InventoryDisplay, PriceList
   - Verify data consistency

4. Update GameLog:
   - Read messages from store
   - Test message display

**Success Criteria**:

- All components compile
- UI displays correctly
- Actions trigger properly
- No prop drilling issues

### Phase 4: Cleanup & Testing (Session 4)

**Goal**: Remove old code, comprehensive testing

**Tasks**:

1. Delete old files:

   - `src/contexts/UIContext.tsx`
   - `src/contexts/GameContext.tsx`
   - `src/contexts/MessageContext.tsx`
   - `src/core/state/hooks/useGameState.ts`
   - `src/core/state/reducers/gameReducer.ts`
   - `src/core/state/actions/*` (action creators)

2. Update imports across codebase:

   - Find/replace old hooks with useStore
   - Remove unused imports

3. Run test suite:

   - Update test utilities
   - Fix failing tests
   - Add new tests for store actions

4. Manual testing checklist (see Testing Strategy)

**Success Criteria**:

- No references to old contexts
- All tests pass
- Manual testing passes all scenarios
- No regression bugs

### Phase 5: Polish & Performance (Session 5)

**Goal**: Optimize, add middleware, final validation

**Tasks**:

1. Add middleware:

   - DevTools integration
   - File system persistence
   - Action logging (optional)

2. Optimize selectors:

   - Use shallow equality where needed
   - Prevent unnecessary re-renders

3. Update documentation:

   - ARCHITECTURE_REFACTOR.md (mark complete)
   - CLAUDE.md (update architecture section)
   - Code comments

4. Final testing:
   - Performance check
   - Load test (rapid actions)
   - Edge case validation

**Success Criteria**:

- DevTools working
- Saves/loads correctly
- No performance regressions
- Documentation updated

---

## Testing Strategy

### Automated Tests

#### Unit Tests: Store Actions

```typescript
// src/store/__tests__/appStore.test.ts

import { useStore } from '../appStore'

test('brewPotion updates inventory and cash', () => {
  const store = useStore.getState()

  // Initial state
  expect(store.game.cash).toBe(2000)
  expect(store.game.inventory['Wisdom Draught']).toBeUndefined()

  // Brew potion
  store.brewPotion('Wisdom Draught', 5)

  // Verify state updated
  expect(store.game.inventory['Wisdom Draught']).toBe(5)
  expect(store.game.cash).toBeLessThan(2000)
  expect(store.messages.length).toBeGreaterThan(0)
})

test('event queue processes sequentially', () => {
  const store = useStore.getState()

  // Trigger two events
  store.triggerEvent(mockEvent1, 1)
  store.triggerEvent(mockEvent2, 2)

  // Queue should have both
  expect(store.events.queue.length).toBe(2)

  // Process queue
  store.processEventQueue()

  // Higher priority event should be current
  expect(store.events.current?.name).toBe(mockEvent2.name)
  expect(store.events.queue.length).toBe(1)
})
```

#### Integration Tests: Screen Flows

```typescript
// src/screens/__tests__/TravelFlow.test.tsx

import { render } from 'ink-testing-library'
import { GameScreen } from '../GameScreen'
import { useStore } from '../../store/appStore'

test('travel flow displays event correctly', () => {
  const store = useStore.getState()

  // Start travel
  store.startTravel('Peasant Village')
  expect(store.travel.phase).toBe('animating')

  const { lastFrame } = render(<GameScreen />)
  expect(lastFrame()).toContain('Traveling')

  // Complete travel (mocking timer)
  store.completeTravel()
  expect(store.travel.phase).toBe('complete')

  // If event triggered, should show MultiStepEventScreen
  if (store.events.current) {
    expect(lastFrame()).toContain('Event:')
    expect(lastFrame()).toContain(store.events.current.name)
  }
})
```

### Manual Testing Checklist

#### Critical Path Testing

- [ ] **Start New Game**

  - Create new game in empty slot
  - Verify initial state (2000g, 5000g debt, 100% health)
  - Check all UI elements render

- [ ] **Basic Actions**

  - [ ] Brew potions (various types)
  - [ ] Verify inventory updates
  - [ ] Verify cash decreases
  - [ ] Check messages logged
  - [ ] Sell potions
  - [ ] Verify inventory decreases
  - [ ] Verify cash increases
  - [ ] Repay debt
  - [ ] Verify cash and debt update

- [ ] **Travel Flow**

  - [ ] Select travel destination
  - [ ] Verify TravelingScreen displays
  - [ ] Wait for animation (4 seconds)
  - [ ] Verify return to game screen
  - [ ] Verify location changed
  - [ ] Verify day advanced
  - [ ] Verify debt interest applied
  - [ ] Check game log for travel message

- [ ] **Event Display**

  - [ ] Travel multiple times to trigger events
  - [ ] When event triggers, verify MultiStepEventScreen shows
  - [ ] Verify event name and description visible
  - [ ] Verify choices displayed
  - [ ] Select a choice
  - [ ] Verify "You chose: X" displays
  - [ ] Verify outcome message displays
  - [ ] Press ENTER to acknowledge
  - [ ] Verify return to main game screen
  - [ ] Verify event effects applied (inventory, cash, reputation, etc.)

- [ ] **Multiple Events**

  - [ ] Trigger multiple events in sequence (may require save/load)
  - [ ] Verify first event displays completely
  - [ ] Complete first event
  - [ ] Verify second event displays (not skipped)
  - [ ] Verify both events logged in game log

- [ ] **Rival Encounters**

  - [ ] Travel to trigger rival encounter
  - [ ] Verify MultiStepEventScreen displays
  - [ ] Verify rival portrait and greeting
  - [ ] Make choice
  - [ ] Verify outcome (cash change, reputation change, etc.)
  - [ ] Verify effects applied to game state

- [ ] **NPC Interactions**

  - [ ] Look for NPCs (N key)
  - [ ] Find an NPC
  - [ ] Verify NPCInteractionScreen displays
  - [ ] Go through dialogue
  - [ ] Verify dialogue effects applied (reputation, information, etc.)
  - [ ] End interaction
  - [ ] Verify return to main game screen

- [ ] **Game Over**

  - [ ] Reduce health to 0 (or let debt grow huge)
  - [ ] Verify Game Over screen displays
  - [ ] Return to main menu
  - [ ] Select same slot for new game
  - [ ] Verify fresh game starts (NOT stuck in game over)

- [ ] **Save/Load**
  - [ ] Save game in slot 1
  - [ ] Perform some actions
  - [ ] Load game from slot 1
  - [ ] Verify state restored correctly
  - [ ] Verify no transient state artifacts (currentEvent, etc.)
  - [ ] Save game during event (edge case)
  - [ ] Load game
  - [ ] Verify event doesn't persist

#### Edge Cases

- [ ] **Rapid Actions**

  - Brew multiple potions quickly
  - Verify all process correctly
  - No race conditions or lost updates

- [ ] **Event During NPC Interaction**

  - Start NPC dialogue
  - If event triggers, verify proper handling
  - Complete NPC first, then event (or vice versa)

- [ ] **Zero Inventory/Cash Edge Cases**

  - Try to brew with no cash
  - Try to sell with no inventory
  - Verify proper error messages

- [ ] **Screen Transitions**
  - Press Q to quit during various states
  - Verify quit menu displays correctly
  - Cancel quit, verify return to previous state

#### Performance Testing

- [ ] **Load Test**

  - Perform 100+ actions rapidly
  - Verify no slowdown
  - Check for memory leaks

- [ ] **Large Inventory**
  - Build up large inventory (many potions)
  - Verify UI still performant
  - Verify save/load still works

#### Regression Testing

Go through original bug list and verify all fixed:

- [ ] Rival encounters display correctly
- [ ] Mysterious Stranger doesn't get skipped
- [ ] Multiple events don't conflict
- [ ] Inventory effects apply correctly
- [ ] Reputation effects apply correctly
- [ ] Price effects apply correctly
- [ ] Game Over state doesn't persist
- [ ] No events lost or duplicated

---

## Rollback Plan

### If Issues Arise During Migration

#### Option 1: Incremental Rollback

If specific components have issues, roll back individual files while keeping others migrated.

**Steps**:

1. Identify problematic component/screen
2. Restore old version from git: `git checkout HEAD~1 -- src/path/to/file.tsx`
3. Create compatibility layer if needed
4. Continue with rest of migration
5. Fix problematic component in separate pass

#### Option 2: Full Rollback

If fundamental issues with Zustand approach discovered.

**Steps**:

1. Git reset to before refactor: `git reset --hard <pre-refactor-commit>`
2. Consider Option A (Unified Reducer) instead
3. Or focus on targeted fixes without full refactor

### Compatibility During Migration

To allow gradual migration, can have both old and new systems coexist temporarily:

```typescript
// src/store/compatibility.tsx

// Temporary wrapper to support old hooks during migration
export const GameProvider = ({ children }) => {
  const store = useStore()

  // Expose old hook interface
  const gameContextValue = {
    gameState: store.game,
    handleAction: (action: string, params: any) => {
      // Map old actions to new store methods
      switch (action) {
        case 'brew':
          store.brewPotion(params.potion, params.quantity)
          break
        case 'sell':
          store.sellPotion(params.potion, params.quantity)
          break
        // ... etc
      }
    },
  }

  return (
    <GameContext.Provider value={gameContextValue}>
      {children}
    </GameContext.Provider>
  )
}
```

This allows:

- Migrating components one at a time
- Testing incrementally
- Rolling back individual pieces
- Lower risk overall

### Backup Strategy

Before starting migration:

1. **Create feature branch**: `git checkout -b refactor/zustand-state-management`
2. **Tag current state**: `git tag pre-refactor-backup`
3. **Commit frequently** during migration with descriptive messages
4. **Test at each checkpoint** before moving to next phase

Can always return to any checkpoint: `git checkout <commit-hash>`

---

## Conclusion

### Recommendation

**Proceed with Option B: Zustand Store**

**Rationale**:

1. **Solves Root Cause**: Synchronous updates eliminate all race conditions
2. **Better Developer Experience**: Simpler API, less boilerplate, better debugging
3. **Lower Migration Risk**: Gradual migration possible, easier to test incrementally
4. **Superior Tooling**: Redux DevTools, time-travel debugging, middleware ecosystem
5. **Future-Proof**: Easier to maintain and extend going forward

**Trade-offs Accepted**:

- New dependency (+3kb, negligible)
- Team learning curve (minimal, similar to useState)
- Different from pure React philosophy (pragmatic choice)

### Success Metrics

Refactor successful if:

- ✅ Zero race conditions in screen transitions
- ✅ 100% of multi-step events display correctly
- ✅ Event queue prevents conflicts
- ✅ Game effects apply reliably
- ✅ Game Over state resets properly
- ✅ No performance regression
- ✅ All tests passing
- ✅ Code is more maintainable

### Timeline

**Estimated**: 5 sessions (10-15 hours total)

- Session 1: Foundation (2-3 hours)
- Session 2: Screen Migration (2-3 hours)
- Session 3: Component Migration (2-3 hours)
- Session 4: Cleanup & Testing (2-3 hours)
- Session 5: Polish & Performance (2-3 hours)

### Next Steps

1. ✅ **Review and approve this specification**
2. **Install Zustand**: `yarn add zustand`
3. **Create store skeleton** in `src/store/appStore.ts`
4. **Begin Phase 1** of migration roadmap
5. **Test incrementally** at each phase
6. **Iterate based on findings**

### Questions for Review

Before proceeding:

1. **Zustand acceptable?** Any concerns about adding this dependency?
2. **Timeline realistic?** Can allocate 5 sessions for this refactor?
3. **Testing approach?** Prefer automated or manual testing focus?
4. **Rollback comfort?** Happy with incremental migration + rollback plan?
5. **Priority adjustments?** Any bugs more critical than identified?

---

**End of Specification**

This document serves as the complete technical specification for refactoring Potion Wars' state architecture. All decisions, trade-offs, and implementation details are captured here for reference during migration.
