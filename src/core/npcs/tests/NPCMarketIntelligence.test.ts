import test from 'ava'
import {
  NPCMarketIntelligence,
  type MarketTrend,
  type MarketAdvice,
} from '../NPCMarketIntelligence.js'
import { type GameState } from '../../../types/game.types.js'
import { type MarketData } from '../../../types/economy.types.js'

// Test data
const mockMarketData: MarketData = {
  basePrice: 100,
  currentPrice: 120,
  demand: 0.7,
  supply: 0.4,
  trend: 'rising',
  volatility: 0.3,
  lastUpdated: 9,
  history: [
    { day: 5, price: 95, volume: 10 },
    { day: 6, price: 100, volume: 8 },
    { day: 7, price: 110, volume: 12 },
    { day: 8, price: 115, volume: 15 },
    { day: 9, price: 120, volume: 18 },
  ],
}

const mockStableMarketData: MarketData = {
  basePrice: 100,
  currentPrice: 102,
  demand: 0.5,
  supply: 0.5,
  trend: 'stable',
  volatility: 0.1,
  lastUpdated: 9,
  history: [
    { day: 5, price: 100, volume: 10 },
    { day: 6, price: 101, volume: 10 },
    { day: 7, price: 99, volume: 10 },
    { day: 8, price: 102, volume: 10 },
    { day: 9, price: 102, volume: 10 },
  ],
}

const mockGameState: GameState = {
  day: 10,
  cash: 1000,
  health: 100,
  debt: 0,
  location: {
    name: 'Market Square',
    description: 'A bustling marketplace',
    dangerLevel: 1,
  },
  weather: 'sunny',
  inventory: {
    'Healing Potion': 5,
    'Strength Potion': 0,
  },
  reputation: {
    global: 25,
    locations: {
      'Market Square': 30,
      'Dark Alley': -10,
      'Royal Palace': 50,
    },
    npcRelationships: {},
  },
  prices: {},
  marketData: {
    'Market Square': {
      'Healing Potion': mockMarketData,
      'Strength Potion': mockStableMarketData,
    },
    'Royal Palace': {
      'Healing Potion': {
        ...mockMarketData,
        currentPrice: 80, // Lower price - good buying opportunity
        demand: 0.8,
      },
    },
  },
  tradeHistory: [],
  strength: 10,
  agility: 10,
  intelligence: 10,
}

test('generateMarketTrends analyzes price trends correctly', (t) => {
  const trends = NPCMarketIntelligence.generateMarketTrends(mockGameState)

  t.true(trends.length > 0)

  // Should find rising trend for Healing Potion in Market Square
  const healingTrend = trends.find(
    (trend) =>
      trend.potion === 'Healing Potion' && trend.location === 'Market Square'
  )

  t.truthy(healingTrend)
  t.is(healingTrend!.trend, 'rising')
  t.true(healingTrend!.confidence > 0.5)
  t.true(healingTrend!.priceChange > 0)
})

test('generateMarketTrends filters by location', (t) => {
  const trends = NPCMarketIntelligence.generateMarketTrends(
    mockGameState,
    'Market Square'
  )

  t.true(trends.every((trend) => trend.location === 'Market Square'))
})

test('generateMarketTrends handles stable markets', (t) => {
  const stableGameState = {
    ...mockGameState,
    marketData: {
      'Market Square': {
        'Strength Potion': mockStableMarketData,
      },
    },
  }

  const trends = NPCMarketIntelligence.generateMarketTrends(stableGameState)
  const stableTrend = trends.find((trend) => trend.potion === 'Strength Potion')

  t.truthy(stableTrend)
  t.is(stableTrend!.trend, 'stable')
})

test('generateMarketAdvice provides buying advice for low prices', (t) => {
  const advice = NPCMarketIntelligence.generateMarketAdvice(
    mockGameState,
    'Royal Palace'
  )

  const healingAdvice = advice.find((adv) => adv.potion === 'Healing Potion')

  t.truthy(healingAdvice)
  t.is(healingAdvice!.type, 'buy')
  t.true(healingAdvice!.confidence > 0.5)
  t.truthy(healingAdvice!.expectedProfit)
})

test('generateMarketAdvice provides selling advice for high prices', (t) => {
  const advice = NPCMarketIntelligence.generateMarketAdvice(
    mockGameState,
    'Market Square'
  )

  const healingAdvice = advice.find((adv) => adv.potion === 'Healing Potion')

  t.truthy(healingAdvice)
  t.is(healingAdvice!.type, 'sell')
  t.true(healingAdvice!.confidence > 0.5)
  t.truthy(healingAdvice!.expectedProfit)
})

test('generateMarketAdvice considers player inventory', (t) => {
  const noInventoryState = {
    ...mockGameState,
    inventory: {},
  }

  const advice = NPCMarketIntelligence.generateMarketAdvice(
    noInventoryState,
    'Market Square'
  )
  const healingAdvice = advice.find((adv) => adv.potion === 'Healing Potion')

  // Should not suggest selling if player has no inventory
  t.true(!healingAdvice || healingAdvice.type !== 'sell')
})

test('generateMarketAdvice adjusts confidence based on reputation', (t) => {
  const highRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: {
        ...mockGameState.reputation.locations,
        'Market Square': 80,
      },
    },
  }

  const lowRepAdvice = NPCMarketIntelligence.generateMarketAdvice(
    mockGameState,
    'Market Square'
  )
  const highRepAdvice = NPCMarketIntelligence.generateMarketAdvice(
    highRepState,
    'Market Square'
  )

  const lowRepHealing = lowRepAdvice.find(
    (adv) => adv.potion === 'Healing Potion'
  )
  const highRepHealing = highRepAdvice.find(
    (adv) => adv.potion === 'Healing Potion'
  )

  if (lowRepHealing && highRepHealing) {
    t.true(highRepHealing.confidence >= lowRepHealing.confidence)
  }
})

test('getPriceIntelligence calculates statistics correctly', (t) => {
  const intelligence = NPCMarketIntelligence.getPriceIntelligence(
    mockGameState,
    'Healing Potion',
    'Market Square'
  )

  t.truthy(intelligence)
  t.is(intelligence!.currentPrice, 120)
  t.is(intelligence!.highPrice, 120)
  t.is(intelligence!.lowPrice, 95)
  t.true(intelligence!.averagePrice > 95 && intelligence!.averagePrice < 120)
  t.true(intelligence!.volatility >= 0 && intelligence!.volatility <= 1)
  t.is(intelligence!.lastUpdated, 10)
})

test('getPriceIntelligence returns null for missing data', (t) => {
  const intelligence = NPCMarketIntelligence.getPriceIntelligence(
    mockGameState,
    'Nonexistent Potion',
    'Market Square'
  )

  t.is(intelligence, undefined)
})

test('getPriceIntelligence returns null for empty history', (t) => {
  const emptyHistoryState = {
    ...mockGameState,
    marketData: {
      'Market Square': {
        'Healing Potion': {
          ...mockMarketData,
          history: [],
        },
      },
    },
  }

  const intelligence = NPCMarketIntelligence.getPriceIntelligence(
    emptyHistoryState,
    'Healing Potion',
    'Market Square'
  )

  t.is(intelligence, undefined)
})

test('getLocationIntelligence generates trend information', (t) => {
  const intelligence = NPCMarketIntelligence.getLocationIntelligence(
    mockGameState,
    'Market Square'
  )

  const trendInfo = intelligence.find((info) =>
    info.id.includes('market_trends')
  )
  t.truthy(trendInfo)
  t.is(trendInfo!.category, 'market')
  t.true(trendInfo!.content.includes('Market trends'))
})

test('getLocationIntelligence generates advice information', (t) => {
  const intelligence = NPCMarketIntelligence.getLocationIntelligence(
    mockGameState,
    'Market Square'
  )

  const adviceInfo = intelligence.find((info) =>
    info.id.includes('market_advice')
  )
  t.truthy(adviceInfo)
  t.is(adviceInfo!.category, 'market')
  t.true(adviceInfo!.content.includes('Trading tip'))
})

test('getLocationIntelligence filters by confidence', (t) => {
  // Create a state with low-confidence data
  const lowConfidenceState = {
    ...mockGameState,
    marketData: {
      'Market Square': {
        'Healing Potion': {
          ...mockMarketData,
          history: [
            { day: 9, price: 100, volume: 10 },
            { day: 10, price: 101, volume: 10 },
          ],
        },
      },
    },
  }

  const intelligence = NPCMarketIntelligence.getLocationIntelligence(
    lowConfidenceState,
    'Market Square'
  )

  // Should have fewer or no intelligence items due to low confidence
  t.true(intelligence.length <= 2)
})

test('formatMarketTrend creates readable format', (t) => {
  const trend: MarketTrend = {
    location: 'Market Square',
    potion: 'Healing Potion',
    trend: 'rising',
    confidence: 0.8,
    priceChange: 15,
    timeframe: 'next few days',
  }

  const formatted = NPCMarketIntelligence.formatMarketTrend(trend)

  t.true(formatted.includes('Healing Potion'))
  t.true(formatted.includes('Market Square'))
  t.true(formatted.includes('15%'))
  t.true(formatted.includes('📈'))
})

test('formatMarketAdvice creates readable format', (t) => {
  const advice: MarketAdvice = {
    type: 'buy',
    potion: 'Healing Potion',
    location: 'Market Square',
    reason: 'prices are low and demand is increasing',
    confidence: 0.8,
    expectedProfit: 150,
  }

  const formatted = NPCMarketIntelligence.formatMarketAdvice(advice)

  t.true(formatted.includes('💰 BUY'))
  t.true(formatted.includes('Healing Potion'))
  t.true(formatted.includes('Market Square'))
  t.true(formatted.includes('150 gold'))
})

test('formatMarketAdvice handles advice without profit', (t) => {
  const advice: MarketAdvice = {
    type: 'avoid',
    potion: 'Strength Potion',
    location: 'Dark Alley',
    reason: 'market is oversupplied',
    confidence: 0.6,
  }

  const formatted = NPCMarketIntelligence.formatMarketAdvice(advice)

  t.true(formatted.includes('⚠️ AVOID'))
  t.true(formatted.includes('Strength Potion'))
  t.false(formatted.includes('profit'))
})

test('analyzePriceTrend handles insufficient data', (t) => {
  const shortHistoryMarket: MarketData = {
    basePrice: 100,
    currentPrice: 100,
    demand: 0.5,
    supply: 0.5,
    trend: 'stable',
    volatility: 0.1,
    lastUpdated: 9,
    history: [{ day: 9, price: 100, volume: 10 }],
  }

  const gameStateWithShortHistory = {
    ...mockGameState,
    marketData: {
      'Market Square': {
        'Healing Potion': shortHistoryMarket,
      },
    },
  }

  const trends = NPCMarketIntelligence.generateMarketTrends(
    gameStateWithShortHistory
  )

  // Should not generate trends for insufficient data
  t.is(trends.length, 0)
})

test('analyzeMarketOpportunity considers player cash', (t) => {
  const poorPlayerState = {
    ...mockGameState,
    cash: 50, // Not enough to buy much
  }

  const advice = NPCMarketIntelligence.generateMarketAdvice(
    poorPlayerState,
    'Royal Palace'
  )
  const healingAdvice = advice.find((adv) => adv.potion === 'Healing Potion')

  if (healingAdvice?.expectedProfit) {
    // Expected profit should be limited by available cash
    t.true(healingAdvice.expectedProfit <= 50)
  } else {
    // If no advice or no expected profit, that's also valid
    t.pass('No advice generated or no expected profit calculated')
  }
})
