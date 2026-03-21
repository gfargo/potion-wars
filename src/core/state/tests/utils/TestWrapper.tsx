import React from 'react'
import { useStore, type Message, type Screen } from '../../../../store/appStore.js'
import { type GameState } from '../../../../types/game.types.js'

type TestWrapperProperties = {
  readonly children: React.ReactNode
  readonly gameState?: GameState
  readonly messages?: Message[]
  readonly screen?: Screen
}

/**
 * Wrapper component that initializes Zustand store for testing.
 *
 * State is set synchronously during render via useMemo so the
 * first frame already has the correct state.
 */
export function TestWrapper({
  children,
  gameState,
  messages = [],
  screen = 'game',
}: TestWrapperProperties) {
  // Set state synchronously during render (not in useEffect)
  React.useMemo(() => {
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
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
