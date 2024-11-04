import React, { createContext, useContext, useEffect, useState } from 'react'
import { locations } from '../constants.js'
import { generatePrices } from '../gameData.js'
import {
  buyDrug,
  type GameState,
  isGameOver,
  repayDebt,
  sellDrug,
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
    location: locations[0]!, // Start in the Bronx
    inventory: {},
    prices: {},
  })

  const [message, setMessage] = useState(
    'Welcome to Drug Wars! Select an action to begin.'
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
      case 'buy': {
        const [newBuyState, buyMessage] = buyDrug(
          gameState,
          parameters.drug,
          parameters.quantity
        )
        setGameState(newBuyState)
        setMessage(buyMessage)
        break
      }

      case 'sell': {
        const [newSellState, sellMessage] = sellDrug(
          gameState,
          parameters.drug,
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
      const finalScore = gameState.cash - gameState.debt
      setMessage(`Game Over! Final score: $${finalScore}`)
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
