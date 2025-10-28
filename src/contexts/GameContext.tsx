import { useApp } from 'ink'
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'
import { getActiveSlot, setActiveSlot } from '../core/persistence/activeSlot.js'
import { useGameState } from '../core/state/index.js'
import { type GameState } from '../types/game.types.js'
import { NPCManager } from '../core/npcs/NPCManager.js'
import { DEFAULT_NPCS } from '../data/defaultNPCs.js'
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
  | NPCInteractionParameters

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

type NPCInteractionParameters = {
  npcId: string
  action: string
  data?: any
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
  // New features with default values
  reputation: {
    global: 0,
    locations: {},
    npcRelationships: {}
  },
  marketData: {},
  tradeHistory: []
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

  // Register default NPCs on mount
  useEffect(() => {
    const npcManager = NPCManager.getInstance()
    DEFAULT_NPCS.forEach(npc => {
      try {
        npcManager.registerNPC(npc)
      } catch (error) {
        // NPC might already be registered, ignore
        console.warn(`Failed to register NPC ${npc.id}:`, error)
      }
    })
  }, [])

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
          // Store the current location before traveling
          const fromLocation = gameState.location.name

          // Show traveling screen
          setScreen('traveling')

          // Delay the actual travel to allow animation to play
          setTimeout(() => {
            // First handle travel with NPC encounters
            actions.travel(parameters as TravelParameters)
            addMessage('info', `Traveled from ${fromLocation} to ${parameters as TravelParameters}`)

            // Handle day advancement and events
            const dayResult = actions.advanceDay(true, true)
            if (dayResult.message) {
              addMessage('info', dayResult.message)
            }

            // Handle any triggered events
            if (dayResult.eventResult?.message) {
              console.log('Event triggered:', {
                message: dayResult.eventResult.message,
                hasCurrentEvent: Boolean(dayResult.eventResult.currentEvent),
                eventName: dayResult.eventResult.currentEvent?.name,
                eventType: dayResult.eventResult.currentEvent?.type
              })

              // Determine message type based on event type
              let messageType: 'random_event' | 'info' | 'error' = 'random_event'
              if (dayResult.eventResult.currentEvent) {
                const eventType = dayResult.eventResult.currentEvent.type
                if (eventType === 'negative') {
                  messageType = 'error' // Red color for negative events
                } else if (eventType === 'positive') {
                  messageType = 'random_event' // Magenta for positive (we could add 'success' type later)
                } else {
                  messageType = 'random_event' // Magenta for neutral
                }
              }

              addMessage(messageType, dayResult.eventResult.message as string)
            }

            // Save the game state
            actions.saveGame(activeSlotState)

            // Return to game screen after travel completes
            // Note: Don't call setScreen immediately - wait for React to process state updates
            // Use setTimeout with 0ms to defer screen transition until after state updates propagate
            setTimeout(() => {
              setScreen('game')
            }, 0)
          }, 4000)

          break
        }

        case 'searchNPCs': {
          // Search for NPCs at the current location
          const npcManager = NPCManager.getInstance()
          const encounter = npcManager.rollForEncounter(gameState.location.name, gameState)

          if (encounter) {
            addMessage('info', `You found ${encounter.name}!`)
            // Start the NPC interaction
            actions.startNPCInteraction(encounter.id, 'dialogue')
          } else {
            addMessage('info', 'No NPCs found in this area. Try again later.')
          }

          break
        }

        case 'npcInteraction': {
          // Handle NPC interaction actions
          const { npcId, action: npcAction, data } = parameters as NPCInteractionParameters

          switch (npcAction) {
            case 'start': {
              const interactionType = data?.type || 'dialogue'
              actions.startNPCInteraction(npcId, interactionType)
              addMessage('info', `Started interaction with NPC: ${npcId}`)
              break
            }
            case 'end': {
              actions.endNPCInteraction(npcId)
              addMessage('info', `Ended interaction with NPC: ${npcId}`)
              break
            }
            case 'dialogue': {
              actions.processNPCDialogue(npcId, data?.choiceIndex || 0, data)
              addMessage('info', `Processed dialogue choice for NPC: ${npcId}`)
              break
            }
            default: {
              addMessage('info', `Unknown NPC action: ${npcAction}`)
            }
          }

          actions.saveGame(activeSlotState)
          break
        }

        case 'triggerAnimation': {
          // Handle animation triggers
          const { type, data } = parameters as { type: string; data: any }
          actions.triggerAnimation(type as any, data)
          break
        }

        case 'completeAnimation': {
          // Handle animation completion
          const { type } = parameters as { type: string }
          actions.completeAnimation(type)
          break
        }

        case 'updateReputation': {
          // Handle reputation changes
          const reputationChange = parameters as any
          actions.updateReputation(reputationChange)
          addMessage('info', 'Reputation updated')
          actions.saveGame(activeSlotState)
          break
        }

        case 'recordTransaction': {
          // Handle market transaction recording
          const { location, potionType, quantity, pricePerUnit, day } = parameters as any
          actions.recordTransaction(location, potionType, quantity, pricePerUnit, day)
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
      // Capture choice info before action dispatch
      const currentStep = gameState.currentStep ?? 0
      const currentEvent = gameState.currentEvent
      const step = currentEvent?.steps[currentStep]
      const selectedChoice = step?.choices[choiceIndex]
      const eventType = currentEvent?.type

      // Determine message type based on event type
      let messageType: 'random_event' | 'info' | 'error' = 'random_event'
      if (eventType === 'negative') {
        messageType = 'error' // Red for negative events
      } else if (eventType === 'positive') {
        messageType = 'random_event' // Magenta for positive events
      } else {
        messageType = 'random_event' // Magenta for neutral events
      }

      // Log the choice made
      if (selectedChoice) {
        addMessage(messageType, `You chose: ${selectedChoice.text}`)
      }

      // Apply the choice effect and get the result
      const result = actions.handleEventChoice(choiceIndex)

      // Log outcome message if the choice effect provided one
      if (result.message) {
        addMessage(messageType, result.message)
      }

      // Log completion message if event ended
      if (result.isLastStep && result.eventName) {
        addMessage('info', `${result.eventName} concluded.`)
      }

      actions.saveGame(activeSlotState)
    },
    [actions, activeSlotState, addMessage, gameState]
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
