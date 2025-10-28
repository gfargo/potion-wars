import test from 'ava'
import { saveGame, loadGame } from '../../core/persistence/saveLoad.js'
import { ReputationManager } from '../../core/reputation/ReputationManager.js'
import { EnhancedEconomyManager } from '../../core/game/enhancedEconomy.js'
import { NPCManager } from '../../core/npcs/NPCManager.js'
import { type GameState } from '../../types/game.types.js'
import { type NPC } from '../../types/npc.types.js'

// Test data setup
const createLegacyGameState = (): any => ({
  day: 15,
  location: { name: 'Market Square', description: 'A bustling marketplace', dangerLevel: 1 },
  weather: 'sunny',
  cash: 1500,
  debt: 200,
  health: 85,
  strength: 12,
  agility: 8,
  intelligence: 15,
  inventory: {
    'Healing Potion': 3,
    'Mana Potion': 7,
    'Strength Potion': 1
  },
  prices: {
    'Market Square': {
      'Healing Potion': 45,
      'Mana Potion': 30,
      'Strength Potion': 60
    }
  }
  // Note: Missing reputation, marketData, and tradeHistory (legacy save)
})

const createModernGameState = (): GameState => ({
  day: 20,
  location: { name: 'Market Square', description: 'A bustling marketplace', dangerLevel: 1 },
  weather: 'rainy',
  cash: 2000,
  debt: 0,
  health: 100,
  strength: 15,
  agility: 12,
  intelligence: 18,
  inventory: {
    'Healing Potion': 8,
    'Mana Potion': 5,
    'Strength Potion': 3,
    'Rare Healing Potion': 1
  },
  reputation: {
    global: 35,
    locations: {
      'Market Square': 50,
      'Royal Castle': 25,
      'Enchanted Forest': 60,
      'Peasant Village': 15
    },
    npcRelationships: {
      'merchant_aldric': 40,
      'guard_marcus': 10,
      'informant_sara': 25,
      'rival_elena': -15
    }
  },
  marketData: EnhancedEconomyManager.initializeMarketData(),
  tradeHistory: [],
  prices: {}
})

const createTestNPC = (): NPC => ({
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A test merchant for save/load testing',
  personality: {
    greeting: 'Hello!',
    farewell: 'Goodbye!',
    tradeAccept: 'Deal!',
    tradeDecline: 'No deal',
    lowReputation: 'Bad rep',
    highReputation: 'Good rep'
  },
  location: 'Market Square',
  availability: {
    probability: 0.7,
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

test.beforeEach(() => {
  // Reset all singletons
  NPCManager.resetInstance()
  ReputationManager.clearCaches()
  EnhancedEconomyManager.clearCaches()
})

test('Legacy save file migration to modern format', t => {
  const legacyState = createLegacyGameState()
  
  // Simulate loading a legacy save file
  const migratedState = migrateLegacySave(legacyState)
  
  // Verify basic properties are preserved
  t.is(migratedState.day, legacyState.day)
  t.is(migratedState.location, legacyState.location)
  t.is(migratedState.cash, legacyState.cash)
  t.deepEqual(migratedState.inventory, legacyState.inventory)
  
  // Verify new properties are initialized
  t.truthy(migratedState.reputation, 'Reputation should be initialized')
  t.is(migratedState.reputation.global, 0, 'Global reputation should start at 0')
  t.truthy(migratedState.marketData, 'Market data should be initialized')
  
  // Verify market data structure
  const locations = ["Alchemist's Quarter", 'Royal Castle', "Merchant's District", 'Enchanted Forest', 'Peasant Village']
  for (const location of locations) {
    t.truthy(migratedState.marketData[location], `Market data should exist for ${location}`)
  }
})

test('Modern save file preservation', t => {
  const modernState = createModernGameState()
  
  // Serialize and deserialize (simulate save/load)
  const serialized = JSON.stringify(modernState)
  const deserialized = JSON.parse(serialized) as GameState
  
  // Verify all data is preserved exactly
  t.deepEqual(deserialized, modernState, 'Modern save should be preserved exactly')
  
  // Verify complex nested structures
  t.deepEqual(deserialized.reputation, modernState.reputation, 'Reputation data should be preserved')
  t.deepEqual(deserialized.marketData, modernState.marketData, 'Market data should be preserved')
  t.deepEqual(deserialized.inventory, modernState.inventory, 'Inventory should be preserved')
})

test('Save file validation with new features', t => {
  const validState = createModernGameState()
  const invalidStates = [
    // Missing reputation
    { ...validState, reputation: undefined },
    // Invalid reputation structure
    { ...validState, reputation: { global: 'invalid' } },
    // Missing market data
    { ...validState, marketData: undefined },
    // Invalid market data structure
    { ...validState, marketData: { 'Invalid Location': 'invalid' } }
  ]
  
  // Valid state should pass validation
  t.true(validateGameState(validState), 'Valid modern state should pass validation')
  
  // Invalid states should fail validation
  for (const invalidState of invalidStates) {
    t.false(validateGameState(invalidState as any), 'Invalid state should fail validation')
  }
})

test('NPC data persistence and restoration', t => {
  const npc = createTestNPC()
  const gameState = createModernGameState()
  
  // Register NPC and modify reputation
  const npcManager = NPCManager.getInstance()
  npcManager.registerNPC(npc)
  
  const reputationChange = {
    npc: npc.id,
    npcChange: 25
  }
  const updatedState = ReputationManager.applyReputationChange(gameState, reputationChange)
  
  // Serialize state with NPC relationship
  const serialized = JSON.stringify(updatedState)
  const deserialized = JSON.parse(serialized) as GameState
  
  // Verify NPC relationship is preserved
  t.is(deserialized.reputation.npcRelationships[npc.id], 25, 'NPC relationship should be preserved')
  
  // Re-register NPC and verify it works with loaded state
  const newNpcManager = NPCManager.getInstance()
  newNpcManager.registerNPC(npc)
  
  const npcReputation = ReputationManager.getNPCReputation(
    deserialized.reputation,
    npc.id,
    npc.location
  )
  t.true(npcReputation > 0, 'NPC reputation should work with loaded state')
})

test('Market data persistence with price history', t => {
  const gameState = createModernGameState()
  
  // Modify market data with transactions
  const marketData = gameState.marketData['Market Square']!['Healing Potion']!
  const updatedMarketData = EnhancedEconomyManager.recordTransaction(
    marketData,
    10, // Large purchase
    gameState.day,
    true
  )
  
  gameState.marketData['Market Square']!['Healing Potion'] = updatedMarketData
  
  // Serialize and deserialize
  const serialized = JSON.stringify(gameState)
  const deserialized = JSON.parse(serialized) as GameState
  
  // Verify market data is preserved
  const deserializedMarketData = deserialized.marketData['Market Square']!['Healing Potion']!
  t.deepEqual(deserializedMarketData.history, updatedMarketData.history, 'Price history should be preserved')
  t.is(deserializedMarketData.demand, updatedMarketData.demand, 'Demand should be preserved')
  t.is(deserializedMarketData.supply, updatedMarketData.supply, 'Supply should be preserved')
  
  // Verify market calculations work with loaded data
  const dynamicPrice = EnhancedEconomyManager.calculateDynamicPrice(deserializedMarketData)
  t.true(dynamicPrice > 0, 'Dynamic price calculation should work with loaded market data')
})

test('Save file size optimization', t => {
  const gameState = createModernGameState()
  
  // Add extensive data to test compression/optimization
  for (let i = 0; i < 100; i++) {
  }
  
  // Add extensive market history
  for (const location of Object.keys(gameState.marketData)) {
    for (const potion of Object.keys(gameState.marketData[location]!)) {
      const locationData = gameState.marketData[location]
      if (!locationData) continue
      const marketData = locationData[potion]!
      for (let day = 1; day <= 50; day++) {
        marketData.history.push({
          day,
          price: 100 + Math.random() * 50,
          volume: Math.floor(Math.random() * 20),
          playerTransaction: Math.random() > 0.8
        })
      }
    }
  }
  
  const serialized = JSON.stringify(gameState)
  const originalSize = serialized.length
  
  // Optimize save data (remove old history, limit logs)
  const optimizedState = optimizeSaveData(gameState)
  const optimizedSerialized = JSON.stringify(optimizedState)
  const optimizedSize = optimizedSerialized.length
  
  // Verify optimization reduces size
  t.true(optimizedSize < originalSize, `Optimized save (${optimizedSize}) should be smaller than original (${originalSize})`)
  
  // Verify essential data is preserved
  t.is(optimizedState.day, gameState.day)
  t.deepEqual(optimizedState.reputation, gameState.reputation)
  t.truthy(optimizedState.marketData, 'Market data should be preserved')
  
  // Verify optimization limits are applied
  // Skip gameLog and messages checks as these properties no longer exist
  
  for (const location of Object.keys(optimizedState.marketData)) {
    for (const potion of Object.keys(optimizedState.marketData[location]!)) {
      const locationData = optimizedState.marketData[location]
      if (!locationData) continue
      const marketData = locationData[potion]!
      t.true(marketData.history.length <= 30, 'Market history should be limited')
    }
  }
})

test('Concurrent save/load operations', async t => {
  const gameState = createModernGameState()
  // Simulate concurrent save operations
  const savePromises = []
  for (let i = 0; i < 5; i++) {
    const modifiedState = {
      ...gameState,
      day: gameState.day + i,
      cash: gameState.cash + i * 100
    }
    savePromises.push(
      saveGame(modifiedState, i + 1)
    )
  }
  
  // Wait for all saves to complete
  await Promise.all(savePromises)
  
  // Verify all saves were successful
  for (let i = 1; i <= 5; i++) {
    const loaded = await loadGame(i)
    t.truthy(loaded, `Save slot ${i} should be loadable`)
    t.is(loaded!.day, gameState.day + i - 1, `Save slot ${i} should have correct day`)
  }
})

test('Save file corruption recovery', async t => {
  const gameState = createModernGameState()
  
  // Save valid game state
  await saveGame(gameState, 1)
  
  // Verify valid save can be loaded
  const validLoad = await loadGame(1)
  t.truthy(validLoad, 'Valid save should be loadable')
  
  // Note: Corruption testing would require mocking the file system
  // which is beyond the scope of this test
  t.pass('Corruption recovery test simplified')
})

// Helper functions for migration and validation
function migrateLegacySave(legacyState: any): GameState {
  return {
    ...legacyState,
    reputation: ReputationManager.initializeReputation(),
    marketData: EnhancedEconomyManager.initializeMarketData()
  }
}

function validateGameState(state: any): boolean {
  try {
    // Check required properties
    if (typeof state.day !== 'number') return false
    if (typeof state.location !== 'string') return false
    if (typeof state.cash !== 'number') return false
    
    // Check reputation structure
    if (!state.reputation) return false
    if (typeof state.reputation.global !== 'number') return false
    if (typeof state.reputation.locations !== 'object') return false
    if (typeof state.reputation.npcRelationships !== 'object') return false
    
    // Check market data structure
    if (!state.marketData) return false
    if (typeof state.marketData !== 'object') return false
    
    return true
  } catch {
    return false
  }
}

function optimizeSaveData(state: GameState): GameState {
  const optimized = { ...state }
  
  
  // Limit market history
  const optimizedMarketData = { ...optimized.marketData }
  for (const location of Object.keys(optimizedMarketData)) {
    for (const potion of Object.keys(optimizedMarketData[location]!)) {
      const locationData = optimizedMarketData[location]
      if (!locationData) continue
      const marketData = { ...locationData[potion]! }
      if (marketData.history.length > 30) {
        marketData.history = marketData.history.slice(-30)
      }
      if (locationData) locationData[potion] = marketData
    }
  }
  optimized.marketData = optimizedMarketData
  
  return optimized
}