import { useApp } from 'ink'
import React, { createContext, useCallback, useContext, useState } from 'react'
import { getActiveSlot, setActiveSlot } from '../core/persistence/activeSlot.js'
import { useGameState } from '../core/state/index.js'
import { type GameState } from '../types/game.types.js'
import { useMessage } from './MessageContext.js'
import { useUI } from './UIContext.js'

type GameContextType = {
  gameState: GameState
  handleAction: (action: string, parameters?: any) => void
  handleEventChoice: (choiceIndex: number) => void
  activeSlot: number
}

const GameContext = createContext<GameContextType | undefined>(undefined)

type GameProviderProperties = {
  readonly children: React.ReactNode
  readonly initialState?: GameState
}

export const DEFAULT_GAME_STATE: GameState = {
  day: 0,
  cash: 2000,
  debt: 5000,
  health: 100,
  strength: Math.floor(Math.random() * 5) + 5,
  agility: Math.floor(Math.random() * 5) + 5,
  intelligence: Math.floor(Math.random() * 5) + 5,
  location: { name: "Alchemist's Quarter", description: '', dangerLevel: 1 },
  inventory: {},
  prices: {},
  weather: 'sunny',
}

export function GameProvider({
  children,
  initialState,
}: GameProviderProperties) {
  const { exit } = useApp()
  //
  const [activeSlotState, setActiveSlotState] =
    useState<number>(getActiveSlot())
  const { setScreen, currentScreen } = useUI()
  const { addMessage, clearMessages } = useMessage()

  // Update active slot in both state and file
  const updateActiveSlot = useCallback((slot: number) => {
    console.log('Updating active slot to', slot)

    setActiveSlotState(slot)
    setActiveSlot(slot)
  }, [])

  const {
    state: gameState,
    actions,
    selectors,
  } = useGameState(initialState ?? DEFAULT_GAME_STATE)

  const handleAction = (action: string, parameters?: any) => {
    switch (action) {
      case 'brew': {
        actions.brewPotion(parameters.potion, parameters.quantity)
        actions.saveGame(activeSlotState)
        addMessage(
          'purchase',
          `Brewed ${parameters.quantity} ${parameters.potion}`
        )
        break
      }

      case 'sell': {
        actions.sellPotion(parameters.potion, parameters.quantity)
        actions.saveGame(activeSlotState)
        addMessage('sale', `Sold ${parameters.quantity} ${parameters.potion}`)
        break
      }

      case 'travel': {
        // First handle travel
        actions.travel(parameters)
        addMessage('info', `Traveled to ${parameters}`)

        // Handle day advancement and events
        const dayResult = actions.advanceDay(true, true)
        if (dayResult.message) {
          addMessage('info', dayResult.message)
        }

        // Handle any triggered events
        if (dayResult.eventResult?.message) {
          addMessage(
            dayResult.eventResult.currentEvent ? 'random_event' : 'info',
            dayResult.eventResult.message
          )
        }

        // Save the game state
        actions.saveGame(activeSlotState)
        break
      }

      case 'repay': {
        actions.repayDebt(parameters.amount)
        actions.saveGame(activeSlotState)
        addMessage('info', `Repaid ${parameters.amount} gold of debt`)
        break
      }

      case 'startGame': {
        // First set the active slot
        updateActiveSlot(parameters.slot)

        // Clear the message log for this slot
        clearMessages()

        // Initialize the new game
        actions.initializeGame()
        const dayResult = actions.advanceDay()
        if (dayResult.message) {
          addMessage('info', dayResult.message)
        }

        // Save the new game state
        actions.saveGame(parameters.slot)
        addMessage('info', `Started new game in slot ${parameters.slot}`)
        break
      }

      case 'loadGame': {
        actions.loadGame(parameters.slot)
        updateActiveSlot(parameters.slot)
        addMessage('info', `Game loaded from slot ${parameters.slot}`)
        break
      }

      case 'saveGame': {
        actions.saveGame(parameters.slot)
        updateActiveSlot(parameters.slot)
        addMessage('info', `Game saved to slot ${parameters.slot}`)
        break
      }

      case 'quit': {
        actions.saveGame(activeSlotState)
        console.log('Exiting game')

        if (currentScreen === 'game') {
          setScreen('title')
        } else {
          exit()
        }

        break
      }

      default: {
        addMessage('info', 'Invalid action')
      }
    }

    if (selectors.isGameOver) {
      setScreen('game-over')
    }
  }

  const handleEventChoice = (choiceIndex: number) => {
    actions.handleEventChoice(choiceIndex)
    actions.saveGame(activeSlotState)

    const { currentEvent } = selectors
    if (currentEvent?.steps[choiceIndex]?.description) {
      addMessage('random_event', currentEvent.steps[choiceIndex].description)
    }
  }

  return (
    <GameContext.Provider
      value={{
        gameState,
        handleAction,
        handleEventChoice,
        activeSlot: activeSlotState,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }

  return context
}
