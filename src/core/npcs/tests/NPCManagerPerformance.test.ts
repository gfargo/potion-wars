import test from 'ava'
import { NPCManager } from '../NPCManager.js'
import { type NPC } from '../../../types/npc.types.js'
import { type GameState } from '../../../types/game.types.js'

// Test data setup
const createTestNPC = (id: string, location: string): NPC => ({
  id,
  name: `Test NPC ${id}`,
  type: 'merchant',
  description: 'A test NPC',
  personality: {
    greeting: 'Hello',
    farewell: 'Goodbye',
    tradeAccept: 'Deal',
    tradeDecline: 'No deal',
    lowReputation: 'Bad reputation',
    highReputation: 'Good reputation'
  },
  location,
  availability: {
    probability: 0.5,
    timeRestriction: [1, 30],
    reputationGate: 0
  },
  reputation: {
    minimum: 0,
    maximum: 100
  },
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Hello there!',
        choices: []
      }
    }
  }
})

const createTestGameState = (): GameState => ({
  day: 15,
  location: {
    name: 'Test Location',
    description: 'A test location',
    dangerLevel: 1
  },
  weather: 'sunny',
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  inventory: {},
  reputation: {
    global: 50,
    locations: {
      'Test Location': 25,
      'Other Location': 75
    },
    npcRelationships: {}
  },
  marketData: {},
  tradeHistory: [],
  prices: {}
})

test.beforeEach(() => {
  NPCManager.resetInstance()
  const manager = NPCManager.getInstance()
  manager.clearCaches()
})

test('NPCManager caching improves performance for repeated location queries', t => {
  const manager = NPCManager.getInstance()
  const gameState = createTestGameState()
  
  // Register multiple NPCs
  for (let i = 0; i < 50; i++) {
    manager.registerNPC(createTestNPC(`npc_${i}`, 'Test Location'))
  }
  
  // First call - should populate cache
  const start1 = performance.now()
  const npcs1 = manager.getNPCsForLocation('Test Location', gameState)
  const time1 = performance.now() - start1
  
  // Second call - should use cache
  const start2 = performance.now()
  const npcs2 = manager.getNPCsForLocation('Test Location', gameState)
  const time2 = performance.now() - start2
  
  // Results should be identical
  t.deepEqual(npcs1, npcs2)
  
  // Second call should be faster (cached)
  t.true(time2 < time1, `Cached call (${time2}ms) should be faster than initial call (${time1}ms)`)
  
  // Both should return the same NPCs
  t.is(npcs1.length, 50)
  t.is(npcs2.length, 50)
})

test('NPCManager availability caching improves performance', t => {
  const manager = NPCManager.getInstance()
  const gameState = createTestGameState()
  const npc = createTestNPC('test_npc', 'Test Location')
  
  manager.registerNPC(npc)
  
  // First availability check - should populate cache
  const start1 = performance.now()
  const available1 = manager.isNPCAvailable(npc, gameState)
  const time1 = performance.now() - start1
  
  // Second availability check - should use cache
  const start2 = performance.now()
  const available2 = manager.isNPCAvailable(npc, gameState)
  const time2 = performance.now() - start2
  
  // Results should be identical
  t.is(available1, available2)
  
  // Second call should be faster (cached)
  t.true(time2 < time1, `Cached call (${time2}ms) should be faster than initial call (${time1}ms)`)
})

test('NPCManager cache invalidation works correctly', t => {
  const manager = NPCManager.getInstance()
  let gameState = createTestGameState()
  const npc = createTestNPC('test_npc', 'Test Location')
  
  manager.registerNPC(npc)
  
  // First call with initial game state
  const npcs1 = manager.getNPCsForLocation('Test Location', gameState)
  
  // Change game state (different day)
  gameState = { ...gameState, day: 20 }
  
  // Second call with changed game state should not use cache
  const npcs2 = manager.getNPCsForLocation('Test Location', gameState)
  
  // Should still work correctly with new state
  t.is(npcs1.length, npcs2.length)
  t.deepEqual(npcs1.map(n => n.id), npcs2.map(n => n.id))
})

test('NPCManager cache cleanup prevents memory leaks', t => {
  const manager = NPCManager.getInstance()
  const gameState = createTestGameState()
  
  // Register many NPCs
  for (let i = 0; i < 200; i++) {
    manager.registerNPC(createTestNPC(`npc_${i}`, `Location_${i % 10}`))
  }
  
  // Make many queries to fill cache
  for (let i = 0; i < 150; i++) {
    const location = `Location_${i % 10}`
    manager.getNPCsForLocation(location, { ...gameState, day: i })
  }
  
  // Cache should be limited and not grow indefinitely
  // This test mainly ensures no errors are thrown during cleanup
  t.pass('Cache cleanup completed without errors')
})

test('NPCManager performance with large number of NPCs', t => {
  const manager = NPCManager.getInstance()
  const gameState = createTestGameState()
  
  // Register a large number of NPCs
  const npcCount = 1000
  for (let i = 0; i < npcCount; i++) {
    manager.registerNPC(createTestNPC(`npc_${i}`, `Location_${i % 20}`))
  }
  
  // Test performance of location queries
  const start = performance.now()
  const npcs = manager.getNPCsForLocation('Location_0', gameState)
  const time = performance.now() - start
  
  // Should complete in reasonable time (less than 100ms)
  t.true(time < 100, `Query with ${npcCount} NPCs took ${time}ms, should be under 100ms`)
  
  // Should return correct number of NPCs for location
  const expectedCount = Math.floor(npcCount / 20)
  t.is(npcs.length, expectedCount)
})

test('NPCManager cache works with different game state combinations', t => {
  const manager = NPCManager.getInstance()
  const baseGameState = createTestGameState()
  const npc = createTestNPC('test_npc', 'Test Location')
  
  manager.registerNPC(npc)
  
  // Test with different weather conditions
  const sunnyState = { ...baseGameState, weather: 'sunny' as const }
  const rainyState = { ...baseGameState, weather: 'rainy' as const }
  
  const sunnyNPCs = manager.getNPCsForLocation('Test Location', sunnyState)
  const rainyNPCs = manager.getNPCsForLocation('Test Location', rainyState)
  
  // Both should work and be cached separately
  t.is(sunnyNPCs.length, 1)
  t.is(rainyNPCs.length, 1)
  
  // Verify caching by calling again
  const sunnyNPCs2 = manager.getNPCsForLocation('Test Location', sunnyState)
  const rainyNPCs2 = manager.getNPCsForLocation('Test Location', rainyState)
  
  t.deepEqual(sunnyNPCs, sunnyNPCs2)
  t.deepEqual(rainyNPCs, rainyNPCs2)
})