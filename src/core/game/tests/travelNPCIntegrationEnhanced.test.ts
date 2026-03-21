import test from 'ava'
import { travelWithNPCEncounters, checkNPCEncounter } from '../travel.js'
import { NPCEncounter } from '../../npcs/NPCEncounter.js'
import { NPCManager } from '../../npcs/NPCManager.js'
import { type GameState } from '../../../types/game.types.js'
import { type NPC } from '../../../types/npc.types.js'

// Test NPC data
const testNPC: NPC = {
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A friendly test merchant',
  personality: {
    greeting: 'Welcome, traveler!',
    farewell: 'Safe travels!',
    tradeAccept: 'Excellent choice!',
    tradeDecline: 'Perhaps another time.',
    lowReputation: "I don't trust you.",
    highReputation: 'My valued customer!',
  },
  location: "Merchant's District",
  availability: {
    probability: 0.8,
    timeRestriction: [1, 30],
    reputationGate: 0,
  },
  reputation: {
    minimum: 0,
    maximum: undefined,
    location: "Merchant's District",
  },
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Hello there!',
        choices: [
          {
            text: 'Hello',
            nextNode: 'farewell',
          },
        ],
      },
      farewell: {
        id: 'farewell',
        text: 'Goodbye!',
        choices: [],
      },
    },
  },
}

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
    locations: {
      "Merchant's District": 10,
    },
    npcRelationships: {},
  },
  marketData: {},
  tradeHistory: [],
})

test.beforeEach(() => {
  // Reset NPC system, then initialize to set the flag,
  // then clear NPCs so only test-registered NPCs exist
  NPCEncounter.reset()
  // Force re-initialization so the initialized flag is set to true
  // (prevents lazy-init from loading defaults during test execution)
  const manager = NPCManager.getInstance()
  manager.clearNPCs()
  manager.clearCaches()
  // Mark as initialized to prevent default NPC loading
  NPCEncounter.initialize()
  manager.clearNPCs()
  manager.clearCaches()
})

test.serial('travelWithNPCEncounters - basic travel without encounter', (t) => {
  const gameState = createTestGameState()

  const result = travelWithNPCEncounters(gameState, "Merchant's District")

  t.is(result.newState.location.name, "Merchant's District")
  t.true(result.message.includes("Traveled to Merchant's District"))
  t.is(result.npcEncounter, undefined)
  t.is(result.npcEvent, undefined)
})

test.serial('travelWithNPCEncounters - travel with NPC encounter', (t) => {
  const gameState = createTestGameState()

  // Register the test NPC
  const manager = NPCManager.getInstance()
  manager.registerNPC(testNPC)

  // Mock Math.random to ensure encounter happens
  const originalRandom = Math.random
  Math.random = () => 0.1 // Low value to trigger encounter

  try {
    const result = travelWithNPCEncounters(gameState, "Merchant's District")

    t.is(result.newState.location.name, "Merchant's District")
    t.true(result.message.includes('You encounter Test Merchant!'))
    t.truthy(result.npcEncounter)
    t.is(result.npcEncounter?.id, 'test_merchant')
    t.truthy(result.npcEvent)
    t.truthy(result.newState.currentEvent)
  } finally {
    Math.random = originalRandom
  }
})

test.serial('checkNPCEncounter - returns null when no NPCs available', (t) => {
  const gameState = createTestGameState()

  const encounter = checkNPCEncounter(gameState)

  t.is(encounter, undefined)
})

test.serial('checkNPCEncounter - returns NPC when available and probability met', (t) => {
  const gameState = createTestGameState()
  gameState.location.name = "Merchant's District"

  // Register the test NPC
  const manager = NPCManager.getInstance()
  manager.registerNPC(testNPC)

  // Mock Math.random to ensure encounter happens
  const originalRandom = Math.random
  Math.random = () => 0.1 // Low value to trigger encounter

  try {
    const encounter = checkNPCEncounter(gameState)

    t.truthy(encounter)
    t.is(encounter?.id, 'test_merchant')
  } finally {
    Math.random = originalRandom
  }
})

test.serial('checkNPCEncounter - respects reputation gates', (t) => {
  const gameState = createTestGameState()
  gameState.location.name = "Merchant's District"
  gameState.reputation.locations["Merchant's District"] = -10 // Low reputation

  // Create NPC with high reputation requirement
  const highRepNPC: NPC = {
    ...testNPC,
    id: 'high_rep_npc',
    availability: {
      ...testNPC.availability,
      reputationGate: 50, // High requirement
    },
  }

  const manager = NPCManager.getInstance()
  manager.registerNPC(highRepNPC)

  const encounter = checkNPCEncounter(gameState)

  t.is(encounter, undefined)
})

test.serial('travelWithNPCEncounters - handles invalid location', (t) => {
  const gameState = createTestGameState()

  const result = travelWithNPCEncounters(gameState, 'Invalid Location')

  t.is(result.message, 'Invalid location!')
  t.is(result.npcEncounter, undefined)
})

test.serial('travelWithNPCEncounters - preserves existing game state properties', (t) => {
  const gameState = createTestGameState()
  gameState.cash = 1500
  gameState.inventory = { 'Health Potion': 5 }

  const result = travelWithNPCEncounters(gameState, "Merchant's District")

  t.is(result.newState.cash, 1500)
  t.deepEqual(result.newState.inventory, { 'Health Potion': 5 })
  t.deepEqual(result.newState.reputation, gameState.reputation)
})

test.serial('travelWithNPCEncounters - updates prices on travel', (t) => {
  const gameState = createTestGameState()
  const originalPrices = gameState.prices

  const result = travelWithNPCEncounters(gameState, "Merchant's District")

  // Prices should be updated (different object reference)
  t.not(result.newState.prices, originalPrices)
})

test.serial('travelWithNPCEncounters - creates proper event structure', (t) => {
  const gameState = createTestGameState()

  const manager = NPCManager.getInstance()
  manager.registerNPC(testNPC)

  // Mock Math.random to ensure encounter happens
  const originalRandom = Math.random
  Math.random = () => 0.1

  try {
    const result = travelWithNPCEncounters(gameState, "Merchant's District")

    t.truthy(result.npcEvent)
    t.is(result.npcEvent?.id, 'npc_encounter_test_merchant')
    t.is(result.npcEvent?.name, 'Encounter: Test Merchant')
    t.is(result.npcEvent?.description, 'Welcome, traveler!')
    t.deepEqual(result.npcEvent?.locationSpecific, ["Merchant's District"])

    // Check that the event is set in game state
    t.is(result.newState.currentEvent, result.npcEvent)
    t.is(result.newState.currentStep, 0)
  } finally {
    Math.random = originalRandom
  }
})
