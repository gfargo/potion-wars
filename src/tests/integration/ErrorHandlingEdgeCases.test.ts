import test from 'ava'
import { NPCManager, NPCError } from '../../core/npcs/NPCManager.js'
import { ReputationManager } from '../../core/reputation/ReputationManager.js'
import { EnhancedEconomyManager } from '../../core/game/enhancedEconomy.js'
import { AnimationManager } from '../../core/animations/AnimationManager.js'
import { DialogueEngine } from '../../core/dialogue/DialogueEngine.js'
import { NPCTrading } from '../../core/npcs/NPCTrading.js'
import { type GameState } from '../../types/game.types.js'
import { type NPC } from '../../types/npc.types.js'

// Test data setup
const createMinimalGameState = (): GameState => ({
  day: 1,
  location: { name: 'Test Location', description: 'A test location', dangerLevel: 1 },
  weather: 'sunny',
  cash: 0,
  debt: 0,
  health: 1,
  strength: 1,
  agility: 1,
  intelligence: 1,
  inventory: {},
  reputation: {
    global: 0,
    locations: {},
    npcRelationships: {}
  },
  marketData: {},
  tradeHistory: [],
  prices: {}
})

const createInvalidNPC = (): any => ({
  id: '',
  name: '',
  type: 'invalid_type',
  description: null,
  personality: null,
  location: '',
  availability: null,
  reputation: null,
  dialogue: null
})

const createValidNPC = (): NPC => ({
  id: 'test_npc',
  name: 'Test NPC',
  type: 'merchant',
  description: 'A test NPC',
  personality: {
    greeting: 'Hello',
    farewell: 'Goodbye',
    tradeAccept: 'Deal',
    tradeDecline: 'No deal',
    lowReputation: 'Bad rep',
    highReputation: 'Good rep'
  },
  location: 'Test Location',
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
        text: 'Hello!',
        choices: []
      }
    }
  }
})

test.beforeEach(() => {
  // Reset all singletons and clear caches
  NPCManager.resetInstance()
  ReputationManager.clearCaches()
  EnhancedEconomyManager.clearCaches()
  AnimationManager.resetInstance()
})

test('NPCManager handles invalid NPC registration gracefully', t => {
  const npcManager = NPCManager.getInstance()
  const invalidNPC = createInvalidNPC()
  
  // Should throw specific error for invalid NPC data
  t.throws(() => {
    npcManager.registerNPC(invalidNPC)
  }, { instanceOf: NPCError, message: /Invalid NPC data/ })
  
  // Should handle null/undefined NPCs
  t.throws(() => {
    npcManager.registerNPC(null as any)
  }, { instanceOf: Error })
  
  t.throws(() => {
    npcManager.registerNPC(undefined as any)
  }, { instanceOf: Error })
  
  // Should handle NPCs with missing required fields
  const partialNPC = { ...createValidNPC() }
  delete (partialNPC as any).id
  
  t.throws(() => {
    npcManager.registerNPC(partialNPC as any)
  }, { instanceOf: NPCError })
})

test('NPCManager handles extreme game state values', t => {
  const npcManager = NPCManager.getInstance()
  const npc = createValidNPC()
  npcManager.registerNPC(npc)
  
  // Test with extreme day values
  const extremeGameState = createMinimalGameState()
  extremeGameState.day = Number.MAX_SAFE_INTEGER
  
  t.notThrows(() => {
    npcManager.isNPCAvailable(npc, extremeGameState)
    npcManager.getNPCsForLocation('Test Location', extremeGameState)
  }, 'Should handle extreme day values')
  
  // Test with negative day
  extremeGameState.day = -999999
  t.notThrows(() => {
    npcManager.isNPCAvailable(npc, extremeGameState)
  }, 'Should handle negative day values')
  
  // Test with extreme reputation values
  extremeGameState.reputation.global = Number.MAX_SAFE_INTEGER
  extremeGameState.reputation.locations['Test Location'] = Number.MIN_SAFE_INTEGER
  
  t.notThrows(() => {
    npcManager.isNPCAvailable(npc, extremeGameState)
  }, 'Should handle extreme reputation values')
})

test('NPCManager handles non-existent locations and NPCs', t => {
  const npcManager = NPCManager.getInstance()
  const gameState = createMinimalGameState()
  
  // Test with non-existent location
  const npcs = npcManager.getNPCsForLocation('NonExistentLocation', gameState)
  t.is(npcs.length, 0, 'Should return empty array for non-existent location')
  
  // Test encounter rolling with no NPCs
  const encounter = npcManager.rollForEncounter('NonExistentLocation', gameState)
  t.is(encounter, null, 'Should return null when no NPCs available')
  
  // Test getting non-existent NPC
  const nonExistentNPC = npcManager.getNPC('non_existent_id')
  t.is(nonExistentNPC, undefined, 'Should return undefined for non-existent NPC')
  
  // Test with empty string location
  const emptyLocationNPCs = npcManager.getNPCsForLocation('', gameState)
  t.is(emptyLocationNPCs.length, 0, 'Should handle empty string location')
})

test('ReputationManager handles extreme and invalid values', t => {
  // Test with extreme reputation values
  const extremeValues = [
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
    Infinity,
    -Infinity,
    NaN
  ]
  
  for (const value of extremeValues) {
    t.notThrows(() => {
      const modifier = ReputationManager.calculatePriceModifier(value)
      t.true(typeof modifier === 'number', `Should return number for value ${value}`)
      t.true(modifier > 0, `Price modifier should be positive for value ${value}`)
    }, `Should handle extreme value: ${value}`)
  }
  
  // Test with invalid reputation state
  const invalidReputationState = {
    global: 'invalid' as any,
    locations: null as any,
    npcRelationships: undefined as any
  }
  
  t.notThrows(() => {
    ReputationManager.getLocationReputation(invalidReputationState, 'Test Location')
  }, 'Should handle invalid reputation state gracefully')
  
  // Test with null/undefined parameters
  t.notThrows(() => {
    ReputationManager.getLocationReputation(null as any, 'Test Location')
    ReputationManager.getLocationReputation(undefined as any, 'Test Location')
    ReputationManager.getNPCReputation(null as any, 'test_npc', 'Test Location')
  }, 'Should handle null/undefined reputation state')
})

test('ReputationManager handles invalid reputation changes', t => {
  const gameState = createMinimalGameState()
  
  // Test with invalid reputation change objects
  const invalidChanges = [
    null,
    undefined,
    { invalid: 'field' },
    { global: 'not_a_number' },
    { locationChange: 'invalid', location: null }
  ]
  
  for (const change of invalidChanges) {
    t.notThrows(() => {
      ReputationManager.applyReputationChange(gameState, change as any)
    }, `Should handle invalid reputation change: ${JSON.stringify(change)}`)
  }
  
  // Test with extreme reputation changes
  const extremeChange = {
    global: Number.MAX_SAFE_INTEGER,
    location: 'Test Location',
    locationChange: Number.MIN_SAFE_INTEGER,
    npc: 'test_npc',
    npcChange: Infinity
  }
  
  t.notThrows(() => {
    const result = ReputationManager.applyReputationChange(gameState, extremeChange)
    t.true(typeof result.reputation.global === 'number', 'Should clamp extreme values')
    t.true(result.reputation.global >= -100 && result.reputation.global <= 100, 'Should clamp to reasonable bounds')
  }, 'Should handle extreme reputation changes')
})

test('EnhancedEconomyManager handles invalid market data', t => {
  // Test with invalid market data
  const invalidMarketData = {
    basePrice: 'invalid' as any,
    currentPrice: null as any,
    demand: -999,
    supply: Infinity,
    trend: 'invalid_trend' as any,
    history: null as any,
    volatility: NaN,
    lastUpdated: 'not_a_number' as any
  }
  
  t.notThrows(() => {
    const price = EnhancedEconomyManager.calculateDynamicPrice(invalidMarketData)
    t.true(typeof price === 'number', 'Should return number even with invalid data')
    t.true(price >= 0, 'Should return non-negative price')
  }, 'Should handle invalid market data gracefully')
  
  // Test with empty/null history
  /*
  const emptyHistoryData = {
    basePrice: 100,
    currentPrice: 100,
    demand: 0.5,
    supply: 0.5,
    trend: 'stable' as const,
    history: [],
    volatility: 0.1,
    lastUpdated: 1
  }
  */
  
  t.notThrows(() => {
    const trend = EnhancedEconomyManager.calculateMarketTrend([], 100)
    t.is(trend, 'stable', 'Should return stable trend for empty history')
  }, 'Should handle empty price history')
  
  // Test with null/undefined history entries
  const corruptedHistory = [
    null as any,
    undefined as any,
    { day: 'invalid', price: null, volume: undefined },
    { day: 1, price: 100, volume: 5, playerTransaction: false }
  ]
  
  t.notThrows(() => {
    EnhancedEconomyManager.calculateMarketTrend(corruptedHistory, 100)
  }, 'Should handle corrupted history entries')
})

test('EnhancedEconomyManager handles extreme market conditions', t => {
  const extremeMarketData = {
    basePrice: 0,
    currentPrice: 0,
    demand: 0,
    supply: 0,
    trend: 'stable' as const,
    history: [],
    volatility: 999,
    lastUpdated: -1
  }
  
  t.notThrows(() => {
    const price = EnhancedEconomyManager.calculateDynamicPrice(extremeMarketData)
    t.true(price >= 0, 'Should handle zero base price')
  }, 'Should handle extreme market conditions')
  
  // Test with division by zero scenarios
  const zeroDivisionData = {
    basePrice: 100,
    currentPrice: 100,
    demand: 0.5,
    supply: 0, // This could cause division by zero
    trend: 'stable' as const,
    history: [],
    volatility: 0.1,
    lastUpdated: 1
  }
  
  t.notThrows(() => {
    const price = EnhancedEconomyManager.calculateDynamicPrice(zeroDivisionData)
    t.true(typeof price === 'number', 'Should handle zero supply gracefully')
    t.false(isNaN(price), 'Should not return NaN')
  }, 'Should handle potential division by zero')
})

test('AnimationManager handles invalid animation data', async t => {
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Test with invalid animation frames
  const invalidFrames = [
    null,
    undefined,
    'not_an_array',
    [null, undefined, 'invalid_frame'],
    [['valid_line'], null, ['another_valid_line']]
  ]
  
  for (const frames of invalidFrames) {
    const validation = animationManager.validateAnimationFrames(frames as any)
    t.false(validation.isValid, `Should detect invalid frames: ${JSON.stringify(frames)}`)
    t.true(validation.errors.length > 0, 'Should provide error messages')
  }
  
  // Test with non-existent NPC animations
  t.notThrows(() => {
    const animation = animationManager.getNPCAnimation('non_existent_npc', 'idle')
    t.true(animation.length > 0, 'Should return default animation for non-existent NPC')
  }, 'Should handle non-existent NPC gracefully')
  
  // Test with invalid animation types
  t.notThrows(() => {
    const animation = animationManager.getNPCAnimation('default_merchant', 'invalid_type' as any)
    t.true(animation.length > 0, 'Should return default animation for invalid type')
  }, 'Should handle invalid animation types')
})

test('AnimationManager handles memory pressure and cleanup', async t => {
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Fill cache with many animations to trigger cleanup
  for (let i = 0; i < 1000; i++) {
    animationManager.getNPCAnimation(`npc_${i}`, 'idle')
    animationManager.getEncounterAnimation(`encounter_${i}`)
    
    // Create large optimization requests
    const largeFrames = Array.from({ length: 100 }, () => ['large', 'frame', 'data'])
    animationManager.optimizeAnimationData(largeFrames, {
      removeEmptyFrames: true,
      normalizeFrameWidth: true,
      trimWhitespace: true
    })
  }
  
  // Should not crash or consume excessive memory
  const stats = animationManager.getMemoryStats()
  t.true(stats.totalCacheSize <= 100, 'Should limit cache size under memory pressure')
  
  // Should still function correctly after cleanup
  t.notThrows(() => {
    const animation = animationManager.getNPCAnimation('default_merchant', 'idle')
    t.true(animation.length > 0, 'Should still work after cache cleanup')
  }, 'Should function correctly after memory cleanup')
})

test('DialogueEngine handles malformed dialogue trees', t => {
  const gameState = createMinimalGameState()
  
  // Test with NPC having malformed dialogue
  const malformedNPC = createValidNPC()
  malformedNPC.dialogue = {
    rootNode: 'non_existent_node',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Hello!',
        choices: [
          {
            text: 'Go to non-existent node',
            nextNode: 'non_existent',
            conditions: []
          }
        ]
      }
    }
  }
  
  t.notThrows(() => {
    const node = DialogueEngine.processDialogue(malformedNPC, gameState)
    t.truthy(node, 'Should return some node even with malformed dialogue')
  }, 'Should handle malformed dialogue trees gracefully')
  
  // Test with circular dialogue references
  const circularNPC = createValidNPC()
  circularNPC.dialogue = {
    rootNode: 'node1',
    nodes: {
      node1: {
        id: 'node1',
        text: 'Node 1',
        choices: [
          {
            text: 'Go to node 2',
            nextNode: 'node2',
            conditions: []
          }
        ]
      },
      node2: {
        id: 'node2',
        text: 'Node 2',
        choices: [
          {
            text: 'Go to node 1',
            nextNode: 'node1',
            conditions: []
          }
        ]
      }
    }
  }
  
  t.notThrows(() => {
    DialogueEngine.processDialogue(circularNPC, gameState)
  }, 'Should handle circular dialogue references')
})

test('NPCTrading handles invalid trade scenarios', t => {
  const gameState = createMinimalGameState()

  // Test with NPC having invalid trades
  const invalidTradeNPC = createValidNPC()
  invalidTradeNPC.trades = [
    {
      offer: '',
      price: -100,
      quantity: 0,
      reputationRequirement: NaN
    },
    null as any,
    undefined as any
  ]

  t.notThrows(() => {
    const trades = NPCTrading.getAvailableOffers(invalidTradeNPC, gameState)
    t.true(Array.isArray(trades), 'Should return array even with invalid trades')
  }, 'Should handle invalid trade data gracefully')
  
  // Test trade execution with insufficient resources
  const validTradeNPC = createValidNPC()
  validTradeNPC.trades = [
    {
            offer: 'Expensive Item',
      price: 999999,
      quantity: 1,
      reputationRequirement: 0
    }
  ]
  
  t.notThrows(() => {
    // Get an available offer from the NPC
  const offers = NPCTrading.getAvailableOffers(validTradeNPC, gameState)
  if (offers.length === 0) {
    t.fail('No offers available from NPC')
    return
  }
  const offer = offers[0]!
  const result = NPCTrading.executeTrade(offer, validTradeNPC, gameState)
    t.false(result.success, 'Should fail trade with insufficient funds')
    t.truthy(result.message, 'Should provide error message')
  }, 'Should handle insufficient resources gracefully')
})

test('System integration with corrupted game state', t => {
  const npcManager = NPCManager.getInstance()
  const npc = createValidNPC()
  npcManager.registerNPC(npc)
  
  // Create corrupted game state
  const corruptedState = {
    day: null,
    location: undefined,
    weather: 'invalid_weather',
    cash: 'not_a_number',
    reputation: {
      global: undefined,
      locations: null,
      npcRelationships: 'invalid'
    },
    marketData: 'not_an_object',
    inventory: null
  } as any
  
  // Systems should handle corrupted state gracefully
  t.notThrows(() => {
    npcManager.isNPCAvailable(npc, corruptedState)
    npcManager.getNPCsForLocation('Test Location', corruptedState)
    ReputationManager.getLocationReputation(corruptedState.reputation, 'Test Location')
  }, 'Should handle corrupted game state gracefully')
})

test('Concurrent operations with error conditions', async t => {
  const npcManager = NPCManager.getInstance()
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Register some valid NPCs
  for (let i = 0; i < 10; i++) {
    const npc = createValidNPC()
    npc.id = `npc_${i}`
    npcManager.registerNPC(npc)
  }
  
  const gameState = createMinimalGameState()
  
  // Run concurrent operations with mix of valid and invalid requests
  const promises = []
  for (let i = 0; i < 50; i++) {
    promises.push(Promise.resolve().then(() => {
      try {
        // Mix of valid and invalid operations
        if (i % 3 === 0) {
          // Valid operations
          npcManager.getNPCsForLocation('Test Location', gameState)
          ReputationManager.calculatePriceModifier(i % 200 - 100)
          animationManager.getNPCAnimation(`npc_${i % 10}`, 'idle')
        } else if (i % 3 === 1) {
          // Invalid operations that should be handled gracefully
          npcManager.getNPCsForLocation('', null as any)
          ReputationManager.calculatePriceModifier(NaN)
          animationManager.getNPCAnimation('', 'invalid' as any)
        } else {
          // Extreme operations
          npcManager.rollForEncounter('NonExistent', gameState)
          ReputationManager.getLocationReputation(null as any, 'Test')
          animationManager.getEncounterAnimation('NonExistent')
        }
        return 'success'
      } catch (error) {
        return 'error'
      }
    }))
  }
  
  const results = await Promise.all(promises)
  
  // Most operations should succeed (handle errors gracefully)
  const successCount = results.filter(r => r === 'success').length
  t.true(successCount >= 30, `Should handle most operations gracefully: ${successCount}/50 succeeded`)
})

test('Resource cleanup and memory management under error conditions', async t => {
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Trigger various error conditions while monitoring memory
  // const initialStats = animationManager.getMemoryStats()
  
  // Generate many invalid requests
  for (let i = 0; i < 500; i++) {
    try {
      // Invalid animation requests
      animationManager.getNPCAnimation('', 'invalid' as any)
      animationManager.getEncounterAnimation('')
      animationManager.optimizeAnimationData(null as any, {} as any)
      
      // Valid requests mixed in
      if (i % 10 === 0) {
        animationManager.getNPCAnimation('default_merchant', 'idle')
      }
    } catch {
      // Ignore errors, we're testing cleanup
    }
  }
  
  const finalStats = animationManager.getMemoryStats()
  
  // Memory should be managed properly even with errors
  t.true(finalStats.totalCacheSize <= 100, 'Should limit memory usage even with error conditions')
  
  // System should still work after error conditions
  t.notThrows(() => {
    const animation = animationManager.getNPCAnimation('default_merchant', 'idle')
    t.true(animation.length > 0, 'Should still work after error conditions')
  }, 'Should maintain functionality after error conditions')
})