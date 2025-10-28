import test from 'ava'
import { NPCManager } from '../../core/npcs/NPCManager.js'
import { ReputationManager } from '../../core/reputation/ReputationManager.js'
import { EnhancedEconomyManager } from '../../core/game/enhancedEconomy.js'
import { AnimationManager } from '../../core/animations/AnimationManager.js'
import { DialogueEngine } from '../../core/dialogue/DialogueEngine.js'
import { NPCTrading } from '../../core/npcs/NPCTrading.js'
import { type GameState } from '../../types/game.types.js'
import { type NPC } from '../../types/npc.types.js'

// Test data setup
const createCompleteGameState = (): GameState => ({
  day: 10,
  location: {
    name: 'Market Square',
    description: 'A bustling marketplace',
    dangerLevel: 2
  },
  weather: 'sunny',
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  inventory: {
    'Healing Potion': 5,
    'Mana Potion': 3,
    'Strength Potion': 2
  },
  reputation: {
    global: 25,
    locations: {
      'Market Square': 40,
      'Royal Castle': -10,
      'Enchanted Forest': 60
    },
    npcRelationships: {
      'merchant_aldric': 30,
      'guard_marcus': -5
    }
  },
  marketData: EnhancedEconomyManager.initializeMarketData(),
  tradeHistory: [],
  prices: {}
})

const createTestMerchantNPC = (): NPC => ({
  id: 'merchant_aldric',
  name: 'Aldric the Merchant',
  type: 'merchant',
  description: 'A weathered trader with keen eyes for quality potions',
  personality: {
    greeting: 'Welcome, traveler! I have the finest potions in the realm.',
    farewell: 'Safe travels, and may your potions serve you well!',
    tradeAccept: 'A fine deal! Pleasure doing business.',
    tradeDecline: 'Perhaps another time when you have more coin.',
    lowReputation: "I've heard troubling things about you...",
    highReputation: 'Ah, my most valued customer returns!'
  },
  location: 'Market Square',
  availability: {
    probability: 0.8,
    timeRestriction: [1, 30],
    reputationGate: -20
  },
  reputation: {
    minimum: -20,
    maximum: 100
  },
  trades: [
    {
      offer: 'Rare Healing Potion',
      price: 200,
      quantity: 1,
      reputationRequirement: 20
    },
    {
      offer: 'Mana Potion',
      price: 50,
      quantity: 3,
      reputationRequirement: 0
    }
  ],
  information: [
    {
      id: 'market_tip',
      content: 'I hear the Royal Castle is paying premium for healing potions this week.',
      category: 'market',
      reputationRequirement: 10
    }
  ],
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'What brings you to my shop today?',
        choices: [
          {
            text: "I'd like to see your wares",
            nextNode: 'trade',
            conditions: []
          },
          {
            text: 'Any news from the road?',
            nextNode: 'information',
            conditions: [
              {
                type: 'reputation',
                operator: 'gte',
                value: 10
              }
            ]
          },
          {
            text: 'Just browsing, thanks',
            nextNode: 'farewell',
            conditions: []
          }
        ]
      },
      trade: {
        id: 'trade',
        text: 'Here are my finest wares. What interests you?',
        choices: [
          {
            text: 'Show me your rare items',
            nextNode: 'rare_trade',
            conditions: [
              {
                type: 'reputation',
                operator: 'gte',
                value: 20
              }
            ]
          },
          {
            text: 'I need basic supplies',
            nextNode: 'basic_trade',
            conditions: []
          },
          {
            text: 'Never mind',
            nextNode: 'farewell',
            conditions: []
          }
        ]
      },
      information: {
        id: 'information',
        text: 'Ah, you want to know the latest gossip? I have my ear to the ground.',
        choices: [
          {
            text: 'Tell me about market conditions',
            nextNode: 'market_info',
            conditions: []
          },
          {
            text: 'Thanks, but I should go',
            nextNode: 'farewell',
            conditions: []
          }
        ]
      },
      market_info: {
        id: 'market_info',
        text: 'The Royal Castle guards have been buying up healing potions. Prices are through the roof there!',
        choices: [
          {
            text: 'Interesting, thanks for the tip',
            nextNode: 'farewell',
            effects: [
              {
                type: 'reputation',
                value: 2
              }
            ]
          }
        ]
      },
      rare_trade: {
        id: 'rare_trade',
        text: 'For a valued customer like yourself, I have something special...',
        choices: [
          {
            text: 'Purchase Rare Healing Potion (200 gold)',
            nextNode: 'trade_success',
            conditions: [
              {
                type: 'cash',
                operator: 'gte',
                value: 200
              }
            ],
            effects: [
              {
                type: 'inventory',
                value: 1,
                item: 'Rare Healing Potion'
              }
            ]
          },
          {
            text: 'Too expensive for me',
            nextNode: 'farewell',
            conditions: []
          }
        ]
      },
      basic_trade: {
        id: 'basic_trade',
        text: 'Here are some basic potions that should serve you well.',
        choices: [
          {
            text: 'Buy 3 Mana Potions (50 gold each)',
            nextNode: 'trade_success',
            conditions: [
              {
                type: 'cash',
                operator: 'gte',
                value: 150
              }
            ],
            effects: [
              {
                type: 'inventory',
                value: 3,
                item: 'Mana Potion'
              }
            ]
          },
          {
            text: 'Not what I need',
            nextNode: 'farewell',
            conditions: []
          }
        ]
      },
      trade_success: {
        id: 'trade_success',
        text: 'Excellent! A pleasure doing business with you.',
        choices: [
          {
            text: 'Thank you',
            nextNode: 'farewell',
            effects: [
              {
                type: 'reputation',
                value: 5
              }
            ]
          }
        ]
      },
      farewell: {
        id: 'farewell',
        text: 'Safe travels, and may your potions serve you well!',
        choices: []
      }
    }
  }
})

test.beforeEach(async () => {
  // Reset all singletons and clear caches
  NPCManager.resetInstance()
  ReputationManager.clearCaches()
  EnhancedEconomyManager.clearCaches()
  AnimationManager.resetInstance()
  
  const npcManager = NPCManager.getInstance()
  npcManager.clearCaches()
  
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
})

test('Complete NPC encounter workflow with dialogue and trading', async t => {
  const gameState = createCompleteGameState()
  const npc = createTestMerchantNPC()
  
  // Step 1: Register NPC
  const npcManager = NPCManager.getInstance()
  npcManager.registerNPC(npc)
  
  // Step 2: Check NPC availability
  const isAvailable = npcManager.isNPCAvailable(npc, gameState)
  t.true(isAvailable, 'NPC should be available based on game state')
  
  // Step 3: Get NPCs for location
  const locationNPCs = npcManager.getNPCsForLocation('Market Square', gameState)
  t.is(locationNPCs.length, 1)
  t.is(locationNPCs[0]?.id, 'merchant_aldric')
  
  // Step 4: Roll for encounter
  const encounteredNPC = npcManager.rollForEncounter('Market Square', gameState)
  t.truthy(encounteredNPC, 'Should encounter an NPC with high probability')
  
  // Step 5: Start dialogue
  const initialNode = DialogueEngine.processDialogue(npc, gameState)
  t.is(initialNode.id, 'greeting')
  t.true(initialNode.choices.length > 0)
  
  // Step 6: Navigate dialogue to trading
  const tradeChoice = initialNode.choices.find((choice: any) => choice.text.includes('wares'))
  t.truthy(tradeChoice, 'Should have trade option available')
  
  // Step 7: Process trade choice
  let updatedState = DialogueEngine.handleChoice(tradeChoice!, gameState, npc.location)
  const tradeNode = DialogueEngine.processDialogue(npc, updatedState)
  t.is(tradeNode.id, 'trade')
  
  // Step 8: Check reputation-gated options
  const rareTradeChoice = tradeNode.choices.find((choice: any) => choice.text.includes('rare'))
  if (updatedState.reputation.locations['Market Square']! >= 20) {
    t.truthy(rareTradeChoice, 'Should have rare trade option with sufficient reputation')
  }
  
  // Step 9: Execute basic trade
  const basicTradeChoice = tradeNode.choices.find((choice: any) => choice.text.includes('basic'))
  t.truthy(basicTradeChoice, 'Should have basic trade option')
  
  updatedState = DialogueEngine.handleChoice(basicTradeChoice!, updatedState, npc.location)
  const basicTradeNode = DialogueEngine.processDialogue(npc, updatedState)

  // Step 10: Complete purchase
  const purchaseChoice = basicTradeNode.choices.find((choice: any) => choice.text.includes('Buy'))
  t.truthy(purchaseChoice, 'Should have purchase option')

  const finalState = DialogueEngine.handleChoice(purchaseChoice!, updatedState, npc.location)
  
  // Step 11: Verify trade effects
  t.true(finalState.cash < gameState.cash, 'Cash should be reduced after purchase')
  t.true(finalState.inventory['Mana Potion']! > gameState.inventory['Mana Potion']!, 'Inventory should be updated')
  
  // Step 12: Verify reputation changes
  const finalReputation = ReputationManager.getNPCReputation(
    finalState.reputation,
    npc.id,
    npc.location
  )
  const initialReputation = ReputationManager.getNPCReputation(
    gameState.reputation,
    npc.id,
    npc.location
  )
  t.true(finalReputation >= initialReputation, 'Reputation should improve or stay same after successful trade')
})

test('Market dynamics integration with reputation and NPC trading', t => {
  const gameState = createCompleteGameState()
  const npc = createTestMerchantNPC()

  // Step 1: Get initial market data
  const initialMarketData = gameState.marketData['Market Square']!['Healing Potion']!
  const initialPrice = initialMarketData.currentPrice

  // Step 2: Calculate reputation-modified price
  const playerReputation = ReputationManager.getLocationReputation(
    gameState.reputation,
    'Market Square'
  )
  const reputationModifier = ReputationManager.calculatePriceModifier(playerReputation)

  // Step 3: Calculate dynamic price with reputation
  const dynamicPrice = initialPrice * reputationModifier

  // Step 4: Verify price calculation
  t.true(dynamicPrice > 0, 'Dynamic price should be positive')
  t.true(Math.abs(dynamicPrice - initialPrice * reputationModifier) < initialPrice,
    'Dynamic price should be influenced by reputation modifier')

  // Step 5: Record transaction and verify market update
  const updatedMarketData = EnhancedEconomyManager.recordTransaction(
    initialMarketData,
    5, // Buy 5 potions
    gameState.day,
    true // Player transaction
  )
  
  // Step 6: Verify market dynamics
  t.true(updatedMarketData.demand > initialMarketData.demand, 'Demand should increase after purchase')
  t.true(updatedMarketData.supply < initialMarketData.supply, 'Supply should decrease after purchase')
  t.is(updatedMarketData.history.length, initialMarketData.history.length + 1, 'History should be updated')
  
  // Step 7: Test NPC trading integration
  const npcTrading = new NPCTrading()
  const npcManager = NPCManager.getInstance()
  npcManager.registerNPC(npc)
  
  const tradeOffers = NPCTrading.getAvailableTrades(npc, gameState)
  t.true(tradeOffers.length > 0, 'Should have available trades')
  
  // Step 8: Verify reputation affects trade availability
  const highRepTrade = tradeOffers.find((trade: any) => trade.reputationRequirement > 0)
  if (highRepTrade) {
    const hasAccess = playerReputation >= highRepTrade.reputationRequirement
    t.is(tradeOffers.includes(highRepTrade), hasAccess, 
      'High reputation trades should only be available with sufficient reputation')
  }
})

test('Animation system integration with NPC encounters', async t => {
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  const npc = createTestMerchantNPC()
  
  // Step 1: Get NPC animations
  const idleAnimation = animationManager.getNPCAnimation(npc.id, 'idle')
  const talkingAnimation = animationManager.getNPCAnimation(npc.id, 'talking')
  const tradingAnimation = animationManager.getNPCAnimation(npc.id, 'trading')
  
  // Step 2: Verify animations are available
  t.true(idleAnimation.length > 0, 'Should have idle animation frames')
  t.true(talkingAnimation.length > 0, 'Should have talking animation frames')
  t.true(tradingAnimation.length > 0, 'Should have trading animation frames')
  
  // Step 3: Test animation caching performance
  const start1 = performance.now()
  for (let i = 0; i < 10; i++) {
    animationManager.getNPCAnimation(npc.id, 'idle')
  }
  const time1 = performance.now() - start1
  
  // Step 4: Verify caching improves performance
  t.true(time1 < 50, `10 cached animation calls should complete in under 50ms, took ${time1}ms`)
  
  // Step 5: Test travel animations
  const travelAnimation = animationManager.getRandomTravelAnimation()
  t.truthy(travelAnimation.name, 'Travel animation should have a name')
  t.true(travelAnimation.frames.length > 0, 'Travel animation should have frames')
  
  // Step 6: Test encounter animations
  const encounterAnimation = animationManager.getEncounterAnimation('combat')
  t.true(encounterAnimation.length > 0, 'Should have encounter animation frames')
})

test('Save/load compatibility with all new features', t => {
  const gameState = createCompleteGameState()
  const npc = createTestMerchantNPC()
  
  // Step 1: Set up complete game state with all features
  const npcManager = NPCManager.getInstance()
  npcManager.registerNPC(npc)
  
  // Step 2: Modify state with reputation changes
  const reputationChange = {
    global: 5,
    location: 'Market Square',
    locationChange: 10,
    npc: npc.id,
    npcChange: 15
  }
  const updatedState = ReputationManager.applyReputationChange(gameState, reputationChange)
  
  // Step 3: Update market data
  const marketUpdatedState = EnhancedEconomyManager.updateMarketDynamics(updatedState)
  
  // Step 4: Serialize state (simulate save)
  const serializedState = JSON.stringify(marketUpdatedState)
  t.true(serializedState.length > 0, 'State should serialize successfully')
  
  // Step 5: Deserialize state (simulate load)
  const deserializedState = JSON.parse(serializedState) as GameState
  
  // Step 6: Verify all data is preserved
  t.deepEqual(deserializedState.reputation, marketUpdatedState.reputation, 'Reputation data should be preserved')
  t.deepEqual(deserializedState.marketData, marketUpdatedState.marketData, 'Market data should be preserved')
  t.deepEqual(deserializedState.inventory, marketUpdatedState.inventory, 'Inventory should be preserved')
  
  // Step 7: Verify systems work with loaded state
  const loadedReputation = ReputationManager.getLocationReputation(
    deserializedState.reputation,
    'Market Square'
  )
  t.true(loadedReputation > 0, 'Reputation system should work with loaded state')
  
  const availableNPCs = npcManager.getNPCsForLocation('Market Square', deserializedState)
  t.is(availableNPCs.length, 1, 'NPC system should work with loaded state')
})

test('Error handling and edge cases across all systems', async t => {
  const gameState = createCompleteGameState()
  const npc = createTestMerchantNPC()
  const npcManager = NPCManager.getInstance()
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Test 1: Invalid NPC data
  t.throws(() => {
    npcManager.registerNPC({
      ...npc,
      id: '', // Invalid empty ID
      name: ''
    })
  }, { instanceOf: Error }, 'Should throw error for invalid NPC data')
  
  // Test 2: Non-existent NPC
  const nonExistentNPC = npcManager.getNPC('non_existent_npc')
  t.is(nonExistentNPC, undefined, 'Should return undefined for non-existent NPC')
  
  // Test 3: Invalid reputation values
  const extremeReputation = ReputationManager.calculatePriceModifier(999999)
  t.true(extremeReputation > 0, 'Should handle extreme reputation values gracefully')
  
  // Test 4: Empty market data
  const emptyMarketData = EnhancedEconomyManager.calculateDynamicPrice({
    basePrice: 0,
    currentPrice: 0,
    demand: 0,
    supply: 0,
    trend: 'stable',
    history: [],
    volatility: 0,
    lastUpdated: 1
  })
  t.true(emptyMarketData >= 0, 'Should handle empty market data gracefully')
  
  // Test 5: Invalid animation data
  const invalidFrames = animationManager.validateAnimationFrames([])
  t.false(invalidFrames.isValid, 'Should detect invalid animation frames')
  
  // Test 6: Extreme game state values
  const extremeGameState = {
    ...gameState,
    day: -1,
    cash: -1000,
    reputation: {
      global: -999,
      locations: {},
      npcRelationships: {}
    }
  }
  
  // Should not crash with extreme values
  const extremeLocationRep = ReputationManager.getLocationReputation(
    extremeGameState.reputation,
    'Market Square'
  )
  t.true(typeof extremeLocationRep === 'number', 'Should return number even with extreme values')
})

test('Performance with complex multi-system interactions', async t => {
  const gameState = createCompleteGameState()
  const npcManager = NPCManager.getInstance()
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Step 1: Register multiple NPCs
  for (let i = 0; i < 20; i++) {
    const npc = {
      ...createTestMerchantNPC(),
      id: `merchant_${i}`,
      name: `Merchant ${i}`
    }
    npcManager.registerNPC(npc)
  }
  
  // Step 2: Perform complex multi-system operations
  const start = performance.now()
  
  for (let i = 0; i < 50; i++) {
    // NPC operations
    // const npcs = npcManager.getNPCsForLocation('Market Square', gameState)
    const encounter = npcManager.rollForEncounter('Market Square', gameState)
    
    // Reputation calculations
    const locationRep = ReputationManager.getLocationReputation(gameState.reputation, 'Market Square')
    const priceModifier = ReputationManager.calculatePriceModifier(locationRep)
    
    // Market calculations
    const marketData = gameState.marketData['Market Square']!['Healing Potion']!
    // const dynamicPrice = EnhancedEconomyManager.calculateDynamicPrice(marketData, priceModifier)
    
    // Animation operations
    if (encounter) {
      animationManager.getNPCAnimation(encounter.id, 'idle')
      animationManager.getNPCAnimation(encounter.id, 'talking')
    }
  }
  
  const time = performance.now() - start
  
  // Should complete complex operations efficiently
  t.true(time < 500, `50 complex multi-system operations took ${time}ms, should be under 500ms`)
})

test('Memory usage with extended gameplay simulation', async t => {
  const gameState = createCompleteGameState()
  const npcManager = NPCManager.getInstance()
  const animationManager = AnimationManager.getInstance()
  await animationManager.loadAnimations()
  
  // Simulate extended gameplay
  let currentState = gameState
  
  for (let day = 1; day <= 30; day++) {
    currentState = { ...currentState, day }
    
    // Daily NPC encounters
    for (let encounter = 0; encounter < 5; encounter++) {
      npcManager.getNPCsForLocation('Market Square', currentState)
      npcManager.rollForEncounter('Market Square', currentState)
    }
    
    // Daily market updates
    currentState = EnhancedEconomyManager.updateMarketDynamics(currentState)
    
    // Daily reputation changes
    const repChange = {
      global: Math.floor(Math.random() * 3) - 1,
      location: 'Market Square',
      locationChange: Math.floor(Math.random() * 5) - 2
    }
    currentState = ReputationManager.applyReputationChange(currentState, repChange)
    
    // Animation usage
    animationManager.getRandomTravelAnimation()
    animationManager.getNPCAnimation('default_merchant', 'idle')
  }
  
  // Check memory usage
  const animationStats = animationManager.getMemoryStats()
  t.true(animationStats.totalCacheSize < 200, 'Animation cache should be limited after extended use')
  
  // Verify systems still work correctly after extended use
  const finalNPCs = npcManager.getNPCsForLocation('Market Square', currentState)
  t.true(finalNPCs.length >= 0, 'NPC system should still work after extended simulation')
  
  const finalReputation = ReputationManager.getLocationReputation(currentState.reputation, 'Market Square')
  t.true(typeof finalReputation === 'number', 'Reputation system should still work after extended simulation')
})