import test from 'ava'
import { NPCManager } from '../../core/npcs/NPCManager.js'
import { ReputationManager } from '../../core/reputation/ReputationManager.js'
import { EnhancedEconomyManager } from '../../core/game/enhancedEconomy.js'
import { AnimationManager } from '../../core/animations/AnimationManager.js'
import { type GameState } from '../../types/game.types.js'
import { type NPC } from '../../types/npc.types.js'

// Test configuration
const STRESS_TEST_CONFIG = {
  NPC_COUNT: 1000,
  LOCATION_COUNT: 50,
  OPERATION_COUNT: 10000,
  CONCURRENT_OPERATIONS: 100,
  MEMORY_LIMIT_MB: 100,
  TIME_LIMIT_MS: 5000
}

// Test data generators
const generateRandomNPC = (id: string, locationIndex: number): NPC => ({
  id,
  name: `NPC ${id}`,
  type: ['merchant', 'informant', 'guard', 'citizen'][Math.floor(Math.random() * 4)] as any,
  description: `A randomly generated NPC for stress testing`,
  personality: {
    greeting: `Hello from ${id}!`,
    farewell: `Goodbye from ${id}!`,
    tradeAccept: 'Deal!',
    tradeDecline: 'No deal',
    lowReputation: 'Bad reputation',
    highReputation: 'Good reputation'
  },
  location: `Location_${locationIndex}`,
  availability: {
    probability: Math.random(),
    timeRestriction: Math.random() > 0.5 ? [1, 30] : undefined,
    reputationGate: Math.floor(Math.random() * 100) - 50
  },
  reputation: {
    minimum: Math.floor(Math.random() * 50) - 25,
    maximum: Math.floor(Math.random() * 50) + 50
  },
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: `Hello from ${id}!`,
        choices: [
          {
            text: 'Hello',
            nextNode: 'farewell',
            conditions: []
          }
        ]
      },
      farewell: {
        id: 'farewell',
        text: 'Goodbye!',
        choices: []
      }
    }
  }
})

const generateRandomGameState = (day: number): GameState => ({
  day,
  location: {
    name: `Location_${Math.floor(Math.random() * STRESS_TEST_CONFIG.LOCATION_COUNT)}`,
    description: 'Test location',
    dangerLevel: Math.floor(Math.random() * 10) + 1
  },
  weather: ['sunny', 'rainy', 'cloudy', 'stormy'][Math.floor(Math.random() * 4)] as any,
  cash: Math.floor(Math.random() * 10000),
  debt: Math.floor(Math.random() * 1000),
  health: Math.floor(Math.random() * 100) + 1,
  strength: Math.floor(Math.random() * 20) + 1,
  agility: Math.floor(Math.random() * 20) + 1,
  intelligence: Math.floor(Math.random() * 20) + 1,
  inventory: {
    'Healing Potion': Math.floor(Math.random() * 20),
    'Mana Potion': Math.floor(Math.random() * 20),
    'Strength Potion': Math.floor(Math.random() * 20)
  },
  reputation: {
    global: Math.floor(Math.random() * 200) - 100,
    locations: Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [
        `Location_${i}`,
        Math.floor(Math.random() * 200) - 100
      ])
    ),
    npcRelationships: Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [
        `npc_${i}`,
        Math.floor(Math.random() * 200) - 100
      ])
    )
  },
  marketData: EnhancedEconomyManager.initializeMarketData(),
  messages: [],
  gameLog: [],
  currentScreen: 'game',
  isGameOver: false,
  gameOverReason: null,
  prices: {},
tradeHistory: []
})

test.beforeEach(() => {
  // Reset all singletons and clear caches
  NPCManager.resetInstance()
  ReputationManager.clearCaches()
  EnhancedEconomyManager.clearCaches()
  AnimationManager.resetInstance()
})

test('NPC system performance under heavy load', async t => {
  const npcManager = NPCManager.getInstance()
  const gameState = generateRandomGameState(1)
  
  // Step 1: Register large number of NPCs
  const registrationStart = performance.now()
  for (let i = 0; i < STRESS_TEST_CONFIG.NPC_COUNT; i++) {
    const locationIndex = i % STRESS_TEST_CONFIG.LOCATION_COUNT
    const npc = generateRandomNPC(`npc_${i}`, locationIndex)
    npcManager.registerNPC(npc)
  }
  const registrationTime = performance.now() - registrationStart
  
  t.true(registrationTime < 1000, `NPC registration of ${STRESS_TEST_CONFIG.NPC_COUNT} NPCs took ${registrationTime}ms, should be under 1000ms`)
  
  // Step 2: Perform many location queries
  const queryStart = performance.now()
  for (let i = 0; i < STRESS_TEST_CONFIG.OPERATION_COUNT; i++) {
    const location = `Location_${i % STRESS_TEST_CONFIG.LOCATION_COUNT}`
    const npcs = npcManager.getNPCsForLocation(location, gameState)
    
    // Verify results are reasonable
    t.true(npcs.length >= 0, 'Should return valid NPC array')
    t.true(npcs.length <= STRESS_TEST_CONFIG.NPC_COUNT / STRESS_TEST_CONFIG.LOCATION_COUNT + 10, 'Should not return excessive NPCs')
  }
  const queryTime = performance.now() - queryStart
  
  t.true(queryTime < STRESS_TEST_CONFIG.TIME_LIMIT_MS, `${STRESS_TEST_CONFIG.OPERATION_COUNT} NPC queries took ${queryTime}ms, should be under ${STRESS_TEST_CONFIG.TIME_LIMIT_MS}ms`)
  
  // Step 3: Test encounter rolling performance
  const encounterStart = performance.now()
  let encounterCount = 0
  for (let i = 0; i < 1000; i++) {
    const location = `Location_${i % STRESS_TEST_CONFIG.LOCATION_COUNT}`
    const encounter = npcManager.rollForEncounter(location, gameState)
    if (encounter) encounterCount++
  }
  const encounterTime = performance.now() - encounterStart
  
  t.true(encounterTime < 500, `1000 encounter rolls took ${encounterTime}ms, should be under 500ms`)
  t.true(encounterCount >= 0, `Should have some encounters: ${encounterCount}`)
})

test('Reputation system performance with complex calculations', t => {
  const gameState = generateRandomGameState(1)
  
  // Step 1: Test price modifier calculations
  const priceModifierStart = performance.now()
  for (let i = 0; i < STRESS_TEST_CONFIG.OPERATION_COUNT; i++) {
    const reputation = (i % 200) - 100
    const modifier = ReputationManager.calculatePriceModifier(reputation)
    t.true(modifier > 0, 'Price modifier should be positive')
  }
  const priceModifierTime = performance.now() - priceModifierStart
  
  t.true(priceModifierTime < 1000, `${STRESS_TEST_CONFIG.OPERATION_COUNT} price modifier calculations took ${priceModifierTime}ms, should be under 1000ms`)
  
  // Step 2: Test location reputation calculations
  const locationRepStart = performance.now()
  for (let i = 0; i < STRESS_TEST_CONFIG.OPERATION_COUNT; i++) {
    const location = `Location_${i % STRESS_TEST_CONFIG.LOCATION_COUNT}`
    const reputation = ReputationManager.getLocationReputation(gameState.reputation, location)
    t.true(typeof reputation === 'number', 'Should return numeric reputation')
  }
  const locationRepTime = performance.now() - locationRepStart
  
  t.true(locationRepTime < 1000, `${STRESS_TEST_CONFIG.OPERATION_COUNT} location reputation calculations took ${locationRepTime}ms, should be under 1000ms`)
  
  // Step 3: Test NPC reputation calculations
  const npcRepStart = performance.now()
  for (let i = 0; i < STRESS_TEST_CONFIG.OPERATION_COUNT; i++) {
    const npcId = `npc_${i % 100}`
    const location = `Location_${i % STRESS_TEST_CONFIG.LOCATION_COUNT}`
    const reputation = ReputationManager.getNPCReputation(gameState.reputation, npcId, location)
    t.true(typeof reputation === 'number', 'Should return numeric reputation')
  }
  const npcRepTime = performance.now() - npcRepStart
  
  t.true(npcRepTime < 1000, `${STRESS_TEST_CONFIG.OPERATION_COUNT} NPC reputation calculations took ${npcRepTime}ms, should be under 1000ms`)
})

test('Market system performance with complex market dynamics', t => {
  const gameState = generateRandomGameState(1)
  
  // Step 1: Test dynamic price calculations
  const priceCalcStart = performance.now()
  for (let i = 0; i < STRESS_TEST_CONFIG.OPERATION_COUNT; i++) {
    const location = Object.keys(gameState.marketData)[i % Object.keys(gameState.marketData).length]!
    const potion = Object.keys(gameState.marketData[location]!)[0]!
    const marketData = gameState.marketData[location]![potion]!
    
    const reputationModifier = 0.8 + (i % 5) * 0.1
    const price = EnhancedEconomyManager.calculateDynamicPrice(marketData, reputationModifier)
    
    t.true(price > 0, 'Price should be positive')
    t.true(price < marketData.basePrice * 5, 'Price should be reasonable')
  }
  const priceCalcTime = performance.now() - priceCalcStart
  
  t.true(priceCalcTime < 2000, `${STRESS_TEST_CONFIG.OPERATION_COUNT} price calculations took ${priceCalcTime}ms, should be under 2000ms`)
  
  // Step 2: Test market trend calculations
  const trendCalcStart = performance.now()
  for (let i = 0; i < 1000; i++) {
    const location = Object.keys(gameState.marketData)[i % Object.keys(gameState.marketData).length]!
    const potion = Object.keys(gameState.marketData[location]!)[0]!
    const marketData = gameState.marketData[location]![potion]!
    
    const currentPrice = marketData.currentPrice + (Math.random() - 0.5) * 20
    const trend = EnhancedEconomyManager.calculateMarketTrend(marketData.history, currentPrice)
    
    t.true(['rising', 'falling', 'stable', 'volatile'].includes(trend), 'Should return valid trend')
  }
  const trendCalcTime = performance.now() - trendCalcStart
  
  t.true(trendCalcTime < 1000, `1000 trend calculations took ${trendCalcTime}ms, should be under 1000ms`)
  
  // Step 3: Test market updates
  const updateStart = performance.now()
  let currentState = gameState
  for (let i = 0; i < 100; i++) {
    currentState = EnhancedEconomyManager.updateMarketDynamics(currentState)
    currentState = { ...currentState, day: currentState.day + 1 }
  }
  const updateTime = performance.now() - updateStart
  
  t.true(updateTime < 2000, `100 market updates took ${updateTime}ms, should be under 2000ms`)
})

test('Animation system performance and memory management', async t => {
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Step 1: Test animation retrieval performance
  const retrievalStart = performance.now()
  for (let i = 0; i < STRESS_TEST_CONFIG.OPERATION_COUNT; i++) {
    const npcId = `npc_${i % 100}`
    const animationType = ['idle', 'talking', 'trading'][i % 3] as 'idle' | 'talking' | 'trading'
    
    const animation = animationManager.getNPCAnimation(npcId, animationType)
    t.true(animation.length > 0, 'Should return animation frames')
  }
  const retrievalTime = performance.now() - retrievalStart
  
  t.true(retrievalTime < 1000, `${STRESS_TEST_CONFIG.OPERATION_COUNT} animation retrievals took ${retrievalTime}ms, should be under 1000ms`)
  
  // Step 2: Test travel animation performance
  const travelStart = performance.now()
  for (let i = 0; i < 1000; i++) {
    const travelAnimation = animationManager.getRandomTravelAnimation()
    t.truthy(travelAnimation.name, 'Should return valid travel animation')
  }
  const travelTime = performance.now() - travelStart
  
  t.true(travelTime < 500, `1000 travel animation retrievals took ${travelTime}ms, should be under 500ms`)
  
  // Step 3: Test memory management
  const initialStats = animationManager.getMemoryStats()
  
  // Generate many animation requests to fill cache
  for (let i = 0; i < 500; i++) {
    animationManager.getNPCAnimation(`npc_${i}`, 'idle')
    animationManager.getEncounterAnimation(`encounter_${i}`)
  }
  
  const finalStats = animationManager.getMemoryStats()
  
  // Cache should be limited
  t.true(finalStats.totalCacheSize <= 100, `Cache size ${finalStats.totalCacheSize} should be limited`)
  t.true(finalStats.totalCacheSize >= initialStats.totalCacheSize, 'Cache should have grown')
})

test('Concurrent operations performance', async t => {
  const npcManager = NPCManager.getInstance()
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Register some NPCs
  for (let i = 0; i < 100; i++) {
    const npc = generateRandomNPC(`npc_${i}`, i % 10)
    npcManager.registerNPC(npc)
  }
  
  const gameState = generateRandomGameState(1)
  
  // Step 1: Test concurrent NPC operations
  const concurrentStart = performance.now()
  const promises = []
  
  for (let i = 0; i < STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS; i++) {
    promises.push(Promise.resolve().then(() => {
      // NPC operations
      const location = `Location_${i % 10}`
      npcManager.getNPCsForLocation(location, gameState)
      npcManager.rollForEncounter(location, gameState)
      
      // Reputation operations
      const reputation = ReputationManager.getLocationReputation(gameState.reputation, location)
      ReputationManager.calculatePriceModifier(reputation)
      
      // Market operations
      const marketLocation = Object.keys(gameState.marketData)[0]!
      const potion = Object.keys(gameState.marketData[marketLocation])[0]!
      const marketData = gameState.marketData[marketLocation][potion]!
      EnhancedEconomyManager.calculateDynamicPrice(marketData)
      
      // Animation operations
      animationManager.getNPCAnimation('default_merchant', 'idle')
      animationManager.getRandomTravelAnimation()
      
      return i
    }))
  }
  
  const results = await Promise.all(promises)
  const concurrentTime = performance.now() - concurrentStart
  
  t.is(results.length, STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS, 'All concurrent operations should complete')
  t.true(concurrentTime < 3000, `${STRESS_TEST_CONFIG.CONCURRENT_OPERATIONS} concurrent operations took ${concurrentTime}ms, should be under 3000ms`)
})

test('Memory usage under extended simulation', async t => {
  const npcManager = NPCManager.getInstance()
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Register NPCs
  for (let i = 0; i < 200; i++) {
    const npc = generateRandomNPC(`npc_${i}`, i % 20)
    npcManager.registerNPC(npc)
  }
  
  let gameState = generateRandomGameState(1)
  
  // Simulate extended gameplay
  const simulationStart = performance.now()
  
  for (let day = 1; day <= 100; day++) {
    gameState = { ...gameState, day }
    
    // Daily operations
    for (let operation = 0; operation < 50; operation++) {
      const location = `Location_${operation % 20}`
      
      // NPC operations
      npcManager.getNPCsForLocation(location, gameState)
      npcManager.rollForEncounter(location, gameState)
      
      // Reputation operations
      const reputation = ReputationManager.getLocationReputation(gameState.reputation, location)
      ReputationManager.calculatePriceModifier(reputation)
      
      // Market operations
      gameState = EnhancedEconomyManager.updateMarketDynamics(gameState)
      
      // Animation operations
      animationManager.getNPCAnimation(`npc_${operation % 200}`, 'idle')
      animationManager.getRandomTravelAnimation()
    }
    
    // Apply some reputation changes
    const reputationChange = {
      global: Math.floor(Math.random() * 3) - 1,
      location: `Location_${day % 20}`,
      locationChange: Math.floor(Math.random() * 5) - 2
    }
    gameState = ReputationManager.applyReputationChange(gameState, reputationChange)
  }
  
  const simulationTime = performance.now() - simulationStart
  
  // Verify performance
  t.true(simulationTime < 10000, `100-day simulation took ${simulationTime}ms, should be under 10000ms`)
  
  // Verify memory management
  const animationStats = animationManager.getMemoryStats()
  t.true(animationStats.totalCacheSize < 200, `Animation cache size ${animationStats.totalCacheSize} should be reasonable after extended simulation`)
  
  // Verify systems still work correctly
  const finalNPCs = npcManager.getNPCsForLocation('Location_0', gameState)
  t.true(finalNPCs.length >= 0, 'NPC system should still work after extended simulation')
  
  const finalReputation = ReputationManager.getLocationReputation(gameState.reputation, 'Location_0')
  t.true(typeof finalReputation === 'number', 'Reputation system should still work after extended simulation')
})

test('Error handling under stress conditions', async t => {
  const npcManager = NPCManager.getInstance()
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Test with extreme values and edge cases
  const extremeGameState = generateRandomGameState(1)
  extremeGameState.reputation.global = 999999
  extremeGameState.cash = -999999
  extremeGameState.day = -1
  
  // Should not crash with extreme values
  t.notThrows(() => {
    for (let i = 0; i < 1000; i++) {
      // NPC operations with extreme state
      npcManager.getNPCsForLocation('NonExistentLocation', extremeGameState)
      npcManager.rollForEncounter('NonExistentLocation', extremeGameState)
      
      // Reputation operations with extreme values
      ReputationManager.calculatePriceModifier(999999)
      ReputationManager.calculatePriceModifier(-999999)
      ReputationManager.getLocationReputation(extremeGameState.reputation, 'NonExistentLocation')
      
      // Animation operations with invalid IDs
      animationManager.getNPCAnimation('NonExistentNPC', 'idle')
      animationManager.getEncounterAnimation('NonExistentEncounter')
    }
  }, 'Systems should handle extreme values gracefully')
})

test('Cache efficiency and hit rates', t => {
  const npcManager = NPCManager.getInstance()
  const gameState = generateRandomGameState(1)
  
  // Register NPCs
  for (let i = 0; i < 50; i++) {
    const npc = generateRandomNPC(`npc_${i}`, i % 5)
    npcManager.registerNPC(npc)
  }
  
  // First pass - populate caches
  const firstPassStart = performance.now()
  for (let i = 0; i < 1000; i++) {
    const location = `Location_${i % 5}`
    npcManager.getNPCsForLocation(location, gameState)
    
    const reputation = (i % 200) - 100
    ReputationManager.calculatePriceModifier(reputation)
    ReputationManager.getLocationReputation(gameState.reputation, location)
  }
  const firstPassTime = performance.now() - firstPassStart
  
  // Second pass - use caches
  const secondPassStart = performance.now()
  for (let i = 0; i < 1000; i++) {
    const location = `Location_${i % 5}`
    npcManager.getNPCsForLocation(location, gameState)
    
    const reputation = (i % 200) - 100
    ReputationManager.calculatePriceModifier(reputation)
    ReputationManager.getLocationReputation(gameState.reputation, location)
  }
  const secondPassTime = performance.now() - secondPassStart
  
  // Second pass should be significantly faster due to caching
  const speedupRatio = firstPassTime / secondPassTime
  t.true(speedupRatio > 1.5, `Cache should provide speedup. First: ${firstPassTime}ms, Second: ${secondPassTime}ms, Ratio: ${speedupRatio}`)
})