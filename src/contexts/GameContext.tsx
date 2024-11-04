import React, { createContext, useContext, useState } from 'react'
import {
  advanceDay,
  brewPotion,
  type GameState,
  initializeGame,
  isGameOver,
  repayDebt,
  sellPotion,
  travel,
  travelCombat,
} from '../gameLogic.js'
import { useMessage } from './MessageContext.js'
import { useUI } from './UIContext.js'

type GameContextType = {
  gameState: GameState
  handleAction: (action: string, parameters?: any) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ readonly children: React.ReactNode }> = ({
  children,
}) => {
  const [gameState, setGameState] = useState<GameState>(initializeGame())
  const { setScreen, setCombatResult } = useUI()
  const { addMessage } = useMessage()

  const handleAction = (action: string, parameters?: any) => {
    switch (action) {
      case 'brew': {
        const [newBrewState, brewMessage] = brewPotion(
          gameState,
          parameters.potion,
          parameters.quantity
        )
        setGameState(newBrewState)
        addMessage('purchase', brewMessage)
        break
      }

      case 'sell': {
        const [newSellState, sellMessage] = sellPotion(
          gameState,
          parameters.potion,
          parameters.quantity
        )
        setGameState(newSellState)
        addMessage('sale', sellMessage)
        break
      }

      case 'travel': {
        // Travel to new location, changes prices
        const [newTravelState, travelMessage] = travel(gameState, parameters)
        const [travelCombatState, travelCombatMessage] =
          travelCombat(newTravelState)
        // Advance day, adds debt, triggers random events
        const [newState, newDayMessage] = advanceDay(travelCombatState, {
          triggerEvent: true,
          triggerDebt: true,
        })

        setGameState(newState)
        if (travelCombatMessage) {
          addMessage('combat', travelCombatMessage)
        }

        addMessage('info', travelMessage)
        addMessage('info', newDayMessage)

        if (
          newDayMessage.includes("You've encountered") ||
          newDayMessage.includes('You were caught')
        ) {
          setCombatResult(newDayMessage)
          addMessage('combat', newDayMessage)
        } else {
          setCombatResult(undefined)
        }

        break
      }

      case 'repay': {
        const [newRepayState, repayMessage] = repayDebt(
          gameState,
          parameters.amount
        )
        setGameState(newRepayState)
        addMessage('info', repayMessage)
        break
      }

      case 'startGame': {
        const initialState = initializeGame()
        const [newState, newDayMessage] = advanceDay(initialState)

        setGameState(newState)
        addMessage('info', newDayMessage)
        break
      }

      default: {
        addMessage('info', 'Invalid action')
      }
    }

    if (isGameOver(gameState)) {
      setScreen('game-over')
    }
  }

  return (
    <GameContext.Provider value={{ gameState, handleAction }}>
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
