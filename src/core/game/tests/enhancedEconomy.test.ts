import test from 'ava'
import { EnhancedEconomyManager } from '../enhancedEconomy.js'
import { type GameState } from '../../../types/game.types.js'
import { type MarketData, type SupplyDemandFactor } from '../../../types/economy.types.js'

// Mock the constants import
test.beforeEach(() => {
  // We'll need to mock the potions constant
  // For now, we'll test with the assumption that potions are available
})

test('initializeMarketData creates market data for all locations', t => {
  const marketData = EnhancedEconomyManager.initializeMarketData()
  
  // Should have data for all expected locations
  const expectedLocations = ["Alchemist's Quarter", 'Royal Castle', "Merchant's District", 'Enchanted Forest', 'Peasant Village']
  
  for (const location of expectedLocations) {
    t.true(location in marketData, `Market data should include ${location}`)
    t.true(typeof marketData[location] === 'object', `${location} should have market data object`)
  }
})

test('createInitialMarketData creates valid market data structure', t => {
  const marketData = EnhancedEconomyManager.createInitialMarketData(100, 200)
  
  // Check structure
  t.true(typeof marketData.basePrice === 'number')
  t.true(typeof marketData.currentPrice === 'number')
  t.true(typeof marketData.demand === 'number')
  t.true(typeof marketData.supply === 'number')
  t.true(typeof marketData.trend === 'string')
  t.true(Array.isArray(marketData.history))
  t.true(typeof marketData.volatility === 'number')
  t.true(typeof marketData.lastUpdated === 'number')
  
  // Check value ranges
  t.true(marketData.basePrice >= 100 && marketData.basePrice <= 200)
  t.true(marketData.currentPrice >= 100 && marketData.currentPrice <= 200)
  t.true(marketData.demand >= 0.35 && marketData.demand <= 0.65)
  t.true(marketData.supply >= 0.35 && marketData.supply <= 0.65)
  t.true(marketData.volatility >= 0.1 && marketData.volatility <= 0.3)
  
  // Check initial history
  t.is(marketData.history.length, 1)
  t.is(marketData.history[0]?.day, 1)
  t.is(marketData.history[0]?.volume, 0)
  t.is(marketData.history[0]?.playerTransaction, false)
})

test('recordTransaction updates market data correctly', t => {
  const initialMarket: MarketData = {
    basePrice: 150,
    currentPrice: 160,
    demand: 0.5,
    supply: 0.5,
    trend: 'stable',
    history: [{ day: 1, price: 160, volume: 0, playerTransaction: false }],
    volatility: 0.2,
    lastUpdated: 1
  }
  
  // Record a purchase (positive quantity)
  const updatedMarket = EnhancedEconomyManager.recordTransaction(initialMarket, 5, 2, true)
  
  // Should increase demand and decrease supply
  t.true(updatedMarket.demand > initialMarket.demand)
  t.true(updatedMarket.supply < initialMarket.supply)
  
  // Should add history entry
  t.is(updatedMarket.history.length, 2)
  t.is(updatedMarket.history[1]?.day, 2)
  t.is(updatedMarket.history[1]?.volume, 5)
  t.is(updatedMarket.history[1]?.playerTransaction, true)
  
  // Should update lastUpdated
  t.is(updatedMarket.lastUpdated, 2)
})

test('recordTransaction handles selling correctly', t => {
  const initialMarket: MarketData = {
    basePrice: 150,
    currentPrice: 160,
    demand: 0.5,
    supply: 0.5,
    trend: 'stable',
    history: [{ day: 1, price: 160, volume: 0, playerTransaction: false }],
    volatility: 0.2,
    lastUpdated: 1
  }
  
  // Record a sale (negative quantity)
  const updatedMarket = EnhancedEconomyManager.recordTransaction(initialMarket, -3, 2, true)
  
  // Should decrease demand and increase supply
  t.true(updatedMarket.demand < initialMarket.demand)
  t.true(updatedMarket.supply > initialMarket.supply)
  
  // Volume should be absolute value
  t.is(updatedMarket.history[1]?.volume, 3)
})

test('calculateDynamicPrice respects supply and demand', t => {
  const highDemandMarket: MarketData = {
    basePrice: 100,
    currentPrice: 100,
    demand: 0.8,
    supply: 0.3,
    trend: 'stable',
    history: [],
    volatility: 0.1,
    lastUpdated: 1
  }
  
  const lowDemandMarket: MarketData = {
    basePrice: 100,
    currentPrice: 100,
    demand: 0.3,
    supply: 0.8,
    trend: 'stable',
    history: [],
    volatility: 0.1,
    lastUpdated: 1
  }
  
  const highDemandPrice = EnhancedEconomyManager.calculateDynamicPrice(highDemandMarket, 1.0)
  const lowDemandPrice = EnhancedEconomyManager.calculateDynamicPrice(lowDemandMarket, 1.0)
  
  // High demand should result in higher prices
  t.true(highDemandPrice > lowDemandPrice)
  
  // Prices should be within reasonable bounds
  t.true(highDemandPrice >= 30) // 0.3 * basePrice
  t.true(highDemandPrice <= 250) // 2.5 * basePrice
  t.true(lowDemandPrice >= 30)
  t.true(lowDemandPrice <= 250)
})

test('calculateDynamicPrice applies reputation modifier', t => {
  const marketData: MarketData = {
    basePrice: 100,
    currentPrice: 100,
    demand: 0.5,
    supply: 0.5,
    trend: 'stable',
    history: [],
    volatility: 0.1,
    lastUpdated: 1
  }
  
  const normalPrice = EnhancedEconomyManager.calculateDynamicPrice(marketData, 1.0)
  const discountPrice = EnhancedEconomyManager.calculateDynamicPrice(marketData, 0.8)
  const premiumPrice = EnhancedEconomyManager.calculateDynamicPrice(marketData, 1.2)
  
  // Reputation modifier should affect prices appropriately
  t.true(discountPrice < normalPrice)
  t.true(premiumPrice > normalPrice)
})

test('calculateMarketTrend identifies trends correctly', t => {
  // Rising trend - more pronounced increase
  const risingHistory = [
    { day: 1, price: 100, volume: 10 },
    { day: 2, price: 110, volume: 8 },
    { day: 3, price: 120, volume: 12 },
    { day: 4, price: 130, volume: 9 }
  ]
  
  const risingTrend = EnhancedEconomyManager.calculateMarketTrend(risingHistory, 140)
  t.is(risingTrend, 'rising')
  
  // Falling trend - more pronounced decrease
  const fallingHistory = [
    { day: 1, price: 140, volume: 10 },
    { day: 2, price: 130, volume: 8 },
    { day: 3, price: 120, volume: 12 },
    { day: 4, price: 110, volume: 9 }
  ]
  
  const fallingTrend = EnhancedEconomyManager.calculateMarketTrend(fallingHistory, 100)
  t.is(fallingTrend, 'falling')
  
  // Stable trend
  const stableHistory = [
    { day: 1, price: 100, volume: 10 },
    { day: 2, price: 102, volume: 8 },
    { day: 3, price: 98, volume: 12 },
    { day: 4, price: 101, volume: 9 }
  ]
  
  const stableTrend = EnhancedEconomyManager.calculateMarketTrend(stableHistory, 99)
  t.is(stableTrend, 'stable')
  
  // Volatile trend - high volatility
  const volatileHistory = [
    { day: 1, price: 100, volume: 10 },
    { day: 2, price: 120, volume: 8 },
    { day: 3, price: 80, volume: 12 },
    { day: 4, price: 110, volume: 9 }
  ]
  
  const volatileTrend = EnhancedEconomyManager.calculateMarketTrend(volatileHistory, 90)
  t.is(volatileTrend, 'volatile')
})

test('applySupplyDemandFactors modifies market correctly', t => {
  const mockState: Partial<GameState> = {
    day: 5,
    marketData: {
      'Market Square': {
        'Healing Potion': {
          basePrice: 100,
          currentPrice: 100,
          demand: 0.5,
          supply: 0.5,
          trend: 'stable',
          history: [],
          volatility: 0.2,
          lastUpdated: 5
        }
      }
    }
  }
  
  const factors: SupplyDemandFactor[] = [{
    type: 'event',
    potionType: 'Healing Potion',
    location: 'Market Square',
    demandChange: 2, // Will be scaled to 0.2
    supplyChange: -1, // Will be scaled to -0.1
    duration: 3,
    startDay: 4
  }]
  
  const updatedState = EnhancedEconomyManager.applySupplyDemandFactors(mockState as GameState, factors)
  
  const updatedMarket = updatedState.marketData['Market Square']?.['Healing Potion']
  
  // Demand should increase, supply should decrease
  t.truthy(updatedMarket)
  t.true(updatedMarket!.demand > 0.5)
  t.true(updatedMarket!.supply < 0.5)
})

test('applySupplyDemandFactors ignores expired factors', t => {
  const mockState: Partial<GameState> = {
    day: 10,
    marketData: {
      'Market Square': {
        'Healing Potion': {
          basePrice: 100,
          currentPrice: 100,
          demand: 0.5,
          supply: 0.5,
          trend: 'stable',
          history: [],
          volatility: 0.2,
          lastUpdated: 10
        }
      }
    }
  }
  
  const expiredFactor: SupplyDemandFactor[] = [{
    type: 'event',
    potionType: 'Healing Potion',
    location: 'Market Square',
    demandChange: 5,
    supplyChange: -5,
    duration: 3,
    startDay: 4 // Started on day 4, duration 3, so expires on day 7
  }]
  
  const updatedState = EnhancedEconomyManager.applySupplyDemandFactors(mockState as GameState, expiredFactor)
  
  const updatedMarket = updatedState.marketData['Market Square']?.['Healing Potion']
  
  // Market should remain unchanged
  t.truthy(updatedMarket)
  t.is(updatedMarket!.demand, 0.5)
  t.is(updatedMarket!.supply, 0.5)
})

test('getMarketTrends returns trend analysis', t => {
  const mockMarkets = {
    'Healing Potion': {
      basePrice: 100,
      currentPrice: 110,
      demand: 0.6,
      supply: 0.4,
      trend: 'rising' as const,
      history: [
        { day: 1, price: 100, volume: 10 },
        { day: 2, price: 105, volume: 8 }
      ],
      volatility: 0.2,
      lastUpdated: 2
    },
    'Mana Potion': {
      basePrice: 150,
      currentPrice: 140,
      demand: 0.4,
      supply: 0.6,
      trend: 'falling' as const,
      history: [
        { day: 1, price: 150, volume: 5 },
        { day: 2, price: 145, volume: 7 }
      ],
      volatility: 0.15,
      lastUpdated: 2
    }
  }
  
  const trends = EnhancedEconomyManager.getMarketTrends(mockMarkets)
  
  t.is(trends.length, 2)
  
  const healingTrend = trends.find(t => t.potionType === 'Healing Potion')
  const manaTrend = trends.find(t => t.potionType === 'Mana Potion')
  
  t.truthy(healingTrend)
  t.truthy(manaTrend)
  
  t.is(healingTrend!.trend, 'rising')
  t.is(manaTrend!.trend, 'falling')
  
  // Price changes should be calculated correctly
  t.true(healingTrend!.priceChange > 0) // Price increased from 105 to 110
  t.true(manaTrend!.priceChange < 0) // Price decreased from 145 to 140
  
  // Confidence should be based on history length
  t.true(healingTrend!.confidence > 0)
  t.true(manaTrend!.confidence > 0)
})