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
import {
    type ActiveCombat,
    type CombatAction,
    type Enemy,
} from '../types/combat.types.js'
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
import { EnhancedEconomyManager } from '../core/game/enhancedEconomy.js'
import { triggerRandomEvent } from '../core/events/index.js'
import { checkNPCEncounter } from '../core/game/travel.js'
import { calculateDamage } from '../core/combat/actions.js'
import { generateEnemy } from '../core/combat/enemies.js'
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

  // === Combat State ===
  combat: {
    active: ActiveCombat | undefined
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

  // Combat actions
  startCombat: (enemy: Enemy) => void
  performCombatAction: (action: CombatAction, potionName?: string) => void
  endCombat: () => void

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
  combat: {
    active: undefined,
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
            const queuedEvent: QueuedEvent = {
              event: eventResult.currentEvent,
              priority: 1,
              triggeredOnDay: state.game.day,
            }
            state.events.queue.push(queuedEvent)
            state.events.queue.sort(
              (a: QueuedEvent, b: QueuedEvent) => b.priority - a.priority
            )
          }

          // 4b. Check for combat encounter based on location danger
          if (Math.random() < state.game.location.dangerLevel / 20) {
            const playerLevel = Math.floor(
              (state.game.strength + state.game.agility + state.game.intelligence) / 3,
            )
            const enemy = generateEnemy(playerLevel)
            state.combat.active = {
              enemy,
              enemyMaxHealth: enemy.health,
              round: 1,
              phase: 'player_turn',
              log: [`You've encountered a ${enemy.name}!`],
              defendingThisRound: false,
            }
            state.messages.push({
              type: 'combat',
              content: `A ${enemy.name} blocks your path!`,
              timestamp: Date.now(),
            })
          }

          // 4c. Check for NPC encounter at new location
          const npcEncounter = checkNPCEncounter(state.game)
          if (npcEncounter) {
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
          }

          // 4d. Randomize weather
          const weatherOptions: Weather[] = ['sunny', 'rainy', 'stormy', 'windy', 'foggy']
          const weatherRoll = Math.random()
          if (weatherRoll < 0.3) {
            state.game.weather = weatherOptions[Math.floor(Math.random() * weatherOptions.length)]!
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
          if (state.events.queue.length > 0 && !state.events.current) {
            const nextEvent = state.events.queue.shift()
            if (nextEvent) {
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
          // If already showing an event, don't process queue
          if (state.events.current) return

          // Pop next event from queue
          const nextEvent = state.events.queue.shift()
          if (!nextEvent) return

          // Check if multi-step event
          if ('steps' in nextEvent.event) {
            // Multi-step event: set as current
            state.events.current = nextEvent.event
            state.events.phase = 'choice'
            state.events.currentStep = 0

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
        // CRITICAL: This get() call MUST happen before set() to ensure proper state
        // synchronization through the subscribeWithSelector + devtools + immer middleware stack.
        // Without it, set() followed by get() can return stale state.
        get().events.phase

        set((state) => {
          const { current, currentStep } = state.events

          if (!current || !('steps' in current)) {
            return
          }

          const step = current.steps[currentStep]
          if (!step) {
            return
          }

          const choice = step.choices[choiceIndex]
          if (!choice) {
            return
          }

          // Apply choice effect
          const newGameState = choice.effect(state.game)
          Object.assign(state.game, newGameState)

          // Check if this was the last step
          const isLastStep = currentStep >= current.steps.length - 1

          if (isLastStep) {
            state.events.phase = 'outcome'
            state.messages.push({
              type: current.type === 'negative' ? 'error' : 'random_event',
              content: `You chose: ${choice.text}`,
              timestamp: Date.now(),
            })
          } else {
            state.events.currentStep += 1
            state.messages.push({
              type: 'info',
              content: `You chose: ${choice.text}`,
              timestamp: Date.now(),
            })
          }
        })
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
        })

        // Process next event in queue after clearing current event
        get().processEventQueue()

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
        set((state) => {
          state.npc.current = undefined
        })

        // Auto-save after NPC interaction ends
        const activeSlot = get().persistence.activeSlot
        if (activeSlot > 0) {
          get().saveGame(activeSlot)
        }
      },

      // === Combat Actions ===

      startCombat(enemy: Enemy) {
        set((state) => {
          state.combat.active = {
            enemy: { ...enemy },
            enemyMaxHealth: enemy.health,
            round: 1,
            phase: 'player_turn',
            log: [`You've encountered a ${enemy.name}!`],
            defendingThisRound: false,
          }
        })
      },

      performCombatAction(action: CombatAction, potionName?: string) {
        set((state) => {
          const combat = state.combat.active
          if (!combat || combat.phase === 'resolved') return

          const { enemy } = combat
          const player = state.game

          // Player turn
          switch (action) {
            case 'attack': {
              const damage = calculateDamage(player, enemy)
              enemy.health -= damage
              combat.log.push(
                damage > 0
                  ? `Round ${combat.round}: You attack for ${damage} damage.`
                  : `Round ${combat.round}: You swing and miss!`,
              )
              combat.defendingThisRound = false
              break
            }

            case 'defend': {
              combat.defendingThisRound = true
              combat.log.push(
                `Round ${combat.round}: You take a defensive stance.`,
              )
              break
            }

            case 'use_potion': {
              if (potionName && player.inventory[potionName] && player.inventory[potionName] > 0) {
                player.inventory[potionName] -= 1
                if (potionName.toLowerCase().includes('health') || potionName.toLowerCase().includes('strength')) {
                  const heal = 25
                  player.health = Math.min(100, player.health + heal)
                  combat.log.push(
                    `Round ${combat.round}: You drink ${potionName} and restore ${heal} HP.`,
                  )
                } else {
                  player.strength += 3
                  combat.log.push(
                    `Round ${combat.round}: You drink ${potionName} and feel empowered! (+3 STR)`,
                  )
                }
              } else {
                combat.log.push(
                  `Round ${combat.round}: You fumble for a potion but find nothing useful!`,
                )
              }

              combat.defendingThisRound = false
              break
            }

            case 'flee': {
              const fleeChance = 0.4 + player.agility * 0.02
              if (Math.random() < fleeChance) {
                combat.log.push(`Round ${combat.round}: You flee from the ${enemy.name}!`)
                combat.phase = 'resolved'
                return
              }

              combat.log.push(
                `Round ${combat.round}: You try to flee but the ${enemy.name} blocks your escape!`,
              )
              combat.defendingThisRound = false
              break
            }
          }

          // Check if enemy is defeated
          if (enemy.health <= 0) {
            const goldGained = Math.floor(Math.random() * 100) + 50
            player.cash += goldGained
            combat.log.push(
              `You defeated the ${enemy.name}! Gained ${goldGained} gold.`,
            )
            combat.phase = 'resolved'
            return
          }

          // Enemy turn
          const defendBonus = combat.defendingThisRound ? Math.floor(player.agility * 0.5) : 0
          const effectiveAgility = player.agility + defendBonus
          const enemyDamage = calculateDamage(enemy, { agility: effectiveAgility })
          player.health -= enemyDamage
          combat.log.push(
            enemyDamage > 0
              ? `${enemy.name} attacks for ${enemyDamage} damage${combat.defendingThisRound ? ' (reduced by defense)' : ''}.`
              : `${enemy.name} attacks but misses!`,
          )

          // Check if player is defeated
          if (player.health <= 0) {
            const cashLost = Math.floor(player.cash * 0.2)
            player.cash -= cashLost
            for (const [potion, quantity] of Object.entries(player.inventory)) {
              player.inventory[potion] = quantity - Math.floor(quantity * 0.3)
            }

            combat.log.push(
              `You were defeated! Lost ${cashLost} gold and some potions.`,
            )
            combat.phase = 'resolved'
            return
          }

          // Max 10 rounds
          if (combat.round >= 10) {
            combat.log.push('The battle drags on... you both withdraw.')
            combat.phase = 'resolved'
            return
          }

          combat.round += 1
          combat.phase = 'player_turn'
        })
      },

      endCombat() {
        set((state) => {
          state.combat.active = undefined
        })

        // Auto-save after combat
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

          // Initialize enhanced market data for all locations
          state.game.marketData = EnhancedEconomyManager.initializeMarketData()

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

        try {
          saveToDisk(state.game, slot)
          setActiveSlot(slot)

          set((state) => {
            state.messages.push({
              type: 'info',
              content: `Game saved to slot ${slot}`,
              timestamp: Date.now(),
            })
          })
        } catch (error) {
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
