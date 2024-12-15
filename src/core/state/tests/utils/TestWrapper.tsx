import React from 'react'
import { GameProvider } from '../../../../contexts/GameContext.js'
import {
  type Message,
  MessageProvider,
} from '../../../../contexts/MessageContext.js'
import { type Screen, UIProvider } from '../../../../contexts/UIContext.js'
import { type GameState } from '../../../../types/game.types.js'

type TestWrapperProperties = {
  readonly children: React.ReactNode
  readonly gameState?: GameState
  readonly messages?: Message[]
  readonly screen?: Screen
}

/**
 * Wrapper component that provides all necessary contexts for testing
 */
export function TestWrapper({
  children,
  gameState,
  messages = [],
  screen = 'game',
}: TestWrapperProperties) {
  return (
    <UIProvider initialScreen={screen}>
      <MessageProvider initialMessages={messages}>
        <GameProvider initialState={gameState}>{children}</GameProvider>
      </MessageProvider>
    </UIProvider>
  )
}
