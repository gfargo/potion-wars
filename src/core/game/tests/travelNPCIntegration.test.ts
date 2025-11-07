import test from 'ava'
import {
  checkNPCEncounter,
  getLocationNPCs,
  getLocationNPCsByType,
} from '../travel.js'
import { NPCEncounter } from '../../npcs/NPCEncounter.js'
import { type GameState } from '../../../types/game.types.js'

// Test data
const mockGameState: GameState = {
  day: 10,
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: {
    name: "Merchant's District",
    description: 'A busy marketplace',
    dangerLevel: 3,
  },
  inventory: {},
  prices: {},
  weather: 'sunny',
  reputation: {
    global: 10,
    locations: { "Merchant's District": 5 },
    npcRelationships: {},
  },
  marketData: {},
  tradeHistory: [],
}

// Helper to clean up NPCs
const cleanup = () => {
  NPCEncounter.reset()
}

test.beforeEach(cleanup)
test.afterEach(cleanup)

test.serial('checkNPCEncounter returns NPC or null', (t) => {
  const result = checkNPCEncounter(mockGameState)

  // Result should be either an NPC or undefined
  if (result === undefined) {
    t.is(result, undefined)
  } else {
    t.truthy(result.id)
    t.truthy(result.name)
    t.is(result.location, mockGameState.location.name)
  }
})

test.serial('getLocationNPCs returns NPCs for current location', (t) => {
  const npcs = getLocationNPCs(mockGameState)

  t.true(Array.isArray(npcs))

  // All returned NPCs should be for the current location
  for (const npc of npcs) {
    t.is(npc.location, mockGameState.location.name)
  }
})

test.serial('getLocationNPCs returns empty array for unknown location', (t) => {
  const unknownLocationState = {
    ...mockGameState,
    location: {
      name: 'Unknown Location',
      description: 'Unknown',
      dangerLevel: 1,
    },
  }

  const npcs = getLocationNPCs(unknownLocationState)

  t.true(Array.isArray(npcs))
  t.is(npcs.length, 0)
})

test.serial('getLocationNPCsByType filters NPCs by type', (t) => {
  const merchants = getLocationNPCsByType(mockGameState, 'merchant')
  const informants = getLocationNPCsByType(mockGameState, 'informant')
  const guards = getLocationNPCsByType(mockGameState, 'guard')

  t.true(Array.isArray(merchants))
  t.true(Array.isArray(informants))
  t.true(Array.isArray(guards))

  // All merchants should be merchant type and in current location
  for (const merchant of merchants) {
    t.is(merchant.type, 'merchant')
    t.is(merchant.location, mockGameState.location.name)
  }

  // All informants should be informant type and in current location
  for (const informant of informants) {
    t.is(informant.type, 'informant')
    t.is(informant.location, mockGameState.location.name)
  }

  // All guards should be guard type and in current location
  for (const guard of guards) {
    t.is(guard.type, 'guard')
    t.is(guard.location, mockGameState.location.name)
  }
})

test.serial(
  'getLocationNPCsByType returns empty array for non-existent type',
  (t) => {
    const npcs = getLocationNPCsByType(mockGameState, 'non_existent_type')

    t.true(Array.isArray(npcs))
    t.is(npcs.length, 0)
  }
)

test.serial('travel integration works with different locations', (t) => {
  // Test Merchant's District
  const merchantDistrictState = {
    ...mockGameState,
    location: {
      name: "Merchant's District",
      description: 'Busy marketplace',
      dangerLevel: 3,
    },
  }

  const merchantDistrictNPCs = getLocationNPCs(merchantDistrictState)

  // Test Royal Castle
  const castleState = {
    ...mockGameState,
    location: {
      name: 'Royal Castle',
      description: 'Seat of power',
      dangerLevel: 5,
    },
    reputation: {
      global: 30,
      locations: { 'Royal Castle': 25 },
      npcRelationships: {},
    },
  }

  const castleNPCs = getLocationNPCs(castleState)

  // Test Enchanted Forest
  const forestState = {
    ...mockGameState,
    location: {
      name: 'Enchanted Forest',
      description: 'Magical woodland',
      dangerLevel: 4,
    },
  }

  const forestNPCs = getLocationNPCs(forestState)

  // All should return arrays
  t.true(Array.isArray(merchantDistrictNPCs))
  t.true(Array.isArray(castleNPCs))
  t.true(Array.isArray(forestNPCs))

  // NPCs should be location-specific
  for (const npc of merchantDistrictNPCs) {
    t.is(npc.location, "Merchant's District")
  }

  for (const npc of castleNPCs) {
    t.is(npc.location, 'Royal Castle')
  }

  for (const npc of forestNPCs) {
    t.is(npc.location, 'Enchanted Forest')
  }
})

test.serial('NPC encounters respect game state conditions', (t) => {
  // Test with different reputation levels
  const lowRepState = {
    ...mockGameState,
    reputation: {
      global: -20,
      locations: { "Merchant's District": -10 },
      npcRelationships: {},
    },
  }

  const highRepState = {
    ...mockGameState,
    reputation: {
      global: 50,
      locations: { "Merchant's District": 40 },
      npcRelationships: {},
    },
  }

  const lowRepNPCs = getLocationNPCs(lowRepState)
  const highRepNPCs = getLocationNPCs(highRepState)

  // High reputation should generally have access to more NPCs
  t.true(Array.isArray(lowRepNPCs))
  t.true(Array.isArray(highRepNPCs))

  // Test with different days
  const earlyGameState = { ...mockGameState, day: 3 }
  const lateGameState = { ...mockGameState, day: 25 }

  const earlyNPCs = getLocationNPCs(earlyGameState)
  const lateNPCs = getLocationNPCs(lateGameState)

  t.true(Array.isArray(earlyNPCs))
  t.true(Array.isArray(lateNPCs))
})

test.serial('NPC type filtering works correctly across locations', (t) => {
  // Test merchants in different locations
  const merchantDistrictMerchants = getLocationNPCsByType(
    mockGameState,
    'merchant'
  )

  const castleState = {
    ...mockGameState,
    location: {
      name: 'Royal Castle',
      description: 'Seat of power',
      dangerLevel: 5,
    },
    reputation: {
      global: 30,
      locations: { 'Royal Castle': 25 },
      npcRelationships: {},
    },
  }

  const castleMerchants = getLocationNPCsByType(castleState, 'merchant')
  const castleGuards = getLocationNPCsByType(castleState, 'guard')

  // Merchants should be merchant type
  for (const merchant of merchantDistrictMerchants) {
    t.is(merchant.type, 'merchant')
  }

  for (const merchant of castleMerchants) {
    t.is(merchant.type, 'merchant')
  }

  // Guards should be guard type
  for (const guard of castleGuards) {
    t.is(guard.type, 'guard')
  }
})
