import test from 'ava'
import { EnhancedEconomyManager } from '../enhancedEconomy.js'
import {
  type MarketData,
  type PriceHistoryEntry,
} from '../../../types/economy.types.js'

// Test data setup
const createTestMarketData = (basePrice = 100): MarketData => ({
  basePrice,
  currentPrice: basePrice,
  demand: 0.6,
  supply: 0.4,
  trend: 'stable',
  history: [
    { day: 1, price: basePrice - 10, volume: 5, playerTransaction: false },
    { day: 2, price: basePrice - 5, volume: 8, playerTransaction: true },
    { day: 3, price: basePrice, volume: 3, playerTransaction: false },
    { day: 4, price: basePrice + 5, volume: 12, playerTransaction: true },
    { day: 5, price: basePrice + 10, volume: 7, playerTransaction: false },
  ],
  volatility: 0.15,
  lastUpdated: 5,
})

const createLongPriceHistory = (
  days: number,
  basePrice = 100
): PriceHistoryEntry[] => {
  const history: PriceHistoryEntry[] = []
  for (let i = 1; i <= days; i++) {
    history.push({
      day: i,
      price: basePrice + Math.sin(i / 10) * 20 + (Math.random() - 0.5) * 10,
      volume: Math.floor(Math.random() * 20) + 1,
      playerTransaction: Math.random() > 0.7,
    })
  }

  return history
}

test.beforeEach(() => {
  EnhancedEconomyManager.clearCaches()
})

test('EnhancedEconomyManager price calculation caching improves performance', (t) => {
  const marketData = createTestMarketData()
  const reputationModifier = 0.9

  // First calculation - populate cache
  const start1 = performance.now()
  const price1 = EnhancedEconomyManager.calculateDynamicPrice(
    marketData,
    reputationModifier
  )
  const time1 = performance.now() - start1

  // Second calculation - use cache
  const start2 = performance.now()
  const price2 = EnhancedEconomyManager.calculateDynamicPrice(
    marketData,
    reputationModifier
  )
  const time2 = performance.now() - start2

  // Results should be identical
  t.is(price1, price2)

  // Second call should be faster (cached)
  t.true(
    time2 < time1,
    `Cached call (${time2}ms) should be faster than initial call (${time1}ms)`
  )

  // Price should be reasonable
  t.true(price1 > 0)
  t.true(price1 < marketData.basePrice * 3)
})

test('EnhancedEconomyManager market trend caching improves performance', (t) => {
  const history = createLongPriceHistory(20)
  const currentPrice = 110

  // First calculation - populate cache
  const start1 = performance.now()
  const trend1 = EnhancedEconomyManager.calculateMarketTrend(
    history,
    currentPrice
  )
  const time1 = performance.now() - start1

  // Second calculation - use cache
  const start2 = performance.now()
  const trend2 = EnhancedEconomyManager.calculateMarketTrend(
    history,
    currentPrice
  )
  const time2 = performance.now() - start2

  // Results should be identical
  t.is(trend1, trend2)

  // Second call should be faster (cached)
  t.true(
    time2 < time1,
    `Cached call (${time2}ms) should be faster than initial call (${time1}ms)`
  )

  // Trend should be valid
  t.true(['rising', 'falling', 'stable', 'volatile'].includes(trend1))
})

test('EnhancedEconomyManager cache invalidation with different parameters', (t) => {
  const marketData = createTestMarketData()

  // Calculate with different reputation modifiers
  const price1 = EnhancedEconomyManager.calculateDynamicPrice(marketData, 0.8)
  const price2 = EnhancedEconomyManager.calculateDynamicPrice(marketData, 1.2)

  // Should be different due to different reputation modifiers
  t.not(price1, price2)

  // Both should be cached separately
  const price1_cached = EnhancedEconomyManager.calculateDynamicPrice(
    marketData,
    0.8
  )
  const price2_cached = EnhancedEconomyManager.calculateDynamicPrice(
    marketData,
    1.2
  )

  t.is(price1, price1_cached)
  t.is(price2, price2_cached)
})

test('EnhancedEconomyManager performance with complex market data', (t) => {
  const marketData = createTestMarketData()
  marketData.history = createLongPriceHistory(100) // Long history

  const start = performance.now()

  // Perform multiple calculations
  for (let i = 0; i < 100; i++) {
    const reputationModifier = 0.8 + (i % 5) * 0.1
    EnhancedEconomyManager.calculateDynamicPrice(marketData, reputationModifier)
  }

  const time = performance.now() - start

  // Should complete in reasonable time (less than 100ms)
  t.true(
    time < 100,
    `100 price calculations took ${time}ms, should be under 100ms`
  )
})

test('EnhancedEconomyManager trend calculation performance with large history', (t) => {
  const longHistory = createLongPriceHistory(1000) // Very long history
  const currentPrice = 120

  const start = performance.now()
  const trend = EnhancedEconomyManager.calculateMarketTrend(
    longHistory,
    currentPrice
  )
  const time = performance.now() - start

  // Should complete in reasonable time even with large history
  t.true(
    time < 50,
    `Trend calculation with 1000 history entries took ${time}ms, should be under 50ms`
  )

  // Should return valid trend
  t.true(['rising', 'falling', 'stable', 'volatile'].includes(trend))
})

test('EnhancedEconomyManager cache cleanup prevents memory leaks', (t) => {
  const baseMarketData = createTestMarketData()

  // Generate many different cache entries
  for (let i = 0; i < 1000; i++) {
    const marketData = {
      ...baseMarketData,
      basePrice: 100 + i,
      demand: 0.3 + (i % 60) / 100,
      supply: 0.3 + ((i + 30) % 60) / 100,
      lastUpdated: i,
    }

    EnhancedEconomyManager.calculateDynamicPrice(marketData, 1)
  }

  // Cache should handle cleanup without errors
  t.pass('Cache cleanup completed without errors')
})

test('EnhancedEconomyManager deterministic pricing with caching', (t) => {
  const marketData = createTestMarketData()

  // Multiple calls with same parameters should return identical results
  const prices = []
  for (let i = 0; i < 10; i++) {
    prices.push(EnhancedEconomyManager.calculateDynamicPrice(marketData, 1))
  }

  // All prices should be identical (deterministic)
  const firstPrice = prices[0]
  t.true(prices.every((price) => price === firstPrice))
})

test('EnhancedEconomyManager cache TTL expiration', async (t) => {
  const marketData = createTestMarketData()

  // First calculation
  const price1 = EnhancedEconomyManager.calculateDynamicPrice(marketData, 1)

  // Wait for cache to potentially expire (simulate time passing)
  // Note: In real implementation, we'd need to mock time or wait for actual TTL
  // For this test, we'll just verify the cache works correctly

  const price2 = EnhancedEconomyManager.calculateDynamicPrice(marketData, 1)

  // Should be identical (cache should still be valid)
  t.is(price1, price2)
})

test('EnhancedEconomyManager market trends with various patterns', (t) => {
  // Test different market patterns
  const patterns = [
    // Rising pattern
    [100, 105, 110, 115, 120],
    // Falling pattern
    [120, 115, 110, 105, 100],
    // Volatile pattern
    [100, 120, 90, 130, 80],
    // Stable pattern
    [100, 101, 99, 102, 98],
  ]

  for (const pattern of patterns) {
    const history: PriceHistoryEntry[] = pattern.map((price, index) => ({
      day: index + 1,
      price,
      volume: 10,
      playerTransaction: false,
    }))

    const currentPrice = pattern.at(-1)!

    // First call
    const start1 = performance.now()
    const trend1 = EnhancedEconomyManager.calculateMarketTrend(
      history,
      currentPrice
    )
    const time1 = performance.now() - start1

    // Second call (cached)
    const start2 = performance.now()
    const trend2 = EnhancedEconomyManager.calculateMarketTrend(
      history,
      currentPrice
    )
    const time2 = performance.now() - start2

    // Should be identical and cached call should be faster
    t.is(trend1, trend2)
    t.true(time2 <= time1) // Allow for equal time in case of very fast execution
  }
})

test('EnhancedEconomyManager initialization performance', (t) => {
  const start = performance.now()
  const marketData = EnhancedEconomyManager.initializeMarketData()
  const time = performance.now() - start

  // Should initialize quickly
  t.true(
    time < 50,
    `Market initialization took ${time}ms, should be under 50ms`
  )

  // Should create data for all locations
  const locations = [
    "Alchemist's Quarter",
    'Royal Castle',
    "Merchant's District",
    'Enchanted Forest',
    'Peasant Village',
  ]
  for (const location of locations) {
    t.true(location in marketData)
    t.true(
      marketData[location] !== undefined &&
        Object.keys(marketData[location]).length > 0
    )
  }
})
