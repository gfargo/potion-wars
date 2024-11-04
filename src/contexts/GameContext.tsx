import React, { createContext, useContext, useEffect, useState } from 'react'
import { locations } from '../constants.js'
import { generatePrices } from '../gameData.js'
import {
  brewPotion,
  type GameState,
  isGameOver,
  repayDebt,
  sellPotion,
  travel,
} from '../gameLogic.js'
import { useUI } from './UIContext.js'

type GameContextType = {
  gameState: GameState
  message: string
  handleAction: (action: string, parameters?: any) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ readonly children: React.ReactNode }> = ({
  children,
}) => {
  const [gameState, setGameState] = useState<GameState>({
    day: 1,
    cash: 2000,
    debt: 5500,
    health: 100,
    location: locations[0]!, // Start in the Alchemist's Quarter
    inventory: {},
    prices: {},
  })

  const [message, setMessage] = useState(
    'Welcome to Potion Wars! Select an action to begin.'
  )
  const { setScreen, setCombatResult } = useUI()

  useEffect(() => {
    setGameState((previousState) => ({
      ...previousState,
      prices: generatePrices(),
    }))
  }, [])

  const handleAction = (action: string, parameters?: any) => {
    switch (action) {
      case 'brew': {
        const [newBrewState, brewMessage] = brewPotion(
          gameState,
          parameters.potion,
          parameters.quantity
        )
        setGameState(newBrewState)
        setMessage(brewMessage)
        break
      }

      case 'sell': {
        const [newSellState, sellMessage] = sellPotion(
          gameState,
          parameters.potion,
          parameters.quantity
        )
        setGameState(newSellState)
        setMessage(sellMessage)
        break
      }

      case 'travel': {
        const [newTravelState, travelMessage] = travel(gameState, parameters)
        setGameState(newTravelState)
        setMessage(travelMessage)
        if (
          travelMessage.includes("You've encountered") ||
          travelMessage.includes('You were caught')
        ) {
          setCombatResult(travelMessage)
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
        setMessage(repayMessage)
        break
      }

      default: {
        setMessage('Invalid action')
      }
    }

    if (isGameOver(gameState)) {
      setScreen('game-over')
    }
  }

  return (
    <GameContext.Provider
      value={{
        gameState,
        message,
        handleAction,
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

