import React, { useEffect } from 'react'
import { useStore, type Message, type Screen } from '../../../../store/appStore.js'
import { type GameState } from '../../../../types/game.types.js'

type TestWrapperProperties = {
  readonly children: React.ReactNode
  readonly gameState?: GameState
  readonly messages?: Message[]
  readonly screen?: Screen
}

/**
 * Wrapper component that initializes Zustand store for testing
 */
export function TestWrapper({
  children,
  gameState,
  messages = [],
  screen = 'game',
}: TestWrapperProperties) {
  const resetGame = useStore((state) => state.resetGame)

  useEffect(() => {
    // Reset store to initial state
    resetGame()

    // Apply test-specific overrides
    const store = useStore.getState()

    if (gameState) {
      store.game = { ...store.game, ...gameState }
    }

    if (messages.length > 0) {
      store.messages = messages
    }

    if (screen) {
      store.ui.activeScreen = screen
    }
  }, [gameState, messages, screen, resetGame])

  return <>{children}</>
}
