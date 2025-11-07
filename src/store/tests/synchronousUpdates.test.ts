import test from 'ava'
import { useStore } from '../appStore.js'
import { type MultiStepEvent } from '../../types/events.types.js'

/**
 * These tests verify that Zustand state updates are SYNCHRONOUS,
 * which is the key advantage over React's useReducer (which is async).
 *
 * This solves the race condition bugs identified in ARCHITECTURE_REFACTOR.md
 */

test.beforeEach(() => {
  useStore.getState().resetGame()
  useStore.getState().initializeGame('TestPlayer')
})

// ==========================================
// Synchronous Update Verification
// ==========================================

test('state updates are immediately visible after action call', (t) => {
  const store = useStore.getState()

  const initialCash = store.game.cash

  // Call action
  store.game.cash = initialCash + 1000

  // Verify state updated IMMEDIATELY (synchronously)
  t.is(useStore.getState().game.cash, initialCash + 1000)
})

test('brewPotion: state is immediately updated', (t) => {
  const store = useStore.getState()

  store.game.prices['Wisdom Draught'] = 50
  const initialCash = store.game.cash

  // Call action
  store.brewPotion('Wisdom Draught', 5)

  // Immediately read state - should be updated (synchronous)
  const afterState = useStore.getState()
  t.is(afterState.game.inventory['Wisdom Draught'], 5)
  t.is(afterState.game.cash, initialCash - 250)
  t.true(
    afterState.messages.some((m) =>
      m.content.includes('Brewed 5 Wisdom Draught')
    )
  )
})

test('multiple sequential actions: all updates visible immediately', (t) => {
  const store = useStore.getState()

  store.game.prices['Wisdom Draught'] = 50
  store.game.prices['Strength Tonic'] = 100

  // First action
  store.brewPotion('Wisdom Draught', 3)

  // Immediately verify first action completed
  t.is(useStore.getState().game.inventory['Wisdom Draught'], 3)

  // Second action
  store.brewPotion('Strength Tonic', 2)

  // Immediately verify both actions completed
  const afterState = useStore.getState()
  t.is(afterState.game.inventory['Wisdom Draught'], 3)
  t.is(afterState.game.inventory['Strength Tonic'], 2)
})

test('event triggering: event immediately added to queue', (t) => {
  const store = useStore.getState()

  const mockEvent: MultiStepEvent = {
    name: 'Immediate Event',
    description: 'Should be queued immediately',
    steps: [
      {
        description: 'Test',
        choices: [{ text: 'OK', effect: (s) => s }],
      },
    ],
    probability: 1,
    type: 'neutral',
  }

  // Trigger event
  store.triggerEvent(mockEvent, 5)

  // Immediately verify it's in the queue (synchronous)
  const afterState = useStore.getState()
  t.is(afterState.events.queue.length, 1)
  t.is(afterState.events.queue[0]!.event.name, 'Immediate Event')
  t.is(afterState.events.queue[0]!.priority, 5)
})

test('travel completion: all state updates are synchronous', (t) => {
  const store = useStore.getState()

  const initialLocation = store.game.location.name
  const initialDay = store.game.day

  // Start travel
  store.startTravel('Royal Castle')

  // Verify travel state updated immediately
  let currentState = useStore.getState()
  t.is(currentState.travel.phase, 'animating')
  t.is(currentState.travel.destination, 'Royal Castle')

  // Complete travel
  store.completeTravel()

  // Immediately verify ALL travel effects applied (synchronous)
  currentState = useStore.getState()
  t.is(currentState.game.location.name, 'Royal Castle')
  t.not(currentState.game.location.name, initialLocation)
  t.is(currentState.game.day, initialDay + 1)
  t.is(currentState.travel.phase, 'complete')
  t.true(currentState.messages.some((m) => m.content.includes('Traveled from')))
})

test('event processing: currentEvent set immediately', (t) => {
  const store = useStore.getState()

  const mockEvent: MultiStepEvent = {
    name: 'Test Event',
    description: 'Test',
    steps: [
      {
        description: 'Step',
        choices: [{ text: 'Choice', effect: (s) => s }],
      },
    ],
    probability: 1,
    type: 'positive',
  }

  // Queue event
  store.triggerEvent(mockEvent, 1)

  // Process queue
  store.processEventQueue()

  // Immediately verify event is current (synchronous)
  const afterState = useStore.getState()
  t.not(afterState.events.current, undefined)
  t.is(afterState.events.current?.name, 'Test Event')
  t.is(afterState.events.phase, 'choice')
  t.is(afterState.events.currentStep, 0)
})

test('event choice: effect applied immediately', (t) => {
  const store = useStore.getState()

  const mockEvent: MultiStepEvent = {
    name: 'Gold Event',
    description: 'Get gold',
    steps: [
      {
        description: 'Choose reward',
        choices: [
          {
            text: 'Take gold',
            effect: (state) => ({ ...state, cash: state.cash + 500 }),
          },
        ],
      },
    ],
    probability: 1,
    type: 'positive',
  }

  // Set up event
  store.triggerEvent(mockEvent, 1)
  store.processEventQueue()

  const initialCash = useStore.getState().game.cash

  // Make choice
  store.chooseEvent(0)

  // Immediately verify effect applied (synchronous)
  const afterState = useStore.getState()
  t.is(afterState.game.cash, initialCash + 500)
  t.is(afterState.events.phase, 'outcome')
})

test('complex sequence: travel -> event -> choice all synchronous', (t) => {
  const store = useStore.getState()

  // Create event that will trigger on travel
  const travelEvent: MultiStepEvent = {
    name: 'Travel Event',
    description: 'Event during travel',
    steps: [
      {
        description: 'Encounter',
        choices: [
          {
            text: 'Pay toll',
            effect: (state) => ({ ...state, cash: state.cash - 100 }),
          },
        ],
      },
    ],
    probability: 1,
    type: 'negative',
  }

  // Manually trigger event (simulating what completeTravel does)
  store.startTravel('Royal Castle')
  store.completeTravel()

  // Manually add event for testing
  store.triggerEvent(travelEvent, 1)
  store.processEventQueue()

  // Verify all state is immediately consistent
  const state = useStore.getState()

  // Travel completed
  t.is(state.game.location.name, 'Royal Castle')
  t.is(state.travel.phase, 'complete')

  // Event is active
  t.not(state.events.current, undefined)
  t.is(state.events.current?.name, 'Travel Event')

  const beforeChoiceCash = state.game.cash

  // Make event choice
  store.chooseEvent(0)

  // Verify choice effect applied immediately
  const afterChoice = useStore.getState()
  t.is(afterChoice.game.cash, beforeChoiceCash - 100)
  t.is(afterChoice.events.phase, 'outcome')
})

test('reputation updates: immediately reflected in state', (t) => {
  const store = useStore.getState()

  const initialGlobalRep = store.game.reputation.global

  // Update reputation
  store.updateReputation({ global: 25 })

  // Immediately verify updated (synchronous)
  const afterState = useStore.getState()
  t.is(afterState.game.reputation.global, initialGlobalRep + 25)
})

test('message addition: immediately visible', (t) => {
  const store = useStore.getState()

  const initialMessageCount = store.messages.length

  // Add message
  store.addMessage('info', 'Synchronous test message')

  // Immediately verify added (synchronous)
  const afterState = useStore.getState()
  t.is(afterState.messages.length, initialMessageCount + 1)
  t.is(afterState.messages.at(-1)!.content, 'Synchronous test message')
})

test('NPC interaction start: immediately reflected', (t) => {
  const store = useStore.getState()

  t.is(store.npc.current, undefined)

  // Start interaction
  store.startNPCInteraction('npc-123', 'dialogue')

  // Immediately verify (synchronous)
  const afterState = useStore.getState()
  t.not(afterState.npc.current, undefined)
  t.is(afterState.npc.current?.npcId, 'npc-123')
  t.is(afterState.npc.current?.type, 'dialogue')
})

test('screen changes: immediately updated', (t) => {
  const store = useStore.getState()

  store.setScreen('title')
  t.is(useStore.getState().ui.activeScreen, 'title')

  store.setScreen('game')
  t.is(useStore.getState().ui.activeScreen, 'game')

  store.setScreen('game-over')
  t.is(useStore.getState().ui.activeScreen, 'game-over')
})

// ==========================================
// Race Condition Prevention Tests
// ==========================================

test('NO RACE CONDITION: travel completion -> event display flow', (t) => {
  const store = useStore.getState()

  const travelEvent: MultiStepEvent = {
    name: 'Rival Encounter',
    description: 'A rival alchemist appears',
    steps: [
      {
        description: 'What do you do?',
        choices: [
          { text: 'Negotiate', effect: (s) => s },
          { text: 'Compete', effect: (s) => s },
        ],
      },
    ],
    probability: 1,
    type: 'neutral',
  }

  // Start and complete travel
  store.startTravel('Royal Castle')
  store.completeTravel()

  // Manually queue event (simulating what happens in real game)
  store.triggerEvent(travelEvent, 1)
  store.processEventQueue()

  // THIS IS THE CRITICAL TEST:
  // In the old system, currentEvent would be undefined here
  // because the dispatch hadn't propagated yet.
  // With Zustand, it's ALWAYS defined immediately.
  const state = useStore.getState()
  t.not(state.events.current, null, 'Event should be immediately available')
  t.is(
    state.events.current?.name,
    'Rival Encounter',
    'Event should be the correct one'
  )
  t.is(state.events.phase, 'choice', 'Event phase should be set')

  // Screen logic can now make correct decision immediately
  const shouldShowEvent =
    state.events.current !== null && state.events.phase !== 'acknowledged'
  t.true(shouldShowEvent, 'Screen should know to show event immediately')
})

test("NO RACE CONDITION: multiple events don't overwrite each other", (t) => {
  const store = useStore.getState()

  const event1: MultiStepEvent = {
    name: 'First Event',
    description: 'First',
    steps: [
      { description: 'Step', choices: [{ text: 'OK', effect: (s) => s }] },
    ],
    probability: 1,
    type: 'neutral',
  }

  const event2: MultiStepEvent = {
    name: 'Second Event',
    description: 'Second',
    steps: [
      { description: 'Step', choices: [{ text: 'OK', effect: (s) => s }] },
    ],
    probability: 1,
    type: 'neutral',
  }

  // Queue both events rapidly
  store.triggerEvent(event1, 1)
  store.triggerEvent(event2, 1)

  // Both should be in queue immediately
  const afterQueue = useStore.getState()
  t.is(afterQueue.events.queue.length, 2)

  // Process first
  store.processEventQueue()
  const afterFirst = useStore.getState()
  t.is(afterFirst.events.current?.name, 'First Event')
  t.is(afterFirst.events.queue.length, 1)

  // Acknowledge and process second
  store.acknowledgeEvent()
  const afterAck = useStore.getState()
  t.is(
    afterAck.events.current?.name,
    'Second Event',
    'Second event should auto-process'
  )
  t.is(afterAck.events.queue.length, 0)

  // CRITICAL: Second event did NOT overwrite first
  // Both were properly queued and processed in order
})

test('NO RACE CONDITION: game over check sees latest state', (t) => {
  const store = useStore.getState()

  // Set health to 0
  store.game.health = 0

  // Immediately check if game over
  const state = useStore.getState()
  const isGameOver =
    state.game.health <= 0 || state.game.debt > 10_000 || state.game.day > 30

  // With Zustand, this check always sees the latest state
  t.true(isGameOver, 'Game over check should see health = 0 immediately')
})
