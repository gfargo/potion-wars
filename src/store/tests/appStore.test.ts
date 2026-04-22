import test from 'ava'
import { useStore } from '../appStore.js'
import { type MultiStepEvent, type Event } from '../../types/events.types.js'

// Helper to set state for testing
const setState = useStore.setState.bind(useStore)
const getState = () => useStore.getState()

// Reset store before each test
test.beforeEach(() => {
  getState().resetGame()
  getState().initializeGame('TestPlayer')
  // Clear events and side effects from initializeGame
  setState((state) => {
    state.events.queue = []
    state.events.current = undefined
    state.events.phase = 'choice'
    state.events.currentStep = 0
    state.npc.current = undefined
    state.persistence.activeSlot = 0
  })
})

// ==========================================
// Game Action Tests
// ==========================================

test('brewPotion: updates inventory and decreases cash', (t) => {
  // Set initial prices
  setState((state) => {
    state.game.prices['Wisdom Draught'] = 50
  })

  const initialCash = getState().game.cash

  // Brew 5 potions
  getState().brewPotion('Wisdom Draught', 5)

  // Get fresh state
  const after = getState()

  // Verify inventory updated
  t.is(after.game.inventory['Wisdom Draught'], 5)

  // Verify cash decreased
  t.is(after.game.cash, initialCash - 250)

  // Verify message added
  t.true(
    after.messages.some((m) => m.content.includes('Brewed 5 Wisdom Draught'))
  )
})

test('brewPotion: fails with insufficient funds', (t) => {
  // Set high price
  setState((state) => {
    state.game.prices['Elixir of Immortality'] = 999_999
  })

  const initialCash = getState().game.cash

  // Try to brew
  getState().brewPotion('Elixir of Immortality', 1)

  const after = getState()

  // Verify inventory not updated
  t.is(after.game.inventory['Elixir of Immortality'], undefined)

  // Verify cash unchanged
  t.is(after.game.cash, initialCash)

  // Verify error message added
  t.true(
    after.messages.some(
      (m) => m.type === 'error' && m.content.includes('Not enough gold')
    )
  )
})

test('sellPotion: increases cash and decreases inventory', (t) => {
  // Set initial state
  setState((state) => {
    state.game.inventory['Wisdom Draught'] = 10
    state.game.prices['Wisdom Draught'] = 50
  })

  const initialCash = getState().game.cash

  // Sell 5 potions
  getState().sellPotion('Wisdom Draught', 5)

  const after = getState()

  // Verify inventory decreased
  t.is(after.game.inventory['Wisdom Draught'], 5)

  // Verify cash increased
  t.is(after.game.cash, initialCash + 250)

  // Verify transaction recorded
  t.is(after.game.tradeHistory.length, 1)
  t.is(after.game.tradeHistory[0]!.type, 'sell')
  t.is(after.game.tradeHistory[0]!.quantity, 5)
})

test('sellPotion: fails with insufficient inventory', (t) => {
  // Set initial state
  setState((state) => {
    state.game.inventory['Wisdom Draught'] = 2
  })

  const initialCash = getState().game.cash

  // Try to sell more than available
  getState().sellPotion('Wisdom Draught', 5)

  const after = getState()

  // Verify inventory unchanged
  t.is(after.game.inventory['Wisdom Draught'], 2)

  // Verify cash unchanged
  t.is(after.game.cash, initialCash)

  // Verify error message
  t.true(
    after.messages.some(
      (m) => m.type === 'error' && m.content.includes('Not enough')
    )
  )
})

test('repayDebt: decreases both debt and cash', (t) => {
  const initialDebt = getState().game.debt
  const initialCash = getState().game.cash
  const repayAmount = 500

  // Repay debt
  getState().repayDebt(repayAmount)

  const after = getState()

  // Verify debt decreased
  t.is(after.game.debt, initialDebt - repayAmount)

  // Verify cash decreased
  t.is(after.game.cash, initialCash - repayAmount)
})

test('repayDebt: cannot repay more than cash available', (t) => {
  const initialDebt = getState().game.debt
  const initialCash = getState().game.cash
  const excessiveAmount = initialCash + 1000

  // Try to repay more than available
  getState().repayDebt(excessiveAmount)

  const after = getState()

  // Verify debt unchanged
  t.is(after.game.debt, initialDebt)

  // Verify cash unchanged
  t.is(after.game.cash, initialCash)

  // Verify error message
  t.true(after.messages.some((m) => m.type === 'error'))
})

test('advanceDay: increments day and applies debt interest', (t) => {
  const initialDay = getState().game.day
  const initialDebt = getState().game.debt

  // Advance day with debt trigger
  getState().advanceDay(false, true)

  const after = getState()

  // Verify day incremented
  t.is(after.game.day, initialDay + 1)

  // Verify debt interest applied (10%)
  t.is(after.game.debt, Math.floor(initialDebt * 1.1))
})

// ==========================================
// Event System Tests
// ==========================================

test('triggerEvent: adds event to queue', (t) => {
  // Clear any pre-existing events
  setState((state) => {
    state.events.queue = []
    state.events.current = undefined
  })

  const mockEvent: MultiStepEvent = {
    name: 'Test Event',
    description: 'A test event',
    steps: [
      {
        description: 'Test step',
        choices: [
          {
            text: 'Choice 1',
            effect: (state) => state,
          },
        ],
      },
    ],
    probability: 1,
    type: 'neutral',
  }

  // Trigger event
  getState().triggerEvent(mockEvent, 5)

  const after = getState()

  // Verify event added to queue
  t.is(after.events.queue.length, 1)
  t.is(after.events.queue[0]!.event.name, 'Test Event')
  t.is(after.events.queue[0]!.priority, 5)
})

test('processEventQueue: processes multi-step event', (t) => {
  // Clear any pre-existing events
  setState((state) => {
    state.events.queue = []
    state.events.current = undefined
  })

  const mockEvent: MultiStepEvent = {
    name: 'Test Multi-Step',
    description: 'A multi-step test event',
    steps: [
      {
        description: 'Step 1',
        choices: [
          {
            text: 'Option A',
            effect: (state) => state,
          },
        ],
      },
    ],
    probability: 1,
    type: 'positive',
  }

  // Add to queue and process
  getState().triggerEvent(mockEvent, 1)
  getState().processEventQueue()

  const after = getState()

  // Verify event is now current
  t.is(after.events.current?.name, 'Test Multi-Step')
  t.is(after.events.phase, 'choice')
  t.is(after.events.currentStep, 0)

  // Verify queue is empty
  t.is(after.events.queue.length, 0)
})

test('processEventQueue: processes single-step event immediately', (t) => {
  // Clear any pre-existing events
  setState((state) => {
    state.events.queue = []
    state.events.current = undefined
  })

  let effectApplied = false

  const mockEvent: Event = {
    name: 'Test Single-Step',
    description: 'A single-step test event',
    effect(state) {
      effectApplied = true
      return { ...state, cash: state.cash + 100 }
    },
    probability: 1,
    type: 'positive',
  }

  const initialCash = getState().game.cash

  // Add to queue and process
  getState().triggerEvent(mockEvent, 1)
  getState().processEventQueue()

  const after = getState()

  // Verify effect applied immediately
  t.true(effectApplied)
  t.is(after.game.cash, initialCash + 100)

  // Verify event not set as current
  t.is(after.events.current, undefined)

  // Verify queue is empty
  t.is(after.events.queue.length, 0)
})

test('chooseEvent: applies choice effect and advances step', (t) => {
  // Clear any pre-existing events
  setState((state) => {
    state.events.queue = []
    state.events.current = undefined
  })

  const mockEvent: MultiStepEvent = {
    name: 'Test Choice Event',
    description: 'An event with choices',
    steps: [
      {
        description: 'Step 1',
        choices: [
          {
            text: 'Add gold',
            effect: (state) => ({ ...state, cash: state.cash + 500 }),
          },
          {
            text: 'Add health',
            effect: (state) => ({ ...state, health: state.health + 10 }),
          },
        ],
      },
    ],
    probability: 1,
    type: 'positive',
  }

  // Set up event
  getState().triggerEvent(mockEvent, 1)
  getState().processEventQueue()

  const initialCash = getState().game.cash

  // Choose first option
  getState().chooseEvent(0)

  const after = getState()

  // Verify effect applied
  t.is(after.game.cash, initialCash + 500)

  // Verify moved to outcome phase (since it's the last step)
  t.is(after.events.phase, 'outcome')
})

test('acknowledgeEvent: clears event and processes next in queue', (t) => {
  // Clear any pre-existing events
  setState((state) => {
    state.events.queue = []
    state.events.current = undefined
  })

  const event1: MultiStepEvent = {
    name: 'Event 1',
    description: 'First event',
    steps: [
      {
        description: 'Step',
        choices: [{ text: 'OK', effect: (s) => s }],
      },
    ],
    probability: 1,
    type: 'neutral',
  }

  const event2: MultiStepEvent = {
    name: 'Event 2',
    description: 'Second event',
    steps: [
      {
        description: 'Step',
        choices: [{ text: 'OK', effect: (s) => s }],
      },
    ],
    probability: 1,
    type: 'neutral',
  }

  // Queue both events
  getState().triggerEvent(event1, 1)
  getState().triggerEvent(event2, 1)

  // Process first event
  getState().processEventQueue()
  t.is(getState().events.current?.name, 'Event 1')

  // Acknowledge first event
  getState().acknowledgeEvent()

  const after = getState()

  // Verify second event now current
  t.is(after.events.current?.name, 'Event 2')
})

test('event queue: processes events by priority', (t) => {
  // Clear any pre-existing events
  setState((state) => {
    state.events.queue = []
    state.events.current = undefined
  })

  const lowPriorityEvent: MultiStepEvent = {
    name: 'Low Priority',
    description: 'Low',
    steps: [
      {
        description: 'Step',
        choices: [{ text: 'OK', effect: (s) => s }],
      },
    ],
    probability: 1,
    type: 'neutral',
  }

  const highPriorityEvent: MultiStepEvent = {
    name: 'High Priority',
    description: 'High',
    steps: [
      {
        description: 'Step',
        choices: [{ text: 'OK', effect: (s) => s }],
      },
    ],
    probability: 1,
    type: 'neutral',
  }

  // Add low priority first, then high priority
  getState().triggerEvent(lowPriorityEvent, 1)
  getState().triggerEvent(highPriorityEvent, 10)

  // Process queue
  getState().processEventQueue()

  const after = getState()

  // Verify high priority event processed first
  t.is(after.events.current?.name, 'High Priority')
})

// ==========================================
// Travel System Tests
// ==========================================

test('startTravel: initiates travel animation', (t) => {
  // Start travel
  getState().startTravel('Royal Castle')

  const after = getState()

  // Verify travel state
  t.is(after.travel.phase, 'animating')
  t.is(after.travel.destination, 'Royal Castle')
  t.not(after.travel.animationStartTime, undefined)

  // Verify screen changed
  t.is(after.ui.activeScreen, 'traveling')
})

test('completeTravel: updates location and advances day', (t) => {
  const initialLocation = getState().game.location.name
  const initialDay = getState().game.day

  // Start and complete travel
  getState().startTravel('Royal Castle')
  getState().completeTravel()

  const after = getState()

  // Verify location changed
  t.not(after.game.location.name, initialLocation)
  t.is(after.game.location.name, 'Royal Castle')

  // Verify day advanced
  t.is(after.game.day, initialDay + 1)

  // Verify travel completed (phase resets to 'idle' so subsequent startTravel
  // calls aren't gated by a stale 'complete' marker).
  t.is(after.travel.phase, 'idle')
  t.is(after.travel.destination, undefined)
  t.is(after.travel.origin, undefined)
})

// ==========================================
// UI State Tests
// ==========================================

test('setScreen: changes active screen', (t) => {
  getState().setScreen('game')
  t.is(getState().ui.activeScreen, 'game')

  getState().setScreen('game-over')
  t.is(getState().ui.activeScreen, 'game-over')
})

test('toggleHelp: toggles help visibility', (t) => {
  const initialState = getState().ui.showHelp

  getState().toggleHelp()
  t.not(getState().ui.showHelp, initialState)

  getState().toggleHelp()
  t.is(getState().ui.showHelp, initialState)
})

test('setQuitConfirmation: sets quit confirmation state', (t) => {
  getState().setQuitConfirmation(true)
  t.true(getState().ui.quitConfirmation)

  getState().setQuitConfirmation(false)
  t.false(getState().ui.quitConfirmation)
})

// ==========================================
// Message System Tests
// ==========================================

test('addMessage: adds message to log', (t) => {
  const initialLength = getState().messages.length

  getState().addMessage('info', 'Test message')

  const after = getState()

  t.is(after.messages.length, initialLength + 1)
  t.is(after.messages.at(-1)!.content, 'Test message')
  t.is(after.messages.at(-1)!.type, 'info')
})

test('clearMessages: removes all messages', (t) => {
  // Add some messages
  getState().addMessage('info', 'Message 1')
  getState().addMessage('info', 'Message 2')

  // Clear
  getState().clearMessages()

  t.is(getState().messages.length, 0)
})

// ==========================================
// Reputation System Tests
// ==========================================

test('updateReputation: updates global reputation', (t) => {
  const initialRep = getState().game.reputation.global

  getState().updateReputation({ global: 10 })

  const after = getState()

  t.is(after.game.reputation.global, initialRep + 10)
})

test('updateReputation: updates location reputation', (t) => {
  const location = 'Royal Castle'
  const initialRep = getState().game.reputation.locations[location] || 0

  getState().updateReputation({ location, locationChange: 5 })

  const after = getState()

  t.is(after.game.reputation.locations[location], initialRep + 5)
})

test('updateReputation: updates NPC relationship', (t) => {
  const npcId = 'test-npc-001'
  const initialRep = getState().game.reputation.npcRelationships[npcId] || 0

  getState().updateReputation({ npc: npcId, npcChange: 15 })

  const after = getState()

  t.is(after.game.reputation.npcRelationships[npcId], initialRep + 15)
})

// ==========================================
// NPC System Tests
// ==========================================

test('startNPCInteraction: sets current NPC', (t) => {
  getState().startNPCInteraction('npc-001', 'dialogue')

  const after = getState()

  t.not(after.npc.current, undefined)
  t.is(after.npc.current?.npcId, 'npc-001')
  t.is(after.npc.current?.type, 'dialogue')
  t.true(after.npc.current?.active)
})

test('endNPCInteraction: clears current NPC', (t) => {
  getState().startNPCInteraction('npc-001', 'trade')
  t.not(getState().npc.current, undefined)

  getState().endNPCInteraction()
  t.is(getState().npc.current, undefined)
})

// ==========================================
// Initialization Tests
// ==========================================

test('initializeGame: resets state with player name', (t) => {
  // Modify state
  setState((state) => {
    state.game.cash = 9999
    state.game.day = 15
  })

  // Re-initialize
  getState().initializeGame('NewPlayer')

  const after = getState()

  // Verify reset
  t.is(after.game.cash, 2000)
  t.is(after.game.day, 0)
  t.is(after.game.playerName, 'NewPlayer')
  t.not(Object.keys(after.game.prices).length, 0)
})

test('resetGame: resets entire state', (t) => {
  // Modify state
  setState((state) => {
    state.game.cash = 9999
    state.game.day = 15
  })

  getState().addMessage('info', 'Test')

  // Reset
  getState().resetGame()

  const after = getState()

  // Verify reset
  t.is(after.game.cash, 2000)
  t.is(after.game.day, 0)
  t.is(after.messages.length, 0)
})
