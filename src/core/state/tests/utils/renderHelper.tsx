import type * as test from 'ava'
import { render } from 'ink-testing-library'
import React from 'react'
import { type Message } from '../../../../contexts/MessageContext.js'
import { type Screen } from '../../../../contexts/UIContext.js'
import { type GameState } from '../../../../types/game.types.js'
import { TestWrapper } from './TestWrapper.js'

type RenderContextOptions = {
  gameState?: GameState
  messages?: Message[]
  screen?: Screen
}

type Instance = ReturnType<typeof render>

/**
 * Helper for rendering components with test context
 */
export const renderWithContext = (
  Component: React.ComponentType<any>,
  options: RenderContextOptions = {}
): Instance => {
  const { gameState, messages = [], screen = 'game' } = options
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
