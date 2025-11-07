import test from 'ava'
import { NPCTrading } from '../NPCTrading.js'
import { type NPC, type NPCTrade } from '../../../types/npc.types.js'
import { type GameState } from '../../../types/game.types.js'
import { ReputationManager } from '../../reputation/ReputationManager.js'
import { ReputationLevel } from '../../../types/reputation.types.js'

// Test helper to create a basic NPC with reputation-sensitive trades
const createReputationNPC = (trades: NPCTrade[] = []): NPC => ({
  id: 'reputation_merchant',
  name: 'Reputation Merchant',
  type: 'merchant',
  description: 'A merchant who cares about reputation',
  personality: {
    greeting: 'Hello!',
    farewell: 'Goodbye!',
    tradeAccept: 'Deal!',
    tradeDecline: 'No deal',
    lowReputation: "I don't trust you",
    highReputation: 'My valued customer!',
  },
  location: 'Reputation Market',
  availability: {
    probability: 1,
  },
  reputation: {},
  trades,
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Hello!',
        choices: [],
      },
    },
  },
})

// Test helper to create a game state with specific reputation
const createGameStateWithReputation = (
  globalRep = 0,
  locationRep = 0,
  npcRep = 0
): GameState => ({
  day: 1,
  cash: 2000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: {
    name: 'Reputation Market',
    description: 'A test market',
    dangerLevel: 1,
  },
  inventory: { 'Health Potion': 10, 'Mana Potion': 10 },
  prices: {},
  weather: 'sunny',
  reputation: {
    global: globalRep,
    locations: { 'Reputation Market': locationRep },
    npcRelationships: { reputation_merchant: npcRep },
  },
  marketData: {},
  tradeHistory: [],
})

test('reputation affects trade prices - high reputation gives discount', (t) => {
  const trades: NPCTrade[] = [
    {
      offer: 'Standard Potion',
      price: 1000,
      quantity: 1,
      reputationRequirement: 0,
    },
  ]
  const npc = createReputationNPC(trades)

  // Test with high reputation (should get discount)
  const highRepState = createGameStateWithReputation(70, 70, 70)
  const highRepOffers = NPCTrading.generateTradeOffers(npc, highRepState)

  // Test with neutral reputation
  const neutralRepState = createGameStateWithReputation(0, 0, 0)
  const neutralRepOffers = NPCTrading.generateTradeOffers(npc, neutralRepState)

  t.is(highRepOffers.length, 1)
  t.is(neutralRepOffers.length, 1)

  const highRepPrice = highRepOffers[0]?.pricePerUnit || 0
  const neutralRepPrice = neutralRepOffers[0]?.pricePerUnit || 0

  // High reputation should result in lower prices
  t.true(highRepPrice < neutralRepPrice)
  t.true(highRepPrice < 1000) // Should be discounted from base price
})

test('reputation affects trade prices - low reputation increases prices', (t) => {
  const trades: NPCTrade[] = [
    {
      offer: 'Standard Potion',
      price: 1000,
      quantity: 1,
      reputationRequirement: 0,
    },
  ]
  const npc = createReputationNPC(trades)

  // Test with low reputation (should get markup)
  const lowRepState = createGameStateWithReputation(-60, -60, -60)
  const lowRepOffers = NPCTrading.generateTradeOffers(npc, lowRepState)

  // Test with neutral reputation
  const neutralRepState = createGameStateWithReputation(0, 0, 0)
  const neutralRepOffers = NPCTrading.generateTradeOffers(npc, neutralRepState)

  t.is(lowRepOffers.length, 1)
  t.is(neutralRepOffers.length, 1)

  const lowRepPrice = lowRepOffers[0]?.pricePerUnit || 0
  const neutralRepPrice = neutralRepOffers[0]?.pricePerUnit || 0

  // Low reputation should result in higher prices
  t.true(lowRepPrice > neutralRepPrice)
  t.true(lowRepPrice > 1000) // Should be marked up from base price
})

test('exclusive trades require minimum reputation', (t) => {
  const trades: NPCTrade[] = [
    {
      offer: 'Common Potion',
      price: 100,
      quantity: 1,
      reputationRequirement: 0,
    },
    {
      offer: 'Exclusive Potion',
      price: 500,
      quantity: 1,
      reputationRequirement: 50,
    },
    {
      offer: 'Ultra Rare Potion',
      price: 1000,
      quantity: 1,
      reputationRequirement: 80,
    },
  ]
  const npc = createReputationNPC(trades)

  // Test with low reputation - should only see common trade
  const lowRepState = createGameStateWithReputation(10, 10, 10)
  const lowRepOffers = NPCTrading.getAvailableOffers(npc, lowRepState)

  t.is(lowRepOffers.length, 1)
  t.is(lowRepOffers[0]?.itemName, 'Common Potion')

  // Test with medium reputation - should see common and exclusive
  const medRepState = createGameStateWithReputation(60, 60, 60)
  const medRepOffers = NPCTrading.getAvailableOffers(npc, medRepState)

  t.is(medRepOffers.length, 2)
  const medRepItems = medRepOffers.map((offer) => offer.itemName).sort()
  t.deepEqual(medRepItems, ['Common Potion', 'Exclusive Potion'])

  // Test with high reputation - should see all trades
  const highRepState = createGameStateWithReputation(90, 90, 90)
  const highRepOffers = NPCTrading.getAvailableOffers(npc, highRepState)

  t.is(highRepOffers.length, 3)
  const highRepItems = highRepOffers.map((offer) => offer.itemName).sort()
  t.deepEqual(highRepItems, [
    'Common Potion',
    'Exclusive Potion',
    'Ultra Rare Potion',
  ])
})

test('successful trades increase reputation at multiple levels', (t) => {
  const trades: NPCTrade[] = [
    {
      offer: 'Valuable Potion',
      price: 800,
      quantity: 1,
      reputationRequirement: 0,
    },
  ]
  const npc = createReputationNPC(trades)
  const gameState = createGameStateWithReputation(10, 5, 0)

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  const offer = offers[0]
  t.truthy(offer)

  const result = NPCTrading.executeTrade(offer!, npc, gameState)

  t.true(result.success)
  t.true(result.reputationChange > 0)

  // Check that reputation increased at all levels
  t.true(result.newGameState.reputation.global > gameState.reputation.global)
  t.true(
    (result.newGameState.reputation.locations['Reputation Market'] || 0) >
      (gameState.reputation.locations['Reputation Market'] || 0)
  )
  t.true(
    (result.newGameState.reputation.npcRelationships['reputation_merchant'] ||
      0) > (gameState.reputation.npcRelationships['reputation_merchant'] || 0)
  )
})

test('reputation gain scales with trade value', (t) => {
  const smallTrade: NPCTrade = {
    offer: 'Small Potion',
    price: 100,
    quantity: 1,
    reputationRequirement: 0,
  }

  const largeTrade: NPCTrade = {
    offer: 'Large Potion',
    price: 1000,
    quantity: 1,
    reputationRequirement: 0,
  }

  const npc1 = createReputationNPC([smallTrade])
  const npc2 = createReputationNPC([largeTrade])
  const gameState = createGameStateWithReputation(0, 0, 0)

  // Execute small trade
  const smallOffers = NPCTrading.generateTradeOffers(npc1, gameState)
  const smallOffer = smallOffers[0]
  t.truthy(smallOffer)
  const smallResult = NPCTrading.executeTrade(smallOffer!, npc1, gameState)

  // Execute large trade
  const largeOffers = NPCTrading.generateTradeOffers(npc2, gameState)
  const largeOffer = largeOffers[0]
  t.truthy(largeOffer)
  const largeResult = NPCTrading.executeTrade(largeOffer!, npc2, gameState)

  t.true(smallResult.success)
  t.true(largeResult.success)

  // Large trade should give more reputation
  t.true(largeResult.reputationChange > smallResult.reputationChange)
})

test('NPC-specific reputation affects individual NPC trades', (t) => {
  const trades: NPCTrade[] = [
    {
      offer: 'Test Potion',
      price: 1000,
      quantity: 1,
      reputationRequirement: 0,
    },
  ]
  const npc = createReputationNPC(trades)

  // Create state with high NPC-specific reputation but low global/location reputation
  const gameState = createGameStateWithReputation(-20, -10, 80)

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  t.is(offers.length, 1)

  const offer = offers[0]
  t.truthy(offer)

  // Should get a good price due to high NPC-specific reputation
  // (NPC reputation is weighted 70% in the calculation)
  t.true(offer!.pricePerUnit < 1000)
})

test('reputation requirements block trades appropriately', (t) => {
  const trades: NPCTrade[] = [
    {
      offer: 'Reputation Locked Potion',
      price: 500,
      quantity: 1,
      reputationRequirement: 40,
    },
  ]
  const npc = createReputationNPC(trades)

  // Test with insufficient reputation
  const lowRepState = createGameStateWithReputation(20, 20, 20)
  const lowRepOffers = NPCTrading.generateTradeOffers(npc, lowRepState)

  t.is(lowRepOffers.length, 1)
  t.false(lowRepOffers[0]?.available)
  t.true(lowRepOffers[0]?.reason?.includes('Requires reputation'))

  // Test with sufficient reputation
  const highRepState = createGameStateWithReputation(50, 50, 50)
  const highRepOffers = NPCTrading.generateTradeOffers(npc, highRepState)

  t.is(highRepOffers.length, 1)
  t.true(highRepOffers[0]?.available)
})

test('reputation changes are recorded in transaction history', (t) => {
  const trades: NPCTrade[] = [
    {
      offer: 'Test Potion',
      price: 600,
      quantity: 1,
      reputationRequirement: 0,
    },
  ]
  const npc = createReputationNPC(trades)
  const gameState = createGameStateWithReputation(0, 0, 0)

  const offers = NPCTrading.generateTradeOffers(npc, gameState)
  const offer = offers[0]
  t.truthy(offer)

  const result = NPCTrading.executeTrade(offer!, npc, gameState)

  t.true(result.success)
  t.is(result.newGameState.tradeHistory.length, 1)

  const transaction = result.newGameState.tradeHistory[0]
  t.truthy(transaction)
  t.truthy(transaction?.reputationChange)
  t.true((transaction?.reputationChange || 0) > 0)
})

test('reputation levels affect trade availability and pricing consistently', (t) => {
  const trades: NPCTrade[] = [
    {
      offer: 'Standard Item',
      price: 1000,
      quantity: 1,
      reputationRequirement: 0,
    },
  ]
  const npc = createReputationNPC(trades)

  // Test different reputation levels
  const reputationLevels = [
    { rep: -70, level: ReputationLevel.DESPISED },
    { rep: -30, level: ReputationLevel.DISLIKED },
    { rep: 0, level: ReputationLevel.NEUTRAL },
    { rep: 30, level: ReputationLevel.LIKED },
    { rep: 60, level: ReputationLevel.RESPECTED },
    { rep: 90, level: ReputationLevel.REVERED },
  ]

  let previousPrice = 0

  for (const { rep, level } of reputationLevels) {
    const gameState = createGameStateWithReputation(rep, rep, rep)
    const offers = NPCTrading.generateTradeOffers(npc, gameState)

    t.is(offers.length, 1)
    t.true(offers[0]?.available)

    const currentPrice = offers[0]?.pricePerUnit || 0

    // Verify reputation level calculation
    const calculatedLevel = ReputationManager.getReputationLevel(rep)
    t.is(calculatedLevel, level)

    // Prices should generally decrease as reputation improves
    if (previousPrice > 0 && rep > -30) {
      // Skip the most negative comparisons
      t.true(
        currentPrice <= previousPrice,
        `Price should decrease or stay same as reputation improves: ${level} (${currentPrice}) vs previous (${previousPrice})`
      )
    }

    previousPrice = currentPrice
  }
})
