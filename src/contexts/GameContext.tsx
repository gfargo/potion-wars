import { useApp } from 'ink'
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
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

type ActionParameters =
  | BrewPotionParameters
  | SellPotionParameters
  | TravelParameters
  | RepayParameters
  | StartGameParameters
  | LoadGameParameters
  | SaveGameParameters
  | QuitParameters

type BrewPotionParameters = {
  potion: string
  quantity: number
}

type SellPotionParameters = {
  potion: string
  quantity: number
}

type TravelParameters = string

type RepayParameters = {
  amount: number
}

type StartGameParameters = {
  slot: number
}

type LoadGameParameters = {
  slot: number
}

type SaveGameParameters = {
  slot: number
}

type QuitParameters = Record<string, unknown>

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

  const handleAction = useCallback(
    (action: string, parameters?: ActionParameters) => {
      switch (action) {
        case 'brew': {
          if (!parameters) {
            throw new Error('No parameters provided for brew action')
          }

          const { potion, quantity } = parameters as BrewPotionParameters

          actions.brewPotion(potion, quantity)
          actions.saveGame(activeSlotState)
          addMessage('purchase', `Brewed ${quantity} ${potion}`)
          break
        }

        case 'sell': {
          if (!parameters) {
            throw new Error('No parameters provided for sell action')
          }

          const { potion, quantity } = parameters as SellPotionParameters
          actions.sellPotion(potion, quantity)
          actions.saveGame(activeSlotState)
          addMessage('sale', `Sold ${quantity} ${potion}`)
          break
        }

        case 'travel': {
          // First handle travel
          actions.travel(parameters as TravelParameters)
          addMessage('info', `Traveled to ${parameters as TravelParameters}`)

          // Handle day advancement and events
          const dayResult = actions.advanceDay(true, true)
          if (dayResult.message) {
            addMessage('info', dayResult.message)
          }

          // Handle any triggered events
          if (dayResult.eventResult?.message) {
            addMessage(
              dayResult.eventResult.currentEvent ? 'random_event' : 'info',
              dayResult.eventResult.message as string
            )
          }

          // Save the game state
          actions.saveGame(activeSlotState)
          break
        }

        case 'repay': {
          const { amount } = parameters as RepayParameters
          actions.repayDebt(amount)
          actions.saveGame(activeSlotState)
          addMessage('info', `Repaid ${amount} gold of debt`)
          break
        }

        case 'startGame': {
          const { slot } = parameters as StartGameParameters
          // First set the active slot
          updateActiveSlot(slot)

          // Clear the message log for this slot
          clearMessages()

          // Initialize the new game
          actions.initializeGame()
          const dayResult = actions.advanceDay()
          if (dayResult.message) {
            addMessage('info', dayResult.message)
          }

          // Save the new game state
          actions.saveGame(slot)
          addMessage('info', `Started new game in slot ${slot}`)
          break
        }

        case 'loadGame': {
          const { slot } = parameters as LoadGameParameters
          actions.loadGame(slot)
          updateActiveSlot(slot)
          addMessage('info', `Game loaded from slot ${slot}`)
          break
        }

        case 'saveGame': {
          const { slot } = parameters as SaveGameParameters
          actions.saveGame(slot)
          updateActiveSlot(slot)
          addMessage('info', `Game saved to slot ${slot}`)
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
    },
    [
      actions,
      activeSlotState,
      addMessage,
      clearMessages,
      currentScreen,
      exit,
      setScreen,
      selectors.isGameOver,
      updateActiveSlot,
    ]
  )

  const handleEventChoice = useCallback(
    (choiceIndex: number) => {
      actions.handleEventChoice(choiceIndex)
      actions.saveGame(activeSlotState)

      const { currentEvent } = selectors
      if (currentEvent?.steps[choiceIndex]?.description) {
        addMessage('random_event', currentEvent.steps[choiceIndex].description)
      }
    },
    [actions, activeSlotState, addMessage, selectors]
  )

  const gameContextValue = useMemo(
    () => ({
      gameState,
      handleAction,
      handleEventChoice,
      activeSlot: activeSlotState,
    }),
    [gameState, handleAction, handleEventChoice, activeSlotState]
  )

  return (
    <GameContext.Provider value={gameContextValue}>
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
