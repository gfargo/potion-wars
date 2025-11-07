import test from 'ava'
import {
  generateDynamicPrices,
  processPurchase,
  processSale,
  updateDailyMarkets,
  getLocationMarketTrends,
  initializeGameMarkets,
} from '../economy.js'
import { type GameState } from '../../../types/game.types.js'
import { ReputationManager } from '../../reputation/ReputationManager.js'

// Mock game state for testing
const createMockGameState = (): GameState => ({
  day: 1,
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: {
    name: "Merchant's District",
    description: 'A bustling marketplace',
    dangerLevel: 1,
  },
  inventory: { 'Wisdom Draught': 5, 'Strength Tonic': 3 },
  prices: {},
  weather: 'sunny',
  reputation: ReputationManager.initializeReputation(),
  marketData: {
    "Merchant's District": {
      'Wisdom Draught': {
        basePrice: 35,
        currentPrice: 40,
        demand: 0.6,
        supply: 0.4,
        trend: 'rising',
        history: [{ day: 1, price: 35, volume: 10, playerTransaction: false }],
        volatility: 0.2,
        lastUpdated: 1,
      },
      'Strength Tonic': {
        basePrice: 160,
        currentPrice: 150,
        demand: 0.4,
        supply: 0.6,
        trend: 'falling',
        history: [{ day: 1, price: 160, volume: 5, playerTransaction: false }],
        volatility: 0.15,
        lastUpdated: 1,
      },
    },
  },
  tradeHistory: [],
})

test('generateDynamicPrices uses market data and reputation', (t) => {
  const state = createMockGameState()

  // Set positive reputation for discounts
  state.reputation.locations["Merchant's District"] = 30 // LIKED level

  const prices = generateDynamicPrices(state)

  // Should have prices for both potions
  t.true('Wisdom Draught' in prices)
  t.true('Strength Tonic' in prices)

  // Prices should be numbers
  t.true(typeof prices['Wisdom Draught'] === 'number')
  t.true(typeof prices['Strength Tonic'] === 'number')

  // Prices should be positive
  t.true(prices['Wisdom Draught']! > 0)
  t.true(prices['Strength Tonic']! > 0)
})

test('generateDynamicPrices applies reputation discounts', (t) => {
  const neutralState = createMockGameState()
  const goodReputationState = createMockGameState()

  // Set good reputation for discounts
  goodReputationState.reputation.locations["Merchant's District"] = 60 // RESPECTED level

  // Run multiple times to account for volatility and take average
  let neutralTotal = 0
  let discountedTotal = 0
  const iterations = 10

  for (let i = 0; i < iterations; i++) {
    const neutralPrices = generateDynamicPrices(neutralState)
    const discountedPrices = generateDynamicPrices(goodReputationState)

    neutralTotal +=
      neutralPrices['Wisdom Draught']! + neutralPrices['Strength Tonic']!
    discountedTotal +=
      discountedPrices['Wisdom Draught']! + discountedPrices['Strength Tonic']!
  }

  const neutralAverage = neutralTotal / iterations
  const discountedAverage = discountedTotal / iterations

  // On average, discounted prices should be lower (reputation gives discount)
  t.true(
    discountedAverage < neutralAverage,
    `Discounted average (${discountedAverage}) should be less than neutral average (${neutralAverage})`
  )
})

test('processPurchase updates inventory, cash, and market data', (t) => {
  const state = createMockGameState()
  const initialCash = state.cash
  const initialInventory = state.inventory['Wisdom Draught'] || 0

  const updatedState = processPurchase(state, 'Wisdom Draught', 2, 40)

  // Should update inventory
  t.is(updatedState.inventory['Wisdom Draught'], initialInventory + 2)

  // Should update cash
  t.is(updatedState.cash, initialCash - 2 * 40)

  // Should update market data
  const marketData =
    updatedState.marketData["Merchant's District"]?.['Wisdom Draught']
  t.truthy(marketData)
  t.true(
    marketData!.demand >
      state.marketData["Merchant's District"]!['Wisdom Draught']!.demand
  )

  // Should add to trade history
  t.is(updatedState.tradeHistory.length, 1)
  t.is(updatedState.tradeHistory[0]?.type, 'buy')
  t.is(updatedState.tradeHistory[0]?.quantity, 2)
})

test('processSale updates inventory, cash, and market data', (t) => {
  const state = createMockGameState()
  const initialCash = state.cash
  const initialInventory = state.inventory['Wisdom Draught'] || 0

  const updatedState = processSale(state, 'Wisdom Draught', 2, 40)

  // Should update inventory
  t.is(updatedState.inventory['Wisdom Draught'], initialInventory - 2)

  // Should update cash
  t.is(updatedState.cash, initialCash + 2 * 40)

  // Should update market data
  const marketData =
    updatedState.marketData["Merchant's District"]?.['Wisdom Draught']
  t.truthy(marketData)
  t.true(
    marketData!.demand <
      state.marketData["Merchant's District"]!['Wisdom Draught']!.demand
  )

  // Should add to trade history
  t.is(updatedState.tradeHistory.length, 1)
  t.is(updatedState.tradeHistory[0]?.type, 'sell')
  t.is(updatedState.tradeHistory[0]?.quantity, 2)
})

test('updateDailyMarkets updates market dynamics', (t) => {
  const state = createMockGameState()
  state.day = 2 // Advance day to trigger updates

  const updatedState = updateDailyMarkets(state)

  // Market data should be updated
  const marketData =
    updatedState.marketData["Merchant's District"]?.['Wisdom Draught']
  t.truthy(marketData)
  t.is(marketData!.lastUpdated, 2)

  // Prices may have changed due to market dynamics
  t.true(typeof marketData!.currentPrice === 'number')
})

test('getLocationMarketTrends returns trend analysis', (t) => {
  const state = createMockGameState()

  const trends = getLocationMarketTrends(state, "Merchant's District")

  t.true(Array.isArray(trends))
  t.true(trends.length > 0)

  const wisdomTrend = trends.find(
    (trend) => trend.potionType === 'Wisdom Draught'
  )
  t.truthy(wisdomTrend)
  t.is(wisdomTrend!.trend, 'rising')
  t.true(typeof wisdomTrend!.priceChange === 'number')
  t.true(typeof wisdomTrend!.confidence === 'number')
})

test('getLocationMarketTrends uses current location by default', (t) => {
  const state = createMockGameState()

  const trends = getLocationMarketTrends(state)

  t.true(Array.isArray(trends))
  t.true(trends.length > 0)
})

test('initializeGameMarkets creates initial market structure', (t) => {
  const { marketData, tradeHistory } = initializeGameMarkets()

  // Should have market data
  t.true(typeof marketData === 'object')
  t.true(Array.isArray(tradeHistory))
  t.is(tradeHistory.length, 0)

  // Should have data for expected locations
  const expectedLocations = [
    "Alchemist's Quarter",
    'Royal Castle',
    "Merchant's District",
    'Enchanted Forest',
    'Peasant Village',
  ]
  for (const location of expectedLocations) {
    t.true(location in marketData)
  }
})

test('processPurchase handles missing market data gracefully', (t) => {
  const state = createMockGameState()

  // Remove market data for the potion
  delete state.marketData["Merchant's District"]!['Wisdom Draught']

  const updatedState = processPurchase(state, 'Wisdom Draught', 2, 40)

  // Should still update inventory and cash
  t.is(updatedState.inventory['Wisdom Draught'], 7) // 5 + 2
  t.is(updatedState.cash, 920) // 1000 - 80

  // Should still add to trade history
  t.is(updatedState.tradeHistory.length, 1)
})

test('generateDynamicPrices falls back to simple pricing without market data', (t) => {
  const state = createMockGameState()

  // Remove market data
  state.marketData = {}

  const prices = generateDynamicPrices(state)

  // Should still generate prices
  t.true(typeof prices === 'object')
  t.true(Object.keys(prices).length > 0)
})
