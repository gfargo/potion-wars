import type * as test from 'ava'
import { render } from 'ink-testing-library'
import React from 'react'
import {
    useStore,
    type Message,
    type Screen,
    type AppState,
} from '../../../../store/appStore.js'
import { type GameState } from '../../../../types/game.types.js'
import { TestWrapper } from './TestWrapper.js'

type RenderContextOptions = {
  gameState?: GameState
  messages?: Message[]
  screen?: Screen
  storeOverrides?: Partial<AppState>
}

type Instance = ReturnType<typeof render>

/**
 * Helper for rendering components with test context.
 *
 * Sets Zustand store state synchronously BEFORE render() so the
 * very first frame already reflects the test overrides.
 */
export const renderWithContext = (
  Component: React.ComponentType<any>,
  options: RenderContextOptions = {}
): Instance => {
  const { gameState, messages = [], screen = 'game', storeOverrides } = options

  // Pre-seed the store before render so the first frame is correct
  useStore.getState().resetGame()
  useStore.setState((state) => {
    if (gameState) {
      // Extract event-related fields and route them to events.*
      const { currentEvent, currentStep, ...restGameState } = gameState
      Object.assign(state.game, restGameState)

      if (currentEvent) {
        state.events.current = currentEvent
        state.events.phase = 'choice'
        state.events.currentStep = currentStep ?? 0
      }
    }

    if (messages.length > 0) {
      state.messages = messages
    }

    if (screen) {
      state.ui.activeScreen = screen
    }

    // Apply any additional store-level overrides
    if (storeOverrides) {
      Object.assign(state, storeOverrides)
    }
  })

  const rendering = render(
    <TestWrapper gameState={gameState} messages={messages} screen={screen}>
      <Component />
    </TestWrapper>
  )
  return rendering
}

/**
 * Helper for testing screen transitions
 */
export const assertScreenChange = async (
  t: test.ExecutionContext,
  rendered: ReturnType<typeof render>,
  fromScreen: string,
  toScreen: string,
  action: () => Promise<void>
) => {
  t.true(rendered.lastFrame()?.includes(fromScreen))
  await action()
  await new Promise((resolve) => {
    setTimeout(resolve, 100)
  })
  t.true(rendered.lastFrame()?.includes(toScreen))
}

/**
 * Helper for common UI test scenarios
 */
export const screenInteractions = {
  /**
   * Assert menu items are present
   */
  assertMenuItems(
    t: test.ExecutionContext,
    rendered: Instance,
    items: string[]
  ) {
    const frame = rendered.lastFrame()
    for (const item of items) {
      t.true(frame?.includes(item))
    }
  },

  /**
   * Assert screen content
   */
  assertScreenContent(
    t: test.ExecutionContext,
    rendered: Instance,
    content: string
  ) {
    t.true(rendered.lastFrame()?.includes(content))
  },
}
