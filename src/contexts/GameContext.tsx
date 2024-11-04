import React, { createContext, useContext, useState } from 'react'
import { locations, type Location } from '../constants.js'
import { generatePrices } from '../gameData.js'
import {
  advanceDay,
  brewPotion,
  initializeGame,
  isGameOver,
  repayDebt,
  sellPotion,
  travel,
  type GameState,
} from '../gameLogic.js'
import { triggerRandomEvent, handleEventChoice } from '../events.js'
import { updateWeather, currentWeather } from '../weather.js'
import { useMessage } from './MessageContext.js'
import { useUI } from './UIContext.js'

type GameContextType = {
  gameState: GameState
  handleAction: (action: string, parameters?: any) => void
  handleEventChoice: (choiceIndex: number) => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ readonly children: React.ReactNode }> = ({
  children,
}) => {
  const [gameState, setGameState] = useState<GameState>(initializeGame())
  const { setScreen } = useUI()
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
        const [newTravelState, travelMessage] = travel(gameState, parameters)
        const [newState, newDayMessage] = advanceDay(newTravelState, {
          triggerEvent: true,
          triggerDebt: true,
        })

        const weather = updateWeather()
        const eventResult = triggerRandomEvent({
          ...newState,
          day: newState.day,
          weather,
        })

        setGameState({
          ...eventResult,
          weather,
        })

        addMessage('info', travelMessage)
        addMessage('info', newDayMessage)
        if (eventResult.message) {
          addMessage(eventResult.currentEvent ? 'random_event' : 'info', eventResult.message)
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

  const handleEventChoice = (choiceIndex: number) => {
    const eventResult = handleEventChoice(gameState, choiceIndex)
    setGameState(eventResult)
    if (eventResult.message) {
      addMessage('random_event', eventResult.message)
    }
  }

  return (
    <GameContext.Provider value={{ gameState, handleAction, handleEventChoice }}>
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

