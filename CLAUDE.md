# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Potion Wars is a text-based strategy RPG inspired by classic TI-83+ calculator games. Players take on the role of a medieval door-to-door potion peddler, brewing and selling potions across a fantastical kingdom. Built with React, Ink, and TypeScript for terminal-based gameplay with a modern architecture.

**Core Experience**: Strategic trading with time pressure (30-day limit), location-based events, turn-based combat, resource management (gold, debt, health, inventory), and character stats affecting gameplay.

## Build and Development Commands

```bash
# Compile TypeScript to dist/
yarn build

# Watch mode for development
yarn dev

# Run the compiled game (must build first)
yarn start

# Linting
yarn lint           # Check with Prettier + XO
yarn lint:fix       # Auto-fix formatting and lint issues

# Testing
yarn test           # Run AVA tests (requires build first)
yarn test:fix       # Fix snapshots and auto-format

# Release
yarn release        # Create new release with release-it
```

### Running Individual Tests

AVA is configured to run all `**/*.test.*` files. To run a specific test:

```bash
yarn build && npx ava path/to/test.test.ts
```

**Important**: AVA (not Jest) runs against compiled output in `dist/`, so always build before testing.

## Architecture

### Core Architecture Pattern

The game uses **Zustand** for centralized state management with synchronous updates. All game state, UI state, events, travel, NPCs, and messages are managed in a single unified store at `src/store/appStore.ts`.

**Why Zustand?** The project migrated from React Context + Reducer to Zustand to eliminate race conditions caused by asynchronous dispatch timing. Zustand provides:
- **Synchronous state updates** - No lag between action and state availability
- **Simpler API** - Direct method calls instead of dispatch + action creators
- **Better debugging** - Redux DevTools integration with time-travel
- **Event queue system** - Prevents events from conflicting or being lost

### Store Structure

```typescript
// src/store/appStore.ts
{
  game: {
    day, cash, debt, health, location, inventory,
    prices, reputation, marketData, tradeHistory, ...
  },
  ui: {
    activeScreen, showHelp, quitConfirmation
  },
  events: {
    queue: QueuedEvent[],    // NEW: Multiple events can queue
    current: Event | null,
    phase: 'choice' | 'outcome' | 'acknowledged',
    currentStep: number
  },
  travel: {
    phase: 'idle' | 'animating' | 'processing' | 'complete',
    destination, origin, animationStartTime
  },
  npc: {
    current: NPC | null,
    dialogueState: NPCDialogueState | null
  },
  messages: Message[]
}
```

### State Flow

```
User Interaction → Direct store method call (e.g., brewPotion())
                → set((state) => { ... }) with Immer middleware
                → State updates synchronously
                → Components re-render with new state
```

### Using the Store

```typescript
// In components:
import { useStore } from '../store/appStore'

// Select state (causes re-render only when this value changes)
const cash = useStore((state) => state.game.cash)
const currentEvent = useStore((state) => state.events.current)

// Get actions (stable references, don't cause re-renders)
const brewPotion = useStore((state) => state.brewPotion)
const chooseEvent = useStore((state) => state.chooseEvent)

// Call actions directly (synchronous!)
brewPotion('Wisdom Draught', 5)
```

**IMPORTANT: Middleware Timing Issue**
- The store uses `immer` + `devtools` + `subscribeWithSelector` middleware
- A known timing issue requires calling `get()` before `set()` to "warm up" the store in certain actions
- See `src/store/appStore.ts:574-580` for detailed comments and TODO markers
- This ensures `getState()` returns current values immediately after `set()` completes
- Documented in the store source comments

### Directory Structure

```
src/
├── cli.tsx                    # Entry point
├── app.tsx                    # Root component (no providers needed with Zustand!)
├── store/                     # Zustand store
│   └── appStore.ts            # Unified state management (game, ui, events, travel, npc, messages)
├── screens/                   # Screen components (Title, Game, GameOver, etc)
├── ui/components/             # Reusable UI components
│   ├── common/                # Generic components (animations, inputs)
│   └── game/                  # Game-specific components (status, prices, etc)
├── core/                      # Game logic (no UI)
│   ├── state/                 # Message selectors and test utilities
│   ├── game/                  # Core mechanics (economy, travel)
│   ├── combat/                # Combat system
│   ├── events/                # Random event system
│   ├── npcs/                  # NPC management and interactions
│   ├── rivals/                # Rival alchemist system
│   ├── reputation/            # Reputation tracking
│   ├── dialogue/              # NPC dialogue system
│   ├── animations/            # Animation state management
│   └── persistence/           # Save/load system
├── types/                     # TypeScript type definitions
└── constants.ts               # Game data (potions, locations, etc)
```

### Key Systems

**State Management**: All state is managed in the Zustand store at `src/store/appStore.ts`. State updates are synchronous and happen via direct method calls (e.g., `brewPotion()`, `chooseEvent()`, `completeTravel()`). Components access state via `useStore()` with selector functions to prevent unnecessary re-renders. Message selectors in `src/core/state/selectors/messageSelectors.ts` are used for derived message display calculations.

**Game Actions**: The Zustand store provides direct action methods: `brewPotion()`, `sellPotion()`, `startTravel()`, `completeTravel()`, `triggerEvent()`, `chooseEvent()`, `acknowledgeEvent()`, `startNPCInteraction()`, `updateReputation()`, and more. All actions update state synchronously using Immer middleware for immutable updates.

**Economy System**: Dynamic pricing system with two layers:

- `generateDynamicPrices()` in `src/core/game/economy.ts` - Primary pricing function that integrates market data and reputation
- Enhanced system in `src/core/game/enhancedEconomy.ts` (`EnhancedEconomyManager`) with supply/demand tracking, dynamic pricing based on trade history, and reputation modifiers
- `generatePrices()` is kept as a fallback for edge cases where market data is unavailable

**Reputation System**: `ReputationManager` in `src/core/reputation/ReputationManager.ts` tracks global reputation, location-specific reputation, and individual NPC relationships. Affects pricing, NPC dialogues, and event outcomes.

**NPC System**: Three managers in `src/core/npcs/`:

- `NPCManager` - Handles spawning, encounters, and location-based NPCs
- `NPCDataLoader` - Loads NPC definitions from JSON
- `NPCInformationManager` - Manages NPC-provided information/hints

**Events System**: `src/core/events/` contains the random event system. Events can be multi-step with player choices. The store maintains an **event queue** (`events.queue`) that prevents events from conflicting or being lost - events queue up and are processed sequentially one at a time. Handler files in `handlers/` manage specific event types (NPC encounters, rival encounters, standard events).

**Persistence**: Save system in `src/core/persistence/`:

- `saveLoad.ts` - Main save/load functions
- `utils.ts` - `SaveFileManager` singleton for all file operations
- `dataValidation.ts` - Validates and migrates save files
- **Save file structure**: `slot_[N]_save.json` (game state), `slot_[N]_game_log.json` (message history), `active_slot.json` (current slot)
- Saves stored in `~/.config/potion-wars/` (Unix) or `~/AppData/Roaming/potion-wars/` (Windows)

### Screen Flow

```
TitleScreen (start new/load game)
    ↓
LoadingScreen (brief transition)
    ↓
GameScreen (main gameplay loop)
    ├─ TravelingScreen (when traveling)
    ├─ NPCInteractionScreen (when interacting with NPCs)
    └─ MultiStepEventScreen (during events)
    ↓
GameOverScreen (when health=0 or debt too high)
```

Screen rendering is determined by state in the Zustand store (`ui.activeScreen`, `events.current`, `npc.current`, `travel.phase`). GameScreen uses these values to conditionally render the appropriate sub-screen.

## Code Style

- **Runtime**: Node.js 20+ with ES Modules
- **Formatting**: Prettier (2-space indent, no semicolons, single quotes, LF line endings)
- **Linting**: XO with React config
- **Naming**: PascalCase for components, camelCase for functions/hooks/files, UPPER_CASE for constants
- **Imports**: ES Modules with `.js` extensions (compiled from TypeScript)
- **Types**: Strict TypeScript with all compiler flags enabled (see tsconfig.json)

## Testing

- **Framework**: AVA with TypeScript support (not Jest!)
- **Location**: Tests in `src/tests/` or alongside source in `tests/` subdirectories
- **Naming**: `*.test.ts` or `*.test.tsx`
- **UI Testing**: Use `ink-testing-library` for component tests
- **Assertions**: Use AVA methods (`t.true`, `t.is`, `t.deepEqual`, etc.)
- **Build First**: Always run `yarn build` before testing (AVA runs against compiled `dist/`)
- **Snapshots**: Review diffs carefully, use `yarn test:fix` to update
- **Test Utilities**: Use TestWrapper, renderWithContext, screenInteractions helpers

See `docs/testing.md` for detailed testing scenarios.

## Important Development Patterns

### State Management Rules

1. **Use Zustand Store**: Access state via `useStore((state) => state.game.cash)` selectors
2. **Selector-based Subscriptions**: Only select the state you need to prevent unnecessary re-renders
3. **Direct Method Calls**: Call store actions directly: `brewPotion('Wisdom Draught', 5)`
4. **Immutable Updates**: Use Immer middleware syntax (looks mutable, actually immutable)
5. **Atomic Actions**: Keep store action methods focused and atomic with necessary parameters

### Component Patterns

- Keep UI components focused on presentation
- Use `useStore()` with focused selectors for state access
- Call store methods directly for actions
- Handle side effects via `useEffect` when needed
- Separate business logic from UI rendering

### Adding New Store Actions

When adding new actions to the Zustand store:

1. Add the action method to `src/store/appStore.ts` inside the `create()` call
2. Define the method signature in the `AppStore` type
3. Use `set((state) => { ... })` with Immer middleware for state updates
4. Add messages to `state.messages` array within the action
5. Call other store methods via `get().methodName()` if needed
6. Test the action works synchronously (state updates immediately)

### Persistence Rules

- All game state must be serializable to JSON
- Avoid storing functions or class instances in state
- Use validation system in `dataValidation.ts` for migration logic when adding new state fields
- SaveFileManager singleton handles all file operations with error handling
- Use custom PersistenceError with specific error codes

## Important Notes

**Game State**: The `GameState` type in `src/types/game.types.ts` is the single source of truth. It includes inventory, prices, location, day counter, health, cash, debt, reputation, market data, and current interactions.

**Save Management**: The game uses numbered save slots (1-5). Active slot tracked in `~/.config/potion-wars/activeSlot.json`. Each action that modifies state should trigger `actions.saveGame(activeSlot)` in the handler.

**Constants**: Game data like potions and locations lives in `src/constants.ts`. This includes potion definitions (name, min/max price) and location data (name, description, danger level).

**Build Output**: Entry point is `dist/cli.js` as executable binary. Module system is ES Modules with Node16 resolution, targeting ES2022 for Node.js 20+ compatibility.

**Weather System**: Impacts events and prices. Defined in `src/types/weather.types.ts`.

**Character Stats**: Strength, agility, and intelligence affect gameplay outcomes (combat, events, etc.).

## Debugging and Troubleshooting

### Save File Locations

Game saves and logs are stored locally on disk:

**macOS/Linux**: `~/.config/potion-wars/`
**Windows**: `~/AppData/Roaming/potion-wars/`

### File Structure

```
~/.config/potion-wars/
├── active_slot.json           # Current active save slot number
├── slot_1_save.json           # Game state for slot 1
├── slot_1_game_log.json       # Message history for slot 1
├── slot_2_save.json           # Game state for slot 2
├── slot_2_game_log.json       # Message history for slot 2
└── slot_N_save.json           # Additional slots...
```

### Debugging Techniques

**1. Check Active Slot**

```bash
cat ~/.config/potion-wars/active_slot.json
```

**2. Examine Game Log**
The game log contains timestamped messages showing all game events, travels, transactions, and state changes. This is invaluable for debugging sequence issues:

```bash
# View recent log entries
tail -50 ~/.config/potion-wars/slot_N_game_log.json

# Search for specific events
grep "Traveled" ~/.config/potion-wars/slot_2_game_log.json
```

**3. Inspect Game State**

```bash
# Pretty-print game state
cat ~/.config/potion-wars/slot_N_save.json | jq '.'

# Check specific state values
cat ~/.config/potion-wars/slot_N_save.json | jq '.day, .cash, .debt, .location.name'
```

**4. Common Issues to Look For**

- **Duplicate events**: Check timestamps in game log for events happening milliseconds apart
- **State pollution**: Compare `currentEvent`, `currentStep`, `currentNPCInteraction` between saves
- **Travel bugs**: Look for "Traveled from X to X" (same location) messages
- **Race conditions**: Events with identical timestamps or out-of-order messages
- **NaN values**: Search for "NaN" in save files indicating corrupted numeric state

### Debug Logging

Debug logging was cleaned up from production code. Key areas for adding temporary debug logging when investigating issues:

- Store actions (`src/store/appStore.ts`)
- Save/load operations (`src/core/persistence/saveLoad.ts`)

Run the game in a terminal to see these logs in real-time:

```bash
yarn build && yarn start
```

### Resetting Save Data

To start fresh during debugging:

```bash
# Clear all save data
rm -rf ~/.config/potion-wars/

# Clear specific slot
rm ~/.config/potion-wars/slot_2_*
```

## Additional Resources

Project documentation is organized across several locations:

### Core Documentation

- `docs/primer.md` - Game mechanics, system design, and architecture evolution (Zustand migration)
- `docs/persistence.md` - Save system design (5 slots), migration strategies, and best practices
- `docs/testing.md` - Testing scenarios and patterns with AVA + ink-testing-library
- `AGENTS.md` - Repository structure and coding guidelines for contributors

### Steering Documents (.kiro/steering/)

- `product.md` - Core gameplay mechanics, key features, and target experience
- `structure.md` - Detailed project structure, naming conventions, and architectural patterns
- `tech.md` - Technology stack, development patterns, and tooling configuration

### Archive

- `docs/archive/ARCHITECTURE_REFACTOR_COMPLETED.md` - Historical record of Context + Reducer → Zustand migration (2825 lines of planning, analysis, and implementation details)

**Recommended Reading Order**: Start with `CLAUDE.md` (this file) for current architecture, then `docs/primer.md` for system details, then steering docs for high-level context.
