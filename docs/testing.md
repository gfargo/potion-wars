# Testing Documentation

## Overview

Potion Wars uses a comprehensive testing strategy built around `ava` and `ink-testing-library`, with custom utilities for testing terminal UI components, game state, and user interactions.

## Testing Stack

- **Test Framework**: `ava`

  - Async/await support
  - TypeScript support
  - Clean test syntax
  - Parallel test execution

- **UI Testing**: `ink-testing-library`
  - Terminal UI rendering
  - Input simulation
  - Frame inspection
  - Component testing

## Test Organization

Tests are co-located with their respective modules:

```
src/
├── core/
│   ├── combat/
│   │   └── tests/           # Combat system tests
│   ├── game/
│   │   └── tests/           # Game mechanics tests
│   └── state/
│       └── tests/
│           ├── utils/       # Shared test utilities
│           └── *.test.tsx   # State management tests
├── screens/
│   └── tests/              # Screen component tests
└── ui/components/
    ├── common/tests/       # Common component tests
    └── game/tests/         # Game-specific component tests
```

## Test Utilities

**Location**: `src/core/state/tests/utils/`

### Test Wrapper

The TestWrapper provides all necessary context providers for testing. This ensures components have access to game state, UI state, and message context during tests.

```typescript
// src/core/state/tests/utils/TestWrapper.tsx
export const TestWrapper: React.FC<TestWrapperProps> = ({
  children,
  gameState,
  messages = [],
  screen = 'game',
}) => {
  return (
    <UIProvider initialScreen={screen}>
      <MessageProvider initialMessages={messages}>
        <GameProvider initialState={gameState}>{children}</GameProvider>
      </MessageProvider>
    </UIProvider>
  )
}
```

**Usage**:
```typescript
import { TestWrapper } from '@/core/state/tests/utils/TestWrapper'

const { lastFrame } = render(
  <TestWrapper gameState={testState}>
    <MyComponent />
  </TestWrapper>
)
```

### Render Helper

Simplified component rendering with context that reduces boilerplate in tests.

```typescript
// src/core/state/tests/utils/renderHelper.tsx
export const renderWithContext = (
  Component: React.ComponentType<any>,
  options: RenderContextOptions = {}
): Instance => {
  const { gameState, messages = [], screen = 'game' } = options
  return render(
    <TestWrapper gameState={gameState} messages={messages} screen={screen}>
      <Component />
    </TestWrapper>
  )
}
```

**Usage**:
```typescript
import { renderWithContext } from '@/core/state/tests/utils/renderHelper'

const rendered = renderWithContext(GameScreen, {
  gameState: testGameState,
  messages: testMessages,
  screen: 'game'
})
```

### Test Helper

Create test game states with default values:

```typescript
// src/core/state/tests/utils/testHelper.ts
export const createGameState = (overrides: Partial<GameState> = {}): GameState => {
  return {
    day: 1,
    cash: 2000,
    debt: 5000,
    health: 100,
    // ... default values
    ...overrides
  }
}
```

**Usage**:
```typescript
import { createGameState } from '@/core/state/tests/utils/testHelper'

const testState = createGameState({
  cash: 10000,
  inventory: { 'Health Potion': 5 }
})
```

### Screen Interactions

Common UI testing patterns for terminal interaction:

```typescript
// src/core/state/tests/utils/renderHelper.tsx
export const screenInteractions = {
  // Navigate through menu options
  async navigateMenu(t: ExecutionContext, rendered: Instance, target: string) {
    while (!rendered.lastFrame()?.includes(`❯ ${target}`)) {
      rendered.stdin.write('\u001B[B') // Down arrow
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    t.true(rendered.lastFrame()?.includes(`❯ ${target}`))
  },

  // Select a menu option
  async selectOption(rendered: Instance, option: string) {
    while (!rendered.lastFrame()?.includes(`❯ ${option}`)) {
      rendered.stdin.write('\u001B[B')
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    rendered.stdin.write('\r')
    await new Promise((resolve) => setTimeout(resolve, 50))
  },

  // Assert screen contains content
  assertScreenContent(t: ExecutionContext, rendered: Instance, content: string) {
    t.true(rendered.lastFrame()?.includes(content),
      `Expected screen to contain: ${content}`)
  },

  // Assert menu items present
  assertMenuItems(t: ExecutionContext, rendered: Instance, items: string[]) {
    items.forEach(item => {
      t.true(rendered.lastFrame()?.includes(item),
        `Expected menu item: ${item}`)
    })
  }
}
```

**Usage**:
```typescript
import { screenInteractions } from '@/core/state/tests/utils/renderHelper'

test('navigates menu', async (t) => {
  const rendered = renderWithContext(GameScreen)

  await screenInteractions.navigateMenu(t, rendered, 'Sell Potions')
  await screenInteractions.selectOption(rendered, 'Sell Potions')

  screenInteractions.assertScreenContent(t, rendered, 'Select potion to sell')
})
```

## Test Examples

### Screen Component Test

```typescript
// screens/tests/GameScreen.test.tsx
import test from 'ava'
import React from 'react'
import { GameScreen } from '../GameScreen.js'
import {
  screenInteractions,
  renderWithContext,
} from '../../core/state/tests/utils/renderHelper.js'
import { gameStates } from '../../core/state/tests/configs/gameStates.js'

test('renders game screen with all components', async (t) => {
  const rendered = renderWithContext(GameScreen)

  screenInteractions.assertMenuItems(t, rendered, [
    'Potion Wars',
    'Day',
    'Inventory',
    'Prices',
  ])
})

test('shows inventory items with quantities', async (t) => {
  const state = gameStates.wealthy()
  const rendered = renderWithContext(GameScreen, { gameState: state })

  Object.entries(state.inventory).forEach(([item, quantity]) => {
    screenInteractions.assertScreenContent(t, rendered, `${item}: ${quantity}`)
  })
})
```

### Event Handler Test

```typescript
// core/events/tests/MysteriousStranger.test.ts
import test from 'ava'
import { createGameState } from '../../state/tests/utils/testHelper.js'
import { handleEvent } from '../handlers/eventHandler.js'

test('handles accepting offer with enough gold', (t) => {
  const initialState = createGameState({ cash: 2000 })
  const eventState = handleEvent(mysteriousStrangerEvent, initialState)
  const result = handleEventChoice(eventState, 0)

  t.is(result.cash, 1000)
  t.is(result.inventory['Rare Potion'], 1)
})
```

## Test Data Management

### Game States

Predefined game states for testing:

```typescript
// core/state/tests/configs/gameStates.ts
export const gameStates = {
  default: () => createGameState(),

  wealthy: () =>
    createGameState({
      cash: 10000,
      inventory: {
        'Health Potion': 5,
        'Strength Potion': 3,
      },
    }),

  poor: () =>
    createGameState({
      cash: 100,
      debt: 10000,
    }),
}
```

### Screen States

Common screen configurations:

```typescript
// core/state/tests/configs/screenStates.ts
export const screenStates = {
  game: {
    default: () => ({
      screen: 'game',
      gameState: createGameState(),
    }),
  },

  event: {
    simple: () => ({
      screen: 'event',
      gameState: createGameState({
        currentEvent: simpleEvent,
      }),
    }),
  },
}
```

## Best Practices

1. **Test Organization**

   - Co-locate tests with their components
   - Use descriptive test names
   - Group related tests
   - Keep test files focused

2. **Test Data**

   - Use test helpers for common state
   - Create specific test scenarios
   - Avoid shared state between tests
   - Clean up after tests

3. **Assertions**

   - Use `ava`'s assertion methods
   - Test both positive and negative cases
   - Handle async operations properly
   - Check specific content in `lastFrame()`

4. **UI Testing**

   - Test user interactions thoroughly
   - Verify screen transitions
   - Check error handling
   - Test edge cases

5. **File Naming**
   - Use `.tsx` for React component tests
   - Use `.ts` for utility/logic tests
   - Always use `.js` extension in imports
   - Follow module naming patterns

## Common Gotchas

1. **lastFrame is a Method**

   ```typescript
   // Good
   t.true(lastFrame()?.includes('Text'))

   // Bad
   t.true(lastFrame?.includes('Text'))
   ```

2. **Async Operations**

   ```typescript
   // Good
   await screenInteractions.toggleHelp(rendered)
   t.true(rendered.lastFrame()?.includes('Help'))

   // Bad
   screenInteractions.toggleHelp(rendered)
   t.true(rendered.lastFrame()?.includes('Help'))
   ```

3. **Context Providers**

   ```typescript
   // Good
   const rendered = renderWithContext(Component, {
     gameState,
     screen: 'game',
   })

   // Bad
   const rendered = render(<Component />, { state: gameState })
   ```

4. **Test Isolation**

   ```typescript
   // Good
   test('handles event', (t) => {
     const state = createGameState()
     // Test with fresh state
   })

   // Bad
   const sharedState = createGameState()
   test('handles event', (t) => {
     // Test with shared state
   })
   ```
