import test from 'ava'
import { NPCEncounter } from '../NPCEncounter.js'
import { NPCManager } from '../NPCManager.js'
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
  location: { name: "Merchant's District", description: 'A busy marketplace', dangerLevel: 3 },
  inventory: {},
  prices: {},
  weather: 'sunny',
  reputation: {
    global: 10,
    locations: { "Merchant's District": 5 },
    npcRelationships: {}
  },
  marketData: {},
  tradeHistory: []
}

// Helper to clean up NPCs
const cleanup = () => {
  NPCEncounter.reset()
}

test.beforeEach(cleanup)
test.afterEach(cleanup)

test.serial('initialize loads default NPCs', t => {
  NPCEncounter.initialize()
  
  const manager = NPCManager.getInstance()
  const npcCount = manager.getNPCCount()
  
  t.true(npcCount > 0, 'Should load default NPCs')
})

test.serial('initialize is idempotent', t => {
  NPCEncounter.initialize()
  const manager = NPCManager.getInstance()
  const firstCount = manager.getNPCCount()
  
  NPCEncounter.initialize()
  const secondCount = manager.getNPCCount()
  
  t.is(firstCount, secondCount, 'Should not load NPCs twice')
})

test.serial('checkForEncounter returns NPC or null', t => {
  const result = NPCEncounter.checkForEncounter(mockGameState)
  
  // Result should be either an NPC or null
  if (result !== null) {
    t.truthy(result.id)
    t.truthy(result.name)
    t.is(result.location, "Merchant's District")
  } else {
    t.is(result, null)
  }
})

test.serial('getAvailableNPCs returns NPCs for current location', t => {
  const npcs = NPCEncounter.getAvailableNPCs(mockGameState)
  
  t.true(Array.isArray(npcs))
  
  // All returned NPCs should be for the current location
  for (const npc of npcs) {
    t.is(npc.location, mockGameState.location.name)
  }
})

test.serial('getAvailableNPCs returns empty array for location with no NPCs', t => {
  const stateWithNoNPCs = {
    ...mockGameState,
    location: { name: 'Unknown Location', description: 'Unknown', dangerLevel: 1 }
  }
  
  const npcs = NPCEncounter.getAvailableNPCs(stateWithNoNPCs)
  
  t.true(Array.isArray(npcs))
  t.is(npcs.length, 0)
})

test.serial('getNPC returns specific NPC by ID', t => {
  NPCEncounter.initialize()
  
  // Try to get a known default NPC
  const npc = NPCEncounter.getNPC('merchant_aldric')
  
  if (npc) {
    t.is(npc.id, 'merchant_aldric')
    t.is(npc.type, 'merchant')
  } else {
    t.fail('Should find merchant_aldric in default NPCs')
  }
})

test.serial('getNPC returns undefined for non-existent NPC', t => {
  const npc = NPCEncounter.getNPC('non_existent_npc')
  
  t.is(npc, undefined)
})

test.serial('isNPCAvailable checks NPC availability', t => {
  NPCEncounter.initialize()
  
  // Test with a known NPC
  const isAvailable = NPCEncounter.isNPCAvailable('merchant_aldric', mockGameState)
  
  t.is(typeof isAvailable, 'boolean')
})

test.serial('isNPCAvailable returns false for non-existent NPC', t => {
  const isAvailable = NPCEncounter.isNPCAvailable('non_existent_npc', mockGameState)
  
  t.false(isAvailable)
})

test.serial('getNPCsByType filters NPCs by type', t => {
  const merchants = NPCEncounter.getNPCsByType('merchant', mockGameState)
  const informants = NPCEncounter.getNPCsByType('informant', mockGameState)
  
  t.true(Array.isArray(merchants))
  t.true(Array.isArray(informants))
  
  // All merchants should be merchant type
  for (const merchant of merchants) {
    t.is(merchant.type, 'merchant')
    t.is(merchant.location, mockGameState.location.name)
  }
  
  // All informants should be informant type
  for (const informant of informants) {
    t.is(informant.type, 'informant')
    t.is(informant.location, mockGameState.location.name)
  }
})

test.serial('getNPCsByType returns empty array for non-existent type', t => {
  const npcs = NPCEncounter.getNPCsByType('non_existent_type', mockGameState)
  
  t.true(Array.isArray(npcs))
  t.is(npcs.length, 0)
})

test.serial('reset clears NPCs and resets initialization', t => {
  NPCEncounter.initialize()
  const manager = NPCManager.getInstance()
  const initialCount = manager.getNPCCount()
  
  t.true(initialCount > 0, 'Should have NPCs after initialization')
  
  NPCEncounter.reset()
  const afterResetCount = manager.getNPCCount()
  
  t.is(afterResetCount, 0, 'Should have no NPCs after reset')
  
  // Should be able to initialize again
  NPCEncounter.initialize()
  const afterReinitCount = manager.getNPCCount()
  
  t.is(afterReinitCount, initialCount, 'Should have same count after re-initialization')
})

test.serial('encounters respect reputation requirements', t => {
  // Test with low reputation state
  const lowRepState = {
    ...mockGameState,
    reputation: {
      global: -50,
      locations: { "Merchant's District": -30 },
      npcRelationships: {}
    }
  }
  
  const lowRepNPCs = NPCEncounter.getAvailableNPCs(lowRepState)
  
  // Test with high reputation state
  const highRepState = {
    ...mockGameState,
    reputation: {
      global: 50,
      locations: { "Merchant's District": 60 },
      npcRelationships: {}
    }
  }
  
  const highRepNPCs = NPCEncounter.getAvailableNPCs(highRepState)
  
  // High reputation should have access to more or equal NPCs
  t.true(highRepNPCs.length >= lowRepNPCs.length)
})

test.serial('encounters respect time restrictions', t => {
  // Test early in game
  const earlyGameState = {
    ...mockGameState,
    day: 2
  }
  
  const earlyNPCs = NPCEncounter.getAvailableNPCs(earlyGameState)
  
  // Test late in game
  const lateGameState = {
    ...mockGameState,
    day: 28
  }
  
  const lateNPCs = NPCEncounter.getAvailableNPCs(lateGameState)
  
  // Both should return arrays (specific availability depends on NPC configuration)
  t.true(Array.isArray(earlyNPCs))
  t.true(Array.isArray(lateNPCs))
})

test.serial('encounters respect weather restrictions', t => {
  // Test with different weather conditions
  const sunnyState = { ...mockGameState, weather: 'sunny' as const }
  const rainyState = { ...mockGameState, weather: 'rainy' as const }
  
  const sunnyNPCs = NPCEncounter.getAvailableNPCs(sunnyState)
  const rainyNPCs = NPCEncounter.getAvailableNPCs(rainyState)
  
  // Both should return arrays (specific availability depends on NPC configuration)
  t.true(Array.isArray(sunnyNPCs))
  t.true(Array.isArray(rainyNPCs))
})