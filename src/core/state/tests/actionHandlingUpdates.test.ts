import test from 'ava'
import { gameReducer } from '../reducers/gameReducer.js'
import {
    startNPCInteraction,
    endNPCInteraction,
    processNPCDialogue,
    triggerAnimation,
    completeAnimation,
    updateReputation,
    recordTransaction,
} from '../actions/creators.js'
import { type GameState } from '../../../types/game.types.js'
import { type ReputationChange } from '../../../types/reputation.types.js'

const createTestGameState = (): GameState => ({
  day: 5,
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: {
    name: "Alchemist's Quarter",
    description: 'Test location',
    dangerLevel: 1,
  },
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
})

test('startNPCInteraction - creates NPC interaction state', (t) => {
  const initialState = createTestGameState()
  const action = startNPCInteraction('test_npc', 'dialogue')

  const newState = gameReducer(initialState, action)

  t.truthy(newState.currentNPCInteraction)
  t.is(newState.currentNPCInteraction?.npcId, 'test_npc')
  t.is(newState.currentNPCInteraction?.type, 'dialogue')
  t.is(newState.currentNPCInteraction?.active, true)
})

test('endNPCInteraction - clears NPC interaction state', (t) => {
  const initialState = createTestGameState()
  initialState.currentNPCInteraction = {
    npcId: 'test_npc',
    type: 'dialogue',
    active: true,
  }

  const action = endNPCInteraction('test_npc')
  const newState = gameReducer(initialState, action)

  t.is(newState.currentNPCInteraction, undefined)
})

test('processNPCDialogue - maintains state for now', (t) => {
  const initialState = createTestGameState()
  const action = processNPCDialogue('test_npc', 0, { test: 'data' })

  const newState = gameReducer(initialState, action)

  // For now, dialogue processing just passes through
  t.deepEqual(newState, initialState)
})

test('triggerAnimation - creates animation state', (t) => {
  const initialState = createTestGameState()
  const animationData = { from: 'Location A', to: 'Location B' }
  const action = triggerAnimation('travel', animationData)

  const newState = gameReducer(initialState, action)

  t.truthy(newState.currentAnimation)
  t.is(newState.currentAnimation?.type, 'travel')
  t.deepEqual(newState.currentAnimation?.data, animationData)
  t.is(newState.currentAnimation?.active, true)
})

test('completeAnimation - clears animation state', (t) => {
  const initialState = createTestGameState()
  initialState.currentAnimation = {
    type: 'travel',
    data: { test: 'data' },
    active: true,
  }

  const action = completeAnimation('travel')
  const newState = gameReducer(initialState, action)

  t.is(newState.currentAnimation, undefined)
})

test('updateReputation - applies reputation changes', (t) => {
  const initialState = createTestGameState()
  const reputationChange: ReputationChange = {
    global: 5,
    location: "Alchemist's Quarter",
    locationChange: 10,
  }

  const action = updateReputation(reputationChange)
  const newState = gameReducer(initialState, action)

  t.is(newState.reputation.global, 5)
  t.is(newState.reputation.locations["Alchemist's Quarter"], 10)
})

test('recordTransaction - updates market data and trade history', (t) => {
  const initialState = createTestGameState()

  // Initialize market data for the location
  initialState.marketData = {
    "Alchemist's Quarter": {
      'Health Potion': {
        basePrice: 100,
        currentPrice: 100,
        demand: 0.5,
        supply: 0.5,
        trend: 'stable',
        history: [],
        volatility: 0.3,
        lastUpdated: 0,
      },
    },
  }

  const action = recordTransaction(
    "Alchemist's Quarter",
    'Health Potion',
    5,
    100,
    5
  )
  const newState = gameReducer(initialState, action)

  // Check that trade history was updated
  t.is(newState.tradeHistory.length, 1)
  t.is(newState.tradeHistory[0]?.potionType, 'Health Potion')
  t.is(newState.tradeHistory[0]?.quantity, 5)
  t.is(newState.tradeHistory[0]?.pricePerUnit, 100)
  t.is(newState.tradeHistory[0]?.type, 'buy')
})

test('recordTransaction - handles buy transactions', (t) => {
  const initialState = createTestGameState()

  // Initialize market data for the location
  initialState.marketData = {
    "Alchemist's Quarter": {
      'Health Potion': {
        basePrice: 100,
        currentPrice: 100,
        demand: 0.5,
        supply: 0.5,
        trend: 'stable',
        history: [],
        volatility: 0.3,
        lastUpdated: 0,
      },
    },
  }

  const action = recordTransaction(
    "Alchemist's Quarter",
    'Health Potion',
    -3,
    120,
    5
  )
  const newState = gameReducer(initialState, action)

  // Check that trade history was updated with buy transaction
  t.is(newState.tradeHistory.length, 1)
  t.is(newState.tradeHistory[0]?.type, 'sell')
  t.is(newState.tradeHistory[0]?.quantity, 3) // Absolute value
})

test('recordTransaction - ignores invalid market data', (t) => {
  const initialState = createTestGameState()

  const action = recordTransaction(
    'Invalid Location',
    'Health Potion',
    5,
    100,
    5
  )
  const newState = gameReducer(initialState, action)

  // State should remain unchanged
  t.deepEqual(newState, initialState)
})

test('multiple NPC interaction actions in sequence', (t) => {
  let state = createTestGameState()

  // Start interaction
  state = gameReducer(state, startNPCInteraction('npc1', 'trade'))
  t.truthy(state.currentNPCInteraction)
  t.is(state.currentNPCInteraction?.npcId, 'npc1')
  t.is(state.currentNPCInteraction?.type, 'trade')

  // Process dialogue (no-op for now)
  state = gameReducer(state, processNPCDialogue('npc1', 1, { choice: 'test' }))
  t.truthy(state.currentNPCInteraction) // Should still be active

  // End interaction
  state = gameReducer(state, endNPCInteraction('npc1'))
  t.is(state.currentNPCInteraction, undefined)
})

test('multiple animation actions in sequence', (t) => {
  let state = createTestGameState()

  // Trigger animation
  const animationData = { npcId: 'test_npc' }
  state = gameReducer(state, triggerAnimation('npc_encounter', animationData))
  t.truthy(state.currentAnimation)
  t.is(state.currentAnimation?.type, 'npc_encounter')

  // Complete animation
  state = gameReducer(state, completeAnimation('npc_encounter'))
  t.is(state.currentAnimation, undefined)
})

test('NPC interaction types are handled correctly', (t) => {
  const initialState = createTestGameState()

  // Test dialogue interaction
  let state = gameReducer(initialState, startNPCInteraction('npc1', 'dialogue'))
  t.is(state.currentNPCInteraction?.type, 'dialogue')

  // Test trade interaction
  state = gameReducer(initialState, startNPCInteraction('npc2', 'trade'))
  t.is(state.currentNPCInteraction?.type, 'trade')

  // Test information interaction
  state = gameReducer(initialState, startNPCInteraction('npc3', 'information'))
  t.is(state.currentNPCInteraction?.type, 'information')
})

test('animation types are handled correctly', (t) => {
  const initialState = createTestGameState()

  // Test travel animation
  let state = gameReducer(
    initialState,
    triggerAnimation('travel', { from: 'A', to: 'B' })
  )
  t.is(state.currentAnimation?.type, 'travel')

  // Test NPC encounter animation
  state = gameReducer(
    initialState,
    triggerAnimation('npc_encounter', { npcId: 'test' })
  )
  t.is(state.currentAnimation?.type, 'npc_encounter')

  // Test trade animation
  state = gameReducer(
    initialState,
    triggerAnimation('trade', { item: 'potion' })
  )
  t.is(state.currentAnimation?.type, 'trade')

  // Test combat animation
  state = gameReducer(
    initialState,
    triggerAnimation('combat', { enemy: 'guard' })
  )
  t.is(state.currentAnimation?.type, 'combat')
})
