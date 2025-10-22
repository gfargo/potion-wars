import test from 'ava'
import { gameReducer } from '../reducers/gameReducer.js'
import {
    updateMarketData,
    recordTransaction,
    updateDailyMarkets,
    applySupplyDemandFactors,
    initializeGame
} from '../actions/creators.js'
import {
    selectMarketData,
    selectLocationMarketData,
    selectPotionCurrentPrice,
    selectPotionTrend,
    selectLocationMarketTrends,
    selectTradeHistory,
    selectTotalTradeValue,
    selectBestBuyingOpportunities,
    selectArbitrageOpportunities
} from '../selectors/marketSelectors.js'
import { type GameState } from '../../../types/game.types.js'
import { type LocationMarketState, type SupplyDemandFactor } from '../../../types/economy.types.js'
import { ReputationManager } from '../../reputation/ReputationManager.js'

// Create initial state for testing
const createInitialState = (): GameState => ({
  day: 1,
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: { name: "Merchant's District", description: 'A bustling marketplace', dangerLevel: 1 },
  inventory: {},
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
        history: [
          { day: 1, price: 35, volume: 10, playerTransaction: false }
        ],
        volatility: 0.2,
        lastUpdated: 1
      }
    }
  },
  tradeHistory: []
})

test('initializeGame creates market data', t => {
  const initialState = createInitialState()
  const action = initializeGame()
  const newState = gameReducer(initialState, action)
  
  // Should have market data
  t.true(typeof newState.marketData === 'object')
  t.true(Array.isArray(newState.tradeHistory))
  
  // Should have data for expected locations
  const expectedLocations = ["Alchemist's Quarter", 'Royal Castle', "Merchant's District", 'Enchanted Forest', 'Peasant Village']
  for (const location of expectedLocations) {
    t.true(location in newState.marketData)
  }
})

test('updateMarketData action updates state', t => {
  const state = createInitialState()
  const newMarketData: LocationMarketState = {
    "Royal Castle": {
      'Strength Tonic': {
        basePrice: 160,
        currentPrice: 180,
        demand: 0.7,
        supply: 0.3,
        trend: 'rising',
        history: [],
        volatility: 0.25,
        lastUpdated: 2
      }
    }
  }
  
  const action = updateMarketData(newMarketData)
  const newState = gameReducer(state, action)
  
  t.deepEqual(newState.marketData, newMarketData)
})

test('recordTransaction action updates market and trade history', t => {
  const state = createInitialState()
  const action = recordTransaction("Merchant's District", 'Wisdom Draught', 5, 40, 1)
  const newState = gameReducer(state, action)
  
  // Should update market data
  const marketData = newState.marketData["Merchant's District"]?.['Wisdom Draught']
  t.truthy(marketData)
  t.true(marketData!.demand > state.marketData["Merchant's District"]!['Wisdom Draught']!.demand)
  
  // Should add to trade history
  t.is(newState.tradeHistory.length, 1)
  t.is(newState.tradeHistory[0]?.type, 'buy')
  t.is(newState.tradeHistory[0]?.quantity, 5)
  t.is(newState.tradeHistory[0]?.totalValue, 200)
})

test('recordTransaction handles selling correctly', t => {
  const state = createInitialState()
  const action = recordTransaction("Merchant's District", 'Wisdom Draught', -3, 40, 1)
  const newState = gameReducer(state, action)
  
  // Should update market data for selling
  const marketData = newState.marketData["Merchant's District"]?.['Wisdom Draught']
  t.truthy(marketData)
  t.true(marketData!.demand < state.marketData["Merchant's District"]!['Wisdom Draught']!.demand)
  
  // Should add to trade history as sell
  t.is(newState.tradeHistory.length, 1)
  t.is(newState.tradeHistory[0]?.type, 'sell')
  t.is(newState.tradeHistory[0]?.quantity, 3) // Absolute value
})

test('updateDailyMarkets action updates market dynamics', t => {
  const state = createInitialState()
  state.day = 2 // Advance day to trigger updates
  
  const action = updateDailyMarkets()
  const newState = gameReducer(state, action)
  
  // Market data should be updated
  const marketData = newState.marketData["Merchant's District"]?.['Wisdom Draught']
  t.truthy(marketData)
  t.is(marketData!.lastUpdated, 2)
})

test('applySupplyDemandFactors action modifies market', t => {
  const state = createInitialState()
  const originalDemand = state.marketData["Merchant's District"]!['Wisdom Draught']!.demand
  const originalSupply = state.marketData["Merchant's District"]!['Wisdom Draught']!.supply
  
  const factors: SupplyDemandFactor[] = [{
    type: 'event',
    potionType: 'Wisdom Draught',
    location: "Merchant's District",
    demandChange: 2,
    supplyChange: -1,
    duration: 3,
    startDay: 1
  }]
  
  const action = applySupplyDemandFactors(factors)
  const newState = gameReducer(state, action)
  
  const marketData = newState.marketData["Merchant's District"]?.['Wisdom Draught']
  t.truthy(marketData)
  
  // The changes are scaled down by 0.1 in the implementation
  const expectedDemandIncrease = 2 * 0.1 // 0.2
  const expectedSupplyDecrease = -1 * 0.1 // -0.1
  
  t.true(Math.abs(marketData!.demand - (originalDemand + expectedDemandIncrease)) < 0.01)
  t.true(Math.abs(marketData!.supply - (originalSupply + expectedSupplyDecrease)) < 0.01)
})

test('selectMarketData returns market data', t => {
  const state = createInitialState()
  const marketData = selectMarketData(state)
  
  t.deepEqual(marketData, state.marketData)
})

test('selectLocationMarketData returns location-specific data', t => {
  const state = createInitialState()
  const locationData = selectLocationMarketData(state, "Merchant's District")
  
  t.truthy(locationData)
  t.true('Wisdom Draught' in locationData!)
})

test('selectPotionCurrentPrice returns current price', t => {
  const state = createInitialState()
  const price = selectPotionCurrentPrice(state, 'Wisdom Draught', "Merchant's District")
  
  t.is(price, 40)
})

test('selectPotionTrend returns trend', t => {
  const state = createInitialState()
  const trend = selectPotionTrend(state, 'Wisdom Draught', "Merchant's District")
  
  t.is(trend, 'rising')
})

test('selectLocationMarketTrends returns trend analysis', t => {
  const state = createInitialState()
  const trends = selectLocationMarketTrends(state, "Merchant's District")
  
  t.true(Array.isArray(trends))
  t.true(trends.length > 0)
  
  const wisdomTrend = trends.find(trend => trend.potionType === 'Wisdom Draught')
  t.truthy(wisdomTrend)
  t.is(wisdomTrend!.trend, 'rising')
})

test('selectTradeHistory returns trade history', t => {
  const state = createInitialState()
  // Add some trade history
  state.tradeHistory = [{
    day: 1,
    location: "Merchant's District",
    potionType: 'Wisdom Draught',
    quantity: 5,
    pricePerUnit: 40,
    totalValue: 200,
    type: 'buy'
  }]
  
  const history = selectTradeHistory(state)
  t.is(history.length, 1)
  t.is(history[0]?.type, 'buy')
})

test('selectTotalTradeValue calculates total trade value', t => {
  const state = createInitialState()
  state.tradeHistory = [
    {
      day: 1,
      location: "Merchant's District",
      potionType: 'Wisdom Draught',
      quantity: 5,
      pricePerUnit: 40,
      totalValue: 200,
      type: 'buy'
    },
    {
      day: 2,
      location: "Merchant's District",
      potionType: 'Wisdom Draught',
      quantity: 3,
      pricePerUnit: 45,
      totalValue: 135,
      type: 'sell'
    }
  ]
  
  const totalValue = selectTotalTradeValue(state)
  t.is(totalValue, 335) // 200 + 135
})

test('selectBestBuyingOpportunities identifies buying opportunities', t => {
  const state = createInitialState()
  // Add market data with falling trend
  state.marketData["Merchant's District"]!['Strength Tonic'] = {
    basePrice: 160,
    currentPrice: 140,
    demand: 0.3,
    supply: 0.7,
    trend: 'falling',
    history: [
      { day: 1, price: 160, volume: 5 },
      { day: 2, price: 140, volume: 8 }
    ],
    volatility: 0.15,
    lastUpdated: 2
  }
  
  const opportunities = selectBestBuyingOpportunities(state, "Merchant's District")
  
  t.true(Array.isArray(opportunities))
  const fallingPotion = opportunities.find(opp => opp.potionType === 'Strength Tonic')
  t.truthy(fallingPotion)
  t.is(fallingPotion!.trend, 'falling')
})

test('selectArbitrageOpportunities identifies profit opportunities', t => {
  const state = createInitialState()
  
  // Add market data for multiple locations with price differences
  state.marketData['Royal Castle'] = {
    'Wisdom Draught': {
      basePrice: 35,
      currentPrice: 60, // Higher price
      demand: 0.8,
      supply: 0.2,
      trend: 'rising',
      history: [{ day: 1, price: 60, volume: 3 }],
      volatility: 0.2,
      lastUpdated: 1
    }
  }
  
  const opportunities = selectArbitrageOpportunities(state)
  
  t.true(Array.isArray(opportunities))
  if (opportunities.length > 0) {
    const opportunity = opportunities[0]!
    t.is(opportunity.potionType, 'Wisdom Draught')
    t.is(opportunity.buyLocation, "Merchant's District")
    t.is(opportunity.sellLocation, 'Royal Castle')
    t.true(opportunity.profitPercentage > 10)
  }
})

test('market selectors handle missing data gracefully', t => {
  const state = createInitialState()
  state.marketData = {} // Empty market data
  
  const locationData = selectLocationMarketData(state, "Merchant's District")
  const price = selectPotionCurrentPrice(state, 'Wisdom Draught', "Merchant's District")
  const trends = selectLocationMarketTrends(state, "Merchant's District")
  
  t.is(locationData, undefined)
  t.is(price, undefined)
  t.deepEqual(trends, [])
})