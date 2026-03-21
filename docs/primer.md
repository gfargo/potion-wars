# Potion Wars: Game Primer

## Overview

Potion Wars is a text-based strategy RPG built with React and Ink, bringing a medieval potion-peddling experience to your terminal. As a door-to-door alchemist, your goal is to brew and sell potions across a fantastical kingdom, manage resources (gold, debt, health, inventory), navigate random events, engage in turn-based combat, and build your reputation—all within a 30-day time limit.

## Core Architecture

### State Management

The game uses **Zustand** for centralized state management with synchronous updates:

1. **Unified Store** (`src/store/appStore.ts`):
   - Single source of truth for all state (game, UI, events, travel, NPCs, messages)
   - Synchronous state updates via direct method calls
   - Immer middleware for immutable updates with mutable-style syntax
   - Redux DevTools integration for debugging

2. **Store Structure**:
   - `game`: Core game state (day, cash, debt, health, location, inventory, prices, reputation, etc.)
   - `ui`: UI state (activeScreen, showHelp, quitConfirmation)
   - `events`: Event queue system (queue, current, phase, currentStep)
   - `travel`: Travel state machine (phase, destination, origin, animationStartTime)
   - `npc`: NPC interaction state (current NPC, dialogue state)
   - `messages`: Game log messages

3. **Legacy State Layer** (`src/core/state/`):
   - **Selectors** (`selectors/`): Still used for derived state calculations
     - Market selectors for economic data
     - Game selectors for computed values
     - Memoized for performance
   - Note: Actions, reducers, and hooks are legacy - use store methods instead

### Architecture Evolution

The project migrated from React Context + Reducer to Zustand (January 2025) to solve critical race conditions:

**Problems with Context + Reducer**:
- Asynchronous `dispatch()` caused timing issues between actions and state availability
- Events would trigger but screens wouldn't display them (60% failure rate)
- Multiple events would conflict and overwrite each other
- Game effects (inventory, reputation, prices) would sometimes fail to apply

**Why Zustand**:
- ✅ Synchronous state updates - no lag between action and state
- ✅ Event queue system - prevents conflicts, processes events sequentially
- ✅ Simpler API - direct method calls instead of dispatch + action creators
- ✅ Better debugging - Redux DevTools with time-travel
- ✅ Selector-based subscriptions - components only re-render when their data changes

**Migration Impact**:
- Event display success: 60% → 100%
- ~30 files modified, contexts/reducers/action creators removed
- Store methods are synchronous and type-safe
- State updates are predictable and debuggable

See `docs/archive/ARCHITECTURE_REFACTOR_COMPLETED.md` for full migration details.

## Core Systems

### 1. Economy System

**Dynamic Pricing** (`src/core/game/economy.ts` & `enhancedEconomy.ts`):
- Primary pricing function: `generateDynamicPrices()` integrates market data and reputation
- Enhanced system via `EnhancedEconomyManager`:
  - Supply/demand tracking
  - Trade history analysis
  - Dynamic pricing based on player behavior
  - Reputation-based price modifiers
- Fallback `generatePrices()` for edge cases

### 2. NPC System

Comprehensive NPC interaction system (`src/core/npcs/`):
- **NPCManager**: Handles spawning, encounters, and location-based NPCs
- **NPCDataLoader**: Loads NPC definitions from JSON data files
- **NPCInformationManager**: Manages NPC-provided hints and information
- **NPCMarketIntelligence**: NPCs provide market insights and trading tips
- **NPCTrading**: Facilitates direct NPC trade interactions

### 3. Reputation System

**ReputationManager** (`src/core/reputation/ReputationManager.ts`):
- Global reputation tracking
- Location-specific reputation
- Individual NPC relationship management
- Affects pricing, dialogues, and event outcomes

### 4. Dialogue System

**DialogueEngine** (`src/core/dialogue/DialogueEngine.ts`):
- Tree-based conversation flows
- Context-aware responses based on reputation and game state
- Trading dialogues with NPCs
- Dynamic dialogue generation

### 5. Event System

**Event Management** (`src/core/events/`):
- Single-step and multi-step events with player choices
- Event handlers organized by type (NPC, rival, standard)
- Location-specific and time-based event triggers
- Weather-based events affecting travel and prices

### 6. Rival Alchemist System

**RivalAlchemist** (`src/core/rivals/`):
- Recurring rival encounters during travel
- Price undercutting mechanics
- Reputation impacts from rival interactions
- Dynamic rival behavior based on player actions

### 7. Combat System

Turn-based combat (`src/core/combat/`):
- Attack, defend, and potion usage
- Enemy generation with various types
- Character stats (strength, agility, intelligence) affect outcomes

### 8. Animation System

**AnimationManager** (`src/core/animations/AnimationManager.ts`):
- Manages game animations and transitions
- Travel animations
- ASCII art displays

### 9. Persistence System

**Save/Load Management** (`src/core/persistence/`):
- **SaveFileManager** singleton for all file operations
- **5 save slots** with named saves
- File structure:
  - `slot_[N]_save.json`: Game state
  - `slot_[N]_game_log.json`: Message history
  - `active_slot.json`: Current active slot
- Save location: `~/.config/potion-wars/` (Unix) or `~/AppData/Roaming/potion-wars/` (Windows)
- Data validation and migration system
- Custom `PersistenceError` with error codes

## UI Components

### Common Components (`src/ui/components/common/`)

- **AsciiAnimation**: ASCII art animation displays
- **ContextualHelp**: Context-sensitive help system
- **NPCPortrait**: NPC visual representation
- **TravelAnimation**: Travel transition animations
- **TutorialSystem**: In-game tutorial and guidance

### Game Components (`src/ui/components/game/`)

- **ActionMenu**: Available player actions display
- **Day**: Current day counter
- **EnhancedMarketDisplay**: Market information with trends
- **GameLog**: Message history display
- **Help**: In-game help and instructions
- **InventoryDisplay**: Player inventory with quantities
- **Location**: Current location information
- **PlayerStatus**: Health, cash, debt, stats display
- **PriceList**: Current potion prices
- **QuitMenu**: Game exit confirmation
- **ReputationDisplay**: Reputation across locations and NPCs
- **Weather**: Current weather display

## Application Screens

### Screen Flow

```
TitleScreen → LoadingScreen → GameScreen ⇄ TravelingScreen
                                    ↓
                            MultiStepEventScreen
                                    ↓
                            NPCInteractionScreen
                                    ↓
                              GameOverScreen
```

### Screen Components (`src/screens/`)

1. **TitleScreen** (`TitleScreen/`):
   - Main menu with ASCII art
   - New game / Load game options
   - Save slot selection

2. **LoadingScreen**: Brief transition screen

3. **GameScreen**: Main gameplay interface
   - Conditionally renders sub-screens based on game state
   - Main game UI (brewing, selling, inventory management)

4. **TravelingScreen**: Travel animation and transitions

5. **MultiStepEventScreen**: Multi-step event handling
   - Choice presentation
   - Outcome display
   - Player decision making

6. **NPCInteractionScreen**: NPC dialogue and interaction

7. **GameOverScreen**: End game state with statistics

## Project Hierarchy

```
src/
├── app.tsx                     # Main application with context providers
├── cli.tsx                     # CLI entry point
├── constants.ts                # Game data (potions, locations)
│
├── types/                      # TypeScript type definitions
│   ├── game.types.ts           # Core game state types
│   ├── events.types.ts         # Event system types
│   ├── weather.types.ts        # Weather system types
│   ├── npc.types.ts            # NPC types
│   ├── reputation.types.ts     # Reputation types
│   ├── economy.types.ts        # Economy types
│   └── animation.types.ts      # Animation types
│
├── core/                       # Core game systems (business logic)
│   ├── state/                  # State management layer
│   │   ├── actions/            # Typed action creators
│   │   ├── reducers/           # State reducers (gameReducer)
│   │   ├── selectors/          # State selectors (ALWAYS USE THESE)
│   │   └── hooks/              # Custom React hooks (useGameState)
│   │
│   ├── game/                   # Core game mechanics
│   │   ├── economy.ts          # Dynamic pricing
│   │   ├── enhancedEconomy.ts  # EnhancedEconomyManager
│   │   ├── state.ts            # Game state utilities
│   │   └── travel.ts           # Travel mechanics
│   │
│   ├── npcs/                   # NPC system
│   │   ├── NPCManager.ts       # NPC spawning and encounters
│   │   ├── NPCDataLoader.ts    # Load NPC definitions
│   │   ├── NPCInformationManager.ts
│   │   ├── NPCMarketIntelligence.ts
│   │   └── NPCTrading.ts
│   │
│   ├── reputation/             # Reputation system
│   │   └── ReputationManager.ts
│   │
│   ├── dialogue/               # Dialogue system
│   │   ├── DialogueEngine.ts
│   │   ├── DialogueTrading.ts
│   │   └── DialogueTreeManager.ts
│   │
│   ├── rivals/                 # Rival alchemist system
│   │   ├── RivalAlchemist.ts
│   │   └── RivalDataLoader.ts
│   │
│   ├── events/                 # Event system
│   │   ├── index.ts            # Event triggering
│   │   └── handlers/           # Event type handlers
│   │       ├── npc.ts
│   │       ├── rival.ts
│   │       └── standard.ts
│   │
│   ├── combat/                 # Combat system
│   │   └── index.ts
│   │
│   ├── animations/             # Animation management
│   │   └── AnimationManager.ts
│   │
│   └── persistence/            # Save/load system
│       ├── saveLoad.ts         # Main save/load functions
│       ├── messageStorage.ts   # Message persistence
│       ├── dataValidation.ts   # Save validation and migration
│       └── reputationValidation.ts
│
├── contexts/                   # React context providers
│   ├── GameContext.tsx         # Game state and actions
│   ├── UIContext.tsx           # Screen navigation
│   └── MessageContext.tsx      # Message log
│
├── screens/                    # Screen components
│   ├── TitleScreen/
│   │   ├── index.tsx
│   │   └── TitleScreenMenu.tsx
│   ├── GameScreen.tsx
│   ├── TravelingScreen.tsx
│   ├── MultiStepEventScreen.tsx
│   ├── NPCInteractionScreen.tsx
│   ├── GameOver.tsx
│   └── LoadingScreen.tsx
│
├── ui/components/              # UI components
│   ├── common/                 # Reusable components
│   │   ├── AsciiAnimation.tsx
│   │   ├── ContextualHelp.tsx
│   │   ├── NPCPortrait.tsx
│   │   ├── TravelAnimation.tsx
│   │   └── TutorialSystem.tsx
│   │
│   └── game/                   # Game-specific components
│       ├── ActionMenu.tsx
│       ├── Day.tsx
│       ├── EnhancedMarketDisplay.tsx
│       ├── GameLog.tsx
│       ├── Help.tsx
│       ├── InventoryDisplay.tsx
│       ├── Location.tsx
│       ├── PlayerStatus.tsx
│       ├── PriceList.tsx
│       ├── QuitMenu.tsx
│       ├── ReputationDisplay.tsx
│       └── Weather.tsx
│
├── hooks/                      # Custom React hooks
│   └── useStdOutDimensions.tsx
│
├── data/                       # Game data files
│   └── defaultNPCs.ts
│
└── tests/                      # Test organization
    ├── integration/            # Integration tests
    └── unit/                   # Unit tests
```

## Development Patterns and Principles

### State Management Patterns

1. **Selector Usage**:

   - Always access state through selectors, never directly
   - Create specific selectors for derived/computed values
   - Keep selectors pure and focused
   - Consider memoization for expensive computations

   ```typescript
   // Good
   const health = selectHealth(gameState)
   // Bad
   const health = gameState.health
   ```

2. **Action Patterns**:

   - Use typed action creators for all state modifications
   - Keep actions atomic and focused
   - Include necessary context in action payloads

   ```typescript
   // Good
   dispatch(brewPotion('Health Potion', 2))
   // Bad
   dispatch({ type: 'BREW', potion: 'Health Potion', amount: 2 })
   ```

3. **Component Patterns**:
   - Keep UI components focused on presentation
   - Use selectors for all state access
   - Handle side effects in appropriate hooks
   ```typescript
   // Good
   const prices = selectPriceList(gameState)
   return <PriceDisplay prices={prices} />
   // Bad
   return <PriceDisplay prices={gameState.prices} />
   ```

### Code Organization

1. **File Structure**:

   - Group files by domain (game, combat, events)
   - Separate business logic from UI components
   - Use index files for clean exports
   - Keep related files close together

2. **Naming Conventions**:

   - Actions: verb_noun (brewPotion, sellItem)
   - Selectors: select[Domain][Value] (selectHealth, selectPriceList)
   - Types: PascalCase with domain (GameState, CombatAction)
   - Files: domain.purpose.ts (game.types.ts, combat.actions.ts)

3. **Type Safety**:
   - Use TypeScript types for all functions and components
   - Define clear interfaces for state slices
   - Use union types for action discriminators
   - Avoid any unless absolutely necessary

### Best Practices

1. **State Updates**:

   - Always use immutable updates
   - Handle side effects in appropriate places
   - Validate state transitions
   - Keep state normalized when possible

2. **Performance**:

   - Memoize expensive computations
   - Use appropriate React hooks (useMemo, useCallback)
   - Keep render cycles efficient
   - Monitor state update frequency

3. **Error Handling**:

   - Use appropriate error boundaries
   - Validate input data
   - Provide meaningful error messages
   - Handle edge cases gracefully

4. **Testing Considerations**:
   - Keep functions pure for testability
   - Mock external dependencies
   - Test state transitions
   - Verify selector computations

## Testing Guidelines

### Framework and Libraries

The project uses specific testing tools designed for terminal-based UI applications:

- **Test Framework**: `ava` (not Jest)
- **UI Testing**: `ink-testing-library`

Example test setup:

```typescript
import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'

test('component renders correctly', async (t) => {
  const { lastFrame } = render(<MyComponent />)
  t.true(lastFrame()?.includes('Expected Content')) // Note: lastFrame is a method
})
```

### Key Testing Patterns

1. **Frame Testing**

   ```typescript
   // Check rendered content
   const { lastFrame } = render(<Component />)
   t.true(lastFrame()?.includes('Expected Text')) // lastFrame is a method
   ```

2. **Input Simulation**

   ```typescript
   // Simulate key presses
   const rendered = render(<Component />)
   rendered.stdin.write('\u001B[B') // Down arrow
   rendered.stdin.write('\r') // Enter
   ```

### File Organization

Tests are co-located with their respective modules:

```
src/
├── core/
│   ├── combat/
│   │   ├── index.ts
│   │   └── tests/           # Combat system tests
│   ├── game/
│   │   ├── index.ts
│   │   └── tests/           # Game mechanics tests
│   └── state/
│       ├── index.ts
│       └── tests/
│           ├── utils/       # Shared test utilities
│           └── *.test.tsx   # State management tests
├── screens/
│   ├── GameScreen.tsx
│   └── tests/              # Screen component tests
└── ui/
    └── components/
        ├── common/
        │   ├── index.ts
        │   └── tests/      # Common component tests
        └── game/
            ├── index.ts
            └── tests/      # Game-specific component tests
```

Note: Always use `.tsx` extension for test files that include JSX syntax.

### Testing Different Components

1. **Screen Components**

   ```typescript
   // screens/tests/GameScreen.test.tsx
   test('renders game screen', async (t) => {
     const { lastFrame } = render(<GameScreen />)
     t.true(lastFrame()?.includes('Inventory'))
     t.true(lastFrame()?.includes('Status'))
   })
   ```

   ```typescript
   // screens/tests/GameScreen.test.tsx
   test('renders game screen', async (t) => {
     const { lastFrame } = renderWithContext(<GameScreen />, testState)
     t.true(lastFrame()?.includes('Inventory'))
     t.true(lastFrame()?.includes('Status'))
   })
   ```

2. **State Management**
   ```typescript
   // core/state/tests/gameReducer.test.ts
   test('updates game state', async (t) => {
     const action = { type: 'game/advanceDay' }
     const newState = gameReducer(initialState, action)
     t.is(newState.day, initialState.day + 1)
   })
   ```

### Best Practices

1. **Test Organization**

   - Co-locate tests with their components
   - Use descriptive test names
   - Group related tests together
   - Keep test files focused and manageable

2. **Test Data**

   - Use test helpers for common state
   - Create specific test scenarios
   - Avoid sharing state between tests
   - Clean up after tests when needed

3. **Assertions**

   - Use `ava`'s assertion methods (not Jest's expect)

   ```typescript
   // Good
   t.true(lastFrame()?.includes('Menu'))
   t.is(count, 5)
   t.deepEqual(state, expectedState)

   // Bad (Jest style)
   expect(lastFrame).toContain('Menu')
   expect(count).toBe(5)
   expect(state).toEqual(expectedState)
   ```

   - Check specific content in `lastFrame()`
   - Test both positive and negative cases
   - Handle async operations properly

4. **Input/Output**

   - Test user interactions thoroughly
   - Verify screen transitions
   - Check error handling
   - Test edge cases

5. **File Naming**
   - Use `.tsx` for React component tests
   - Use `.ts` for utility/logic tests
   - Always use `.js` extension in imports
   - Example: `import { Component } from './Component.js'`
