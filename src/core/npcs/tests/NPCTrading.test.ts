import test from 'ava'
import { NPCTrading } from '../NPCTrading.js'
import { type NPC, type NPCTrade } from '../../../types/npc.types.js'
import { type GameState } from '../../../types/game.types.js'
import { ReputationManager } from '../../reputation/ReputationManager.js'

// Test helper to create a basic NPC
const createTestNPC = (trades: NPCTrade[] = []): NPC => ({
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A test merchant',
  personality: {
    greeting: 'Hello!',
    farewell: 'Goodbye!',
    tradeAccept: 'Deal!',
    tradeDecline: 'No deal',
    lowReputation: 'I don\'t trust you',
    highReputation: 'My valued customer!'
  },
  location: 'Test Market',
  availability: {
    probability: 1.0
  },
  reputation: {},
  trades,
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

// Test helper to create a basic game state
const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
  day: 1,
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: { name: 'Test Market', description: 'A test market', dangerLevel: 1 },
  inventory: { 'Health Potion': 5, 'Mana Potion': 3 },
  prices: {},
  weather: 'sunny',
  reputation: ReputationManager.initializeReputation(),
  marketData: {},
  tradeHistory: [],
  ...overrides
})

test('generateTradeOffers returns empty array for NPC with no trades', t => {
  const npc = createTestNPC()
  const gameState = createTestGameState()

  const offers = NPCTrading.generateTradeOffers(npc, gameState)

  t.is(offers.length, 0)
})

test('generateTradeOffers creates buy offer for positive price trade', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Rare Potion',
      price: 500,
      quantity: 1,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState()

  const offers = NPCTrading.generateTradeOffers(npc, gameState)

  t.is(offers.length, 1)
  t.is(offers[0]?.type, 'buy')
  t.is(offers[0]?.itemName, 'Rare Potion')
  t.is(offers[0]?.quantity, 1)
  t.is(offers[0]?.pricePerUnit, 500)
  t.is(offers[0]?.totalPrice, 500)
  t.is(offers[0]?.available, true)
})

test('generateTradeOffers creates sell offer for negative price trade', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Health Potion',
      price: -100,
      quantity: 2,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState()

  const offers = NPCTrading.generateTradeOffers(npc, gameState)

  t.is(offers.length, 1)
  t.is(offers[0]?.type, 'sell')
  t.is(offers[0]?.itemName, 'Health Potion')
  t.is(offers[0]?.quantity, 2)
  t.is(offers[0]?.pricePerUnit, 100)
  t.is(offers[0]?.totalPrice, 200)
  t.is(offers[0]?.available, true)
})

test('generateTradeOffers applies reputation modifier to prices', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Test Potion',
      price: 100,
      quantity: 1,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  
  // Create game state with high reputation
  const gameState = createTestGameState({
    reputation: {
      global: 60,
      locations: { 'Test Market': 60 },
      npcRelationships: { 'test_merchant': 60 }
    }
  })

  const offers = NPCTrading.generateTradeOffers(npc, gameState)

  t.is(offers.length, 1)
  // With high reputation, price should be lower (discount)
  t.true((offers[0]?.pricePerUnit || 0) < 100)
})

test('generateTradeOffers marks trade unavailable when reputation requirement not met', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Exclusive Potion',
      price: 1000,
      quantity: 1,
      reputationRequirement: 50
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState() // Default reputation is 0

  const offers = NPCTrading.generateTradeOffers(npc, gameState)

  t.is(offers.length, 1)
  t.is(offers[0]?.available, false)
  t.true(offers[0]?.reason?.includes('Requires reputation'))
})

test('generateTradeOffers marks buy trade unavailable when insufficient funds', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Expensive Potion',
      price: 2000,
      quantity: 1,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState({ cash: 500 })

  const offers = NPCTrading.generateTradeOffers(npc, gameState)

  t.is(offers.length, 1)
  t.is(offers[0]?.available, false)
  t.true(offers[0]?.reason?.includes('Insufficient funds'))
})

test('generateTradeOffers marks sell trade unavailable when insufficient inventory', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Health Potion',
      price: -100,
      quantity: 10, // Player only has 5
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState()

  const offers = NPCTrading.generateTradeOffers(npc, gameState)

  t.is(offers.length, 1)
  t.is(offers[0]?.available, false)
  t.true(offers[0]?.reason?.includes('Insufficient inventory'))
})

test('generateTradeOffers evaluates trade conditions correctly', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Day-Limited Potion',
      price: 100,
      quantity: 1,
      reputationRequirement: 0,
      conditions: [
        {
          type: 'day',
          operator: 'gte',
          value: 5
        }
      ]
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState({ day: 3 })

  const offers = NPCTrading.generateTradeOffers(npc, gameState)

  t.is(offers.length, 1)
  t.is(offers[0]?.available, false)
  t.true(offers[0]?.reason?.includes('Requires day'))
})

test('executeTrade successfully executes buy trade', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Test Potion',
      price: 200,
      quantity: 1,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState({ cash: 500 })

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  const offer = offers[0]
  t.truthy(offer)

  const result = NPCTrading.executeTrade(offer!, npc, gameState)

  t.true(result.success)
  t.is(result.newGameState.cash, 300) // 500 - 200
  t.is(result.newGameState.inventory['Test Potion'], 1)
  t.true(result.reputationChange > 0)
  t.truthy(result.transaction)
  t.is(result.transaction?.type, 'buy')
  t.is(result.transaction?.npcInvolved, 'test_merchant')
})

test('executeTrade successfully executes sell trade', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Health Potion',
      price: -150,
      quantity: 2,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState({ cash: 100 })

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  const offer = offers[0]
  t.truthy(offer)

  const result = NPCTrading.executeTrade(offer!, npc, gameState)

  t.true(result.success)
  t.is(result.newGameState.cash, 400) // 100 + 300 (2 * 150)
  t.is(result.newGameState.inventory['Health Potion'], 3) // 5 - 2
  t.true(result.reputationChange > 0)
  t.truthy(result.transaction)
  t.is(result.transaction?.type, 'sell')
  t.is(result.transaction?.quantity, -2) // Negative for sell
})

test('executeTrade removes item from inventory when quantity reaches zero', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Mana Potion',
      price: -100,
      quantity: 3, // Player has exactly 3
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState()

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  const offer = offers[0]
  t.truthy(offer)

  const result = NPCTrading.executeTrade(offer!, npc, gameState)

  t.true(result.success)
  t.is(result.newGameState.inventory['Mana Potion'], undefined)
})

test('executeTrade fails when trade is not available', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Expensive Potion',
      price: 2000,
      quantity: 1,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState({ cash: 500 })

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  const offer = offers[0]
  t.truthy(offer)
  t.false(offer!.available)

  const result = NPCTrading.executeTrade(offer!, npc, gameState)

  t.false(result.success)
  t.is(result.reputationChange, 0)
  t.true(result.message.includes('Insufficient funds'))
  t.is(result.newGameState.cash, gameState.cash) // No change
})

test('executeTrade applies reputation changes to multiple levels', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Valuable Potion',
      price: 1000,
      quantity: 1,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState({ cash: 1500 })

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  const offer = offers[0]
  t.truthy(offer)

  const result = NPCTrading.executeTrade(offer!, npc, gameState)

  t.true(result.success)
  
  // Check that reputation was applied at different levels
  t.true(result.newGameState.reputation.global > gameState.reputation.global)
  t.true((result.newGameState.reputation.locations['Test Market'] || 0) > 0)
  t.true((result.newGameState.reputation.npcRelationships['test_merchant'] || 0) > 0)
})

test('executeTrade adds transaction to trade history', t => {
  const trades: NPCTrade[] = [
    {
      offer: 'Test Potion',
      price: 100,
      quantity: 1,
      reputationRequirement: 0
    }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState()

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  const offer = offers[0]
  t.truthy(offer)

  const result = NPCTrading.executeTrade(offer!, npc, gameState)

  t.true(result.success)
  t.is(result.newGameState.tradeHistory.length, 1)
  
  const transaction = result.newGameState.tradeHistory[0]
  t.truthy(transaction)
  t.is(transaction?.npcInvolved, 'test_merchant')
  t.is(transaction?.location, 'Test Market')
  t.is(transaction?.potionType, 'Test Potion')
})

test('getBuyOffers filters for buy offers only', t => {
  const trades: NPCTrade[] = [
    { offer: 'Buy Item', price: 100, quantity: 1, reputationRequirement: 0 },
    { offer: 'Sell Item', price: -100, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState()

  const buyOffers = NPCTrading.getBuyOffers(npc, gameState)

  t.is(buyOffers.length, 1)
  t.is(buyOffers[0]?.type, 'buy')
  t.is(buyOffers[0]?.itemName, 'Buy Item')
})

test('getSellOffers filters for sell offers only', t => {
  const trades: NPCTrade[] = [
    { offer: 'Buy Item', price: 100, quantity: 1, reputationRequirement: 0 },
    { offer: 'Sell Item', price: -100, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState()

  const sellOffers = NPCTrading.getSellOffers(npc, gameState)

  t.is(sellOffers.length, 1)
  t.is(sellOffers[0]?.type, 'sell')
  t.is(sellOffers[0]?.itemName, 'Sell Item')
})

test('getAvailableOffers filters for available offers only', t => {
  const trades: NPCTrade[] = [
    { offer: 'Available Item', price: 100, quantity: 1, reputationRequirement: 0 },
    { offer: 'Unavailable Item', price: 2000, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState({ cash: 500 })

  const availableOffers = NPCTrading.getAvailableOffers(npc, gameState)

  t.is(availableOffers.length, 1)
  t.is(availableOffers[0]?.itemName, 'Available Item')
  t.true(availableOffers[0]?.available)
})

test('findTradeOffer finds specific offer by ID', t => {
  const trades: NPCTrade[] = [
    { offer: 'First Item', price: 100, quantity: 1, reputationRequirement: 0 },
    { offer: 'Second Item', price: 200, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createTestNPC(trades)
  const gameState = createTestGameState()

  const targetOfferId = 'test_merchant_trade_1'
  const foundOffer = NPCTrading.findTradeOffer(npc, gameState, targetOfferId)

  t.truthy(foundOffer)
  t.is(foundOffer?.id, targetOfferId)
  t.is(foundOffer?.itemName, 'Second Item')
})

test('findTradeOffer returns undefined for non-existent offer', t => {
  const npc = createTestNPC()
  const gameState = createTestGameState()

  const foundOffer = NPCTrading.findTradeOffer(npc, gameState, 'non_existent_id')

  t.is(foundOffer, undefined)
})