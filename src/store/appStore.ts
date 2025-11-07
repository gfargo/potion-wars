import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { type Location } from '../types/game.types.js'
import { type MultiStepEvent, type Event } from '../types/events.types.js'
import { type Weather } from '../types/weather.types.js'
import {
  type ReputationState,
  type ReputationChange,
} from '../types/reputation.types.js'
import {
  type LocationMarketState,
  type TradeTransaction,
} from '../types/economy.types.js'
import { potions, locations } from '../constants.js'

// Message types
export type MessageType =
  | 'combat'
  | 'sale'
  | 'purchase'
  | 'random_event'
  | 'info'
  | 'error'

import { generateDynamicPrices } from '../core/game/economy.js'
import { triggerRandomEvent } from '../core/events/index.js'
import { checkNPCEncounter } from '../core/game/travel.js'
import {
  saveGame as saveToDisk,
  loadGame as loadFromDisk,
} from '../core/persistence/saveLoad.js'
import { setActiveSlot, getActiveSlot } from '../core/persistence/activeSlot.js'

// Screen types
export type Screen =
  | 'title'
  | 'loading'
  | 'game'
  | 'traveling'
  | 'event'
  | 'game-over'

// Event queue types
export type QueuedEvent = {
  event: MultiStepEvent | Event
  priority: number
  triggeredOnDay: number
}

export type EventPhase = 'choice' | 'outcome' | 'acknowledged'
export type TravelPhase = 'idle' | 'animating' | 'processing' | 'complete'

// NPC types
export type NPCInteractionState = {
  npcId: string
  type: 'dialogue' | 'trade' | 'information'
  active: boolean
}

// Message type
export type Message = {
  type: MessageType
  content: string
  timestamp: number
}

// Combined App State
export type AppState = {
  // === Game State ===
  game: {
    day: number
    cash: number
    debt: number
    health: number
    strength: number
    agility: number
    intelligence: number
    location: Location
    inventory: Record<string, number>
    prices: Record<string, number>
    weather: Weather
    reputation: ReputationState
    marketData: LocationMarketState
    tradeHistory: TradeTransaction[]
    playerName?: string
    lastSave?: string
  }

  // === UI State ===
  ui: {
    activeScreen: Screen
    showHelp: boolean
    quitConfirmation: boolean
    combatResult?: string
  }

  // === Persistence State ===
  persistence: {
    activeSlot: number // 0 = no active slot, 1-5 = slot number
  }

  // === Event State ===
  events: {
    queue: QueuedEvent[]
    current: MultiStepEvent | Event | undefined
    phase: EventPhase
    currentStep: number
  }

  // === Travel State ===
  travel: {
    phase: TravelPhase
    destination: string | undefined
    origin: string | undefined
    animationStartTime: number | undefined
  }

  // === NPC State ===
  npc: {
    current: NPCInteractionState | undefined
  }

  // === Messages ===
  messages: Message[]
}

// Store interface with actions
export type AppStore = AppState & {
  // Game actions
  brewPotion: (potionName: string, quantity: number) => void
  sellPotion: (potionName: string, quantity: number) => void
  startTravel: (destination: string) => void
  completeTravel: () => void
  advanceDay: (triggerEvent?: boolean, triggerDebt?: boolean) => void
  repayDebt: (amount: number) => void
  updateWeather: (weather: Weather) => void

  // Event actions
  triggerEvent: (event: MultiStepEvent | Event, priority?: number) => void
  chooseEvent: (choiceIndex: number) => void
  acknowledgeEvent: () => void
  processEventQueue: () => void

  // UI actions
  setScreen: (screen: Screen) => void
  toggleHelp: () => void
  setQuitConfirmation: (value: boolean) => void
  setCombatResult: (result: string | undefined) => void

  // Travel actions
  setTravelDestination: (destination: string) => void
  resetTravelState: () => void

  // NPC actions
  searchForNPCs: () => void
  startNPCInteraction: (
    npcId: string,
    interactionType: 'dialogue' | 'trade' | 'information'
  ) => void
  endNPCInteraction: () => void

  // Message actions
  addMessage: (type: MessageType, content: string) => void
  clearMessages: () => void

  // Reputation actions
  updateReputation: (change: ReputationChange) => void

  // Market actions
  recordTransaction: (transaction: Omit<TradeTransaction, 'day'>) => void

  // Persistence actions
  initializeGame: (playerName?: string, slot?: number) => void
  resetGame: () => void
  saveGame: (slot: number) => void
  loadGame: (slot: number) => boolean
}

// Initial state factory
const createInitialState = (): AppState => ({
  game: {
    day: 0,
    cash: 2000,
    debt: 5000,
    health: 100,
    strength: 10,
    agility: 10,
    intelligence: 10,
    location: locations[0]!,
    inventory: {},
    prices: {},
    weather: 'sunny',
    reputation: {
      global: 0,
      locations: {},
      npcRelationships: {},
    },
    marketData: {},
    tradeHistory: [],
    playerName: undefined,
    lastSave: undefined,
  },
  ui: {
    activeScreen: 'title',
    showHelp: false,
    quitConfirmation: false,
    combatResult: undefined,
  },
  persistence: {
    activeSlot: getActiveSlot() || 0, // Load from disk on initialization
  },
  events: {
    queue: [],
    current: undefined,
    phase: 'choice',
    currentStep: 0,
  },
  travel: {
    phase: 'idle',
    destination: undefined,
    origin: undefined,
    animationStartTime: undefined,
  },
  npc: {
    current: undefined,
  },
  messages: [],
})

// Create store with Zustand
export const useStore = create<AppStore>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => ({
      ...createInitialState(),

      // === Game Actions ===

      brewPotion(potionName: string, quantity: number) {
        set((state) => {
          const potion = potions.find((p) => p.name === potionName)
          if (!potion) {
            state.messages.push({
              type: 'error',
              content: `Unknown potion: ${potionName}`,
              timestamp: Date.now(),
            })
            return
          }

          const cost = (state.game.prices[potionName] || 0) * quantity
          if (state.game.cash < cost) {
            state.messages.push({
              type: 'error',
              content: `Not enough gold to brew ${quantity} ${potionName}`,
              timestamp: Date.now(),
            })
            return
          }

          // Update game state
          state.game.cash -= cost
          state.game.inventory[potionName] =
            (state.game.inventory[potionName] || 0) + quantity

          // Add message
          state.messages.push({
            type: 'purchase',
            content: `Brewed ${quantity} ${potionName} for ${cost}g`,
            timestamp: Date.now(),
          })
        })

        // Auto-save after brewing
        const activeSlot = get().persistence.activeSlot
        if (activeSlot > 0) {
          get().saveGame(activeSlot)
        }
      },

      sellPotion(potionName: string, quantity: number) {
        set((state) => {
          const currentInventory = state.game.inventory[potionName] || 0
          if (currentInventory < quantity) {
            state.messages.push({
              type: 'error',
              content: `Not enough ${potionName} in inventory`,
              timestamp: Date.now(),
            })
            return
          }

          const pricePerUnit = state.game.prices[potionName] || 0
          const revenue = pricePerUnit * quantity

          // Update game state
          state.game.cash += revenue
          state.game.inventory[potionName] = currentInventory - quantity

          // Record transaction
          const transaction: TradeTransaction = {
            day: state.game.day,
            location: state.game.location.name,
            potionType: potionName,
            quantity,
            pricePerUnit,
            totalValue: revenue,
            type: 'sell',
          }
          state.game.tradeHistory.push(transaction)

          // Add message
          state.messages.push({
            type: 'sale',
            content: `Sold ${quantity} ${potionName} for ${revenue}g`,
            timestamp: Date.now(),
          })
        })

        // Auto-save after selling
        const activeSlot = get().persistence.activeSlot
        if (activeSlot > 0) {
          get().saveGame(activeSlot)
        }
      },

      repayDebt(amount: number) {
        set((state) => {
          if (state.game.cash < amount) {
            state.messages.push({
              type: 'error',
              content: 'Not enough gold to repay that amount',
              timestamp: Date.now(),
            })
            return
          }

          const actualAmount = Math.min(amount, state.game.debt)
          state.game.cash -= actualAmount
          state.game.debt -= actualAmount

          state.messages.push({
            type: 'info',
            content: `Repaid ${actualAmount}g of debt`,
            timestamp: Date.now(),
          })
        })
      },

      startTravel(destination: string) {
        set((state) => {
          const targetLocation = locations.find((l) => l.name === destination)
          if (!targetLocation) {
            state.messages.push({
              type: 'error',
              content: `Unknown destination: ${destination}`,
              timestamp: Date.now(),
            })
            return
          }

          state.travel = {
            phase: 'animating',
            destination,
            origin: state.game.location.name,
            animationStartTime: Date.now(),
          }
          state.ui.activeScreen = 'traveling'
        })
      },

      completeTravel() {
        set((state) => {
          const { destination } = state.travel

          if (!destination || state.travel.phase !== 'animating') {
            return
          }

          const origin = state.game.location.name

          // 1. Update location
          const newLocation = locations.find((l) => l.name === destination)
          if (!newLocation) return

          state.game.location = newLocation
          state.travel.phase = 'processing'

          // 2. Regenerate prices (synchronous!)
          state.game.prices = generateDynamicPrices(state.game)

          // 3. Advance day (inline, synchronous)
          state.game.day += 1

          // Apply debt interest
          state.game.debt = Math.floor(state.game.debt * 1.1)

          // 4. Trigger event check and add to queue inline
          const eventResult = triggerRandomEvent(state.game)
          if (eventResult.currentEvent) {
            console.log('[Travel] Event triggered:', eventResult.currentEvent.name)

            // Add event to queue inline (don't use get().triggerEvent() - nested set() issue)
            const queuedEvent: QueuedEvent = {
              event: eventResult.currentEvent,
              priority: 1,
              triggeredOnDay: state.game.day,
            }
            state.events.queue.push(queuedEvent)
            // Sort by priority (higher first)
            state.events.queue.sort(
              (a: QueuedEvent, b: QueuedEvent) => b.priority - a.priority
            )
            console.log('[Travel] Added event to queue, new length:', state.events.queue.length)
          } else {
            console.log('[Travel] No event triggered')
          }

          // 5. Complete travel
          state.travel = {
            phase: 'complete',
            destination: undefined,
            origin: undefined,
            animationStartTime: undefined,
          }

          // 6. Add message
          state.messages.push({
            type: 'info',
            content: `Traveled from ${origin} to ${destination}`,
            timestamp: Date.now(),
          })

          // 7. Process event queue inline (before setting screen)
          console.log('[CompleteTravel] Processing queue inline, length:', state.events.queue.length)
          if (state.events.queue.length > 0 && !state.events.current) {
            const nextEvent = state.events.queue.shift()
            if (nextEvent) {
              console.log('[CompleteTravel] Setting event as current:', nextEvent.event.name)

              if ('steps' in nextEvent.event) {
                // Multi-step event: set as current
                state.events.current = nextEvent.event
                state.events.phase = 'choice'
                state.events.currentStep = 0

                state.messages.push({
                  type: nextEvent.event.type === 'negative' ? 'error' : 'random_event',
                  content: `${nextEvent.event.name}: ${nextEvent.event.description}`,
                  timestamp: Date.now(),
                })
              } else {
                // Single-step event: apply immediately
                const newGameState = nextEvent.event.effect(state.game)
                Object.assign(state.game, newGameState)

                state.messages.push({
                  type: nextEvent.event.type === 'negative' ? 'error' : 'random_event',
                  content: `${nextEvent.event.name}: ${nextEvent.event.description}`,
                  timestamp: Date.now(),
                })
              }
            }
          }

          // 8. Update screen to game (event screen will override if event was set)
          state.ui.activeScreen = 'game'
        })

        // Auto-save after travel
        const activeSlot = get().persistence.activeSlot
        if (activeSlot > 0) {
          get().saveGame(activeSlot)
        }
      },

      advanceDay(triggerEvent = false, triggerDebt = false) {
        set((state) => {
          state.game.day += 1

          if (triggerDebt) {
            state.game.debt = Math.floor(state.game.debt * 1.1)
          }

          state.messages.push({
            type: 'info',
            content: `Day ${state.game.day} begins...`,
            timestamp: Date.now(),
          })

          if (triggerEvent) {
            const eventResult = triggerRandomEvent(state.game)
            if (eventResult.currentEvent) {
              get().triggerEvent(eventResult.currentEvent, 1)
            }
          }
        })
      },

      updateWeather(weather: Weather) {
        set((state) => {
          state.game.weather = weather
        })
      },

      // === Event Actions ===

      triggerEvent(event: MultiStepEvent | Event, priority = 0) {
        set((state) => {
          const queuedEvent: QueuedEvent = {
            event,
            priority,
            triggeredOnDay: state.game.day,
          }

          state.events.queue.push(queuedEvent)
          // Sort by priority (higher first)
          state.events.queue.sort(
            (a: QueuedEvent, b: QueuedEvent) => b.priority - a.priority
          )
        })
      },

      processEventQueue() {
        set((state) => {
          console.log('[ProcessQueue] Current event:', state.events.current?.name || 'none')
          console.log('[ProcessQueue] Queue length:', state.events.queue.length)

          // If already showing an event, don't process queue
          if (state.events.current) return

          // Pop next event from queue
          const nextEvent = state.events.queue.shift()
          if (!nextEvent) return

          console.log('[ProcessQueue] Processing event:', nextEvent.event.name)

          // Check if multi-step event
          if ('steps' in nextEvent.event) {
            // Multi-step event: set as current
            state.events.current = nextEvent.event
            state.events.phase = 'choice'
            state.events.currentStep = 0

            console.log('[ProcessQueue] Set multi-step event as current')

            state.messages.push({
              type:
                nextEvent.event.type === 'negative' ? 'error' : 'random_event',
              content: `${nextEvent.event.name}: ${nextEvent.event.description}`,
              timestamp: Date.now(),
            })
          } else {
            // Single-step event: apply immediately
            const newGameState = nextEvent.event.effect(state.game)
            Object.assign(state.game, newGameState)

            state.messages.push({
              type:
                nextEvent.event.type === 'negative' ? 'error' : 'random_event',
              content: `${nextEvent.event.name}: ${nextEvent.event.description}`,
              timestamp: Date.now(),
            })
          }
        })
      },

      chooseEvent(choiceIndex: number) {
        console.error('[Store] chooseEvent called with index:', choiceIndex)
        console.error('[Store] BEFORE set() - phase:', get().events.phase)

        set((state) => {
          const { current, currentStep } = state.events

          if (!current || !('steps' in current)) {
            console.error('[Store] Early return: no current event or not multi-step')
            return
          }

          const step = current.steps[currentStep]
          if (!step) {
            console.error('[Store] Early return: no step at index', currentStep)
            return
          }

          const choice = step.choices[choiceIndex]
          if (!choice) {
            console.error('[Store] Early return: no choice at index', choiceIndex)
            return
          }

          console.error('[Store] Inside set() draft callback - applying choice')

          // Apply choice effect
          const newGameState = choice.effect(state.game)
          Object.assign(state.game, newGameState)

          // Check if this was the last step
          const isLastStep = currentStep >= current.steps.length - 1
          console.error('[Store] isLastStep:', isLastStep, 'currentStep:', currentStep, 'totalSteps:', current.steps.length)

          if (isLastStep) {
            // Move to outcome phase
            console.error('[Store] Setting phase to outcome')
            state.events.phase = 'outcome'
            state.messages.push({
              type: current.type === 'negative' ? 'error' : 'random_event',
              content: `You chose: ${choice.text}`,
              timestamp: Date.now(),
            })
          } else {
            // Move to next step
            console.error('[Store] Moving to next step')
            state.events.currentStep += 1
            state.messages.push({
              type: 'info',
              content: `You chose: ${choice.text}`,
              timestamp: Date.now(),
            })
          }
        })

        console.error('[Store] AFTER set() - phase:', get().events.phase)
      },

      acknowledgeEvent() {
        set((state) => {
          const eventName = state.events.current?.name

          // Clear event
          state.events.current = undefined
          state.events.phase = 'choice'
          state.events.currentStep = 0

          if (eventName) {
            state.messages.push({
              type: 'info',
              content: `${eventName} concluded.`,
              timestamp: Date.now(),
            })
          }

          // Process next event in queue if any
          get().processEventQueue()
        })

        // Auto-save after event completes
        const activeSlot = get().persistence.activeSlot
        if (activeSlot > 0) {
          get().saveGame(activeSlot)
        }
      },

      // === UI Actions ===

      setScreen(screen: Screen) {
        set((state) => {
          state.ui.activeScreen = screen
        })
      },

      toggleHelp() {
        set((state) => {
          state.ui.showHelp = !state.ui.showHelp
        })
      },

      setQuitConfirmation(value: boolean) {
        set((state) => {
          state.ui.quitConfirmation = value
        })
      },

      setCombatResult(result: string | undefined) {
        set((state) => {
          state.ui.combatResult = result
        })
      },

      // === Travel Actions ===

      setTravelDestination(destination: string) {
        get().startTravel(destination)
      },

      resetTravelState() {
        set((state) => {
          state.travel = {
            phase: 'idle',
            destination: undefined,
            origin: undefined,
            animationStartTime: undefined,
          }
        })
      },

      // === NPC Actions ===

      searchForNPCs() {
        set((state) => {
          const npcEncounter = checkNPCEncounter(state.game)

          if (npcEncounter) {
            // Start interaction with the encountered NPC
            state.npc.current = {
              npcId: npcEncounter.id,
              type: 'dialogue',
              active: true,
            }

            state.messages.push({
              type: 'info',
              content: `You encounter ${npcEncounter.name}!`,
              timestamp: Date.now(),
            })
          } else {
            state.messages.push({
              type: 'info',
              content: 'No NPCs found in this area.',
              timestamp: Date.now(),
            })
          }
        })
      },

      startNPCInteraction(
        npcId: string,
        interactionType: 'dialogue' | 'trade' | 'information'
      ) {
        set((state) => {
          state.npc.current = {
            npcId,
            type: interactionType,
            active: true,
          }
        })
      },

      endNPCInteraction() {
        console.error('[Store] endNPCInteraction called')
        set((state) => {
          state.npc.current = undefined
          console.error('[Store] NPC interaction cleared, current:', state.npc.current)
        })

        // Auto-save after NPC interaction ends
        const activeSlot = get().persistence.activeSlot
        if (activeSlot > 0) {
          get().saveGame(activeSlot)
        }
      },

      // === Message Actions ===

      addMessage(type: MessageType, content: string) {
        set((state) => {
          state.messages.push({
            type,
            content,
            timestamp: Date.now(),
          })
        })
      },

      clearMessages() {
        set((state) => {
          state.messages = []
        })
      },

      // === Reputation Actions ===

      updateReputation(change: ReputationChange) {
        set((state) => {
          if (change.global !== undefined) {
            state.game.reputation.global += change.global
          }

          if (change.location && change.locationChange !== undefined) {
            const currentLocationRep =
              state.game.reputation.locations[change.location] || 0
            state.game.reputation.locations[change.location] =
              currentLocationRep + change.locationChange
          }

          if (change.npc && change.npcChange !== undefined) {
            const currentNpcRep =
              state.game.reputation.npcRelationships[change.npc] || 0
            state.game.reputation.npcRelationships[change.npc] =
              currentNpcRep + change.npcChange
          }

          if (change.reason) {
            state.messages.push({
              type: 'info',
              content: `Reputation changed: ${change.reason}`,
              timestamp: Date.now(),
            })
          }
        })
      },

      // === Market Actions ===

      recordTransaction(transaction: Omit<TradeTransaction, 'day'>) {
        set((state) => {
          state.game.tradeHistory.push({
            ...transaction,
            day: state.game.day,
          })
        })
      },

      // === Persistence Actions ===

      initializeGame(playerName?: string, slot?: number) {
        set((state) => {
          // Reset to initial state
          const initial = createInitialState()
          Object.assign(state, initial)

          // Set player name if provided
          if (playerName) {
            state.game.playerName = playerName
          }

          // Set active slot if provided
          if (slot) {
            state.persistence.activeSlot = slot
            setActiveSlot(slot)
          }

          // Generate initial prices
          state.game.prices = generateDynamicPrices(state.game)

          // Set screen to loading, then game
          state.ui.activeScreen = 'loading'

          state.messages.push({
            type: 'info',
            content: `Welcome, ${
              playerName || 'Alchemist'
            }! Your journey begins...`,
            timestamp: Date.now(),
          })
        })

        // Auto-save after initializing (if slot was provided)
        if (slot) {
          get().saveGame(slot)
        }
      },

      resetGame() {
        set((state) => {
          const initial = createInitialState()
          Object.assign(state, initial)
        })
      },

      saveGame(slot: number) {
        const state = get()
        console.log('[SaveGame] Attempting to save to slot', slot)
        console.log('[SaveGame] Game state:', {
          day: state.game.day,
          cash: state.game.cash,
          location: state.game.location.name,
        })

        try {
          saveToDisk(state.game, slot)
          setActiveSlot(slot)
          console.log('[SaveGame] Save successful')

          set((state) => {
            state.messages.push({
              type: 'info',
              content: `Game saved to slot ${slot}`,
              timestamp: Date.now(),
            })
          })
        } catch (error) {
          console.error('[SaveGame] Save failed:', error)
          set((state) => {
            state.messages.push({
              type: 'error',
              content: `Failed to save game: ${error}`,
              timestamp: Date.now(),
            })
          })
        }
      },

      loadGame(slot: number) {
        const loadedState = loadFromDisk(slot)

        if (!loadedState) {
          set((state) => {
            state.messages.push({
              type: 'error',
              content: `Failed to load game from slot ${slot}`,
              timestamp: Date.now(),
            })
          })
          return false
        }

        set((state) => {
          // Update game state with loaded data
          state.game = {
            ...state.game,
            ...loadedState,
          }

          // Set active slot in both store and disk
          state.persistence.activeSlot = slot
          setActiveSlot(slot)

          // Generate fresh prices for current location
          state.game.prices = generateDynamicPrices(state.game)

          // Clear any active events/interactions
          state.events.current = undefined
          state.events.phase = 'choice'
          state.events.currentStep = 0
          state.npc.current = undefined

          // Set screen to game
          state.ui.activeScreen = 'game'

          state.messages.push({
            type: 'info',
            content: `Game loaded from slot ${slot}`,
            timestamp: Date.now(),
          })
        })

        return true
      },
    })),
      { name: 'PotionWars' }
    )
  )
)
