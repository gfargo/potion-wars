import { type GameState } from '../../../types/game.types.js'
import { type MarketData, type MarketState, type MarketTrend, type TradeTransaction } from '../../../types/economy.types.js'
import { EnhancedEconomyManager } from '../../game/enhancedEconomy.js'

// Market Data Selectors
export const selectMarketData = (state: GameState) => state.marketData

export const selectLocationMarketData = (state: GameState, location?: string): MarketState | undefined => {
  const targetLocation = location || state.location.name
  return state.marketData[targetLocation]
}

export const selectCurrentLocationMarketData = (state: GameState): MarketState | undefined =>
  state.marketData[state.location.name]

export const selectPotionMarketData = (
  state: GameState, 
  potionType: string, 
  location?: string
): MarketData | undefined => {
  const targetLocation = location || state.location.name
  return state.marketData[targetLocation]?.[potionType]
}

export const selectCurrentPotionMarketData = (
  state: GameState, 
  potionType: string
): MarketData | undefined =>
  state.marketData[state.location.name]?.[potionType]

// Price and Trend Selectors
export const selectPotionCurrentPrice = (
  state: GameState, 
  potionType: string, 
  location?: string
): number | undefined => {
  const marketData = selectPotionMarketData(state, potionType, location)
  return marketData?.currentPrice
}

export const selectPotionBasePrice = (
  state: GameState, 
  potionType: string, 
  location?: string
): number | undefined => {
  const marketData = selectPotionMarketData(state, potionType, location)
  return marketData?.basePrice
}

export const selectPotionTrend = (
  state: GameState, 
  potionType: string, 
  location?: string
): MarketTrend | undefined => {
  const marketData = selectPotionMarketData(state, potionType, location)
  return marketData?.trend
}

export const selectPotionDemand = (
  state: GameState, 
  potionType: string, 
  location?: string
): number | undefined => {
  const marketData = selectPotionMarketData(state, potionType, location)
  return marketData?.demand
}

export const selectPotionSupply = (
  state: GameState, 
  potionType: string, 
  location?: string
): number | undefined => {
  const marketData = selectPotionMarketData(state, potionType, location)
  return marketData?.supply
}

export const selectPotionVolatility = (
  state: GameState, 
  potionType: string, 
  location?: string
): number | undefined => {
  const marketData = selectPotionMarketData(state, potionType, location)
  return marketData?.volatility
}

// Market Trends and Analysis
export const selectLocationMarketTrends = (state: GameState, location?: string) => {
  const targetLocation = location || state.location.name
  const locationMarket = state.marketData[targetLocation]
  
  if (!locationMarket) {
    return []
  }
  
  return EnhancedEconomyManager.getMarketTrends(locationMarket)
}

export const selectCurrentLocationMarketTrends = (state: GameState) =>
  selectLocationMarketTrends(state, state.location.name)

export const selectPotionPriceHistory = (
  state: GameState, 
  potionType: string, 
  location?: string
) => {
  const marketData = selectPotionMarketData(state, potionType, location)
  return marketData?.history || []
}

export const selectPotionRecentPriceChange = (
  state: GameState, 
  potionType: string, 
  location?: string
): number => {
  const history = selectPotionPriceHistory(state, potionType, location)
  
  if (history.length < 2) return 0
  
  const currentPrice = history[history.length - 1]?.price || 0
  const previousPrice = history[history.length - 2]?.price || 0
  
  if (previousPrice === 0) return 0
  
  return ((currentPrice - previousPrice) / previousPrice) * 100
}

// Market Conditions
export const selectMarketConditions = (state: GameState, location?: string) => {
  const trends = selectLocationMarketTrends(state, location)
  
  const trendCounts = trends.reduce((acc, trend) => {
    acc[trend.trend] = (acc[trend.trend] || 0) + 1
    return acc
  }, {} as Record<MarketTrend, number>)
  
  const totalPotions = trends.length
  
  return {
    rising: (trendCounts.rising || 0) / totalPotions,
    falling: (trendCounts.falling || 0) / totalPotions,
    stable: (trendCounts.stable || 0) / totalPotions,
    volatile: (trendCounts.volatile || 0) / totalPotions,
    overallTrend: Object.entries(trendCounts).reduce((a, b) => 
      trendCounts[a[0] as MarketTrend] > trendCounts[b[0] as MarketTrend] ? a : b
    )[0] as MarketTrend
  }
}

export const selectCurrentMarketConditions = (state: GameState) =>
  selectMarketConditions(state, state.location.name)

// Trade History Selectors
export const selectTradeHistory = (state: GameState): TradeTransaction[] => 
  state.tradeHistory

export const selectRecentTrades = (state: GameState, days = 7): TradeTransaction[] =>
  state.tradeHistory.filter(trade => state.day - trade.day <= days)

export const selectTradesByLocation = (state: GameState, location: string): TradeTransaction[] =>
  state.tradeHistory.filter(trade => trade.location === location)

export const selectTradesByPotion = (state: GameState, potionType: string): TradeTransaction[] =>
  state.tradeHistory.filter(trade => trade.potionType === potionType)

export const selectTotalTradeValue = (state: GameState): number =>
  state.tradeHistory.reduce((total, trade) => total + trade.totalValue, 0)

export const selectTotalProfitLoss = (state: GameState): number => {
  const purchases = state.tradeHistory
    .filter(trade => trade.type === 'buy')
    .reduce((total, trade) => total + trade.totalValue, 0)
  
  const sales = state.tradeHistory
    .filter(trade => trade.type === 'sell')
    .reduce((total, trade) => total + trade.totalValue, 0)
  
  return sales - purchases
}

export const selectAverageTradeValue = (state: GameState): number => {
  const trades = state.tradeHistory
  if (trades.length === 0) return 0
  
  return selectTotalTradeValue(state) / trades.length
}

// Market Intelligence
export const selectBestBuyingOpportunities = (state: GameState, location?: string) => {
  const trends = selectLocationMarketTrends(state, location)
  
  return trends
    .filter(trend => trend.trend === 'falling' || (trend.trend === 'stable' && trend.priceChange < -2))
    .sort((a, b) => a.priceChange - b.priceChange) // Most negative change first
    .slice(0, 3)
}

export const selectBestSellingOpportunities = (state: GameState, location?: string) => {
  const trends = selectLocationMarketTrends(state, location)
  
  return trends
    .filter(trend => trend.trend === 'rising' || (trend.trend === 'stable' && trend.priceChange > 2))
    .sort((a, b) => b.priceChange - a.priceChange) // Most positive change first
    .slice(0, 3)
}

export const selectMarketOpportunities = (state: GameState, location?: string) => ({
  buying: selectBestBuyingOpportunities(state, location),
  selling: selectBestSellingOpportunities(state, location)
})

// Market Status
export const selectIsMarketDataStale = (state: GameState, location?: string): boolean => {
  const targetLocation = location || state.location.name
  const locationMarket = state.marketData[targetLocation]
  
  if (!locationMarket) return true
  
  // Check if any potion's market data is more than 1 day old
  return Object.values(locationMarket).some(marketData => 
    state.day - marketData.lastUpdated > 1
  )
}

export const selectMarketDataAge = (state: GameState, location?: string): number => {
  const targetLocation = location || state.location.name
  const locationMarket = state.marketData[targetLocation]
  
  if (!locationMarket) return Infinity
  
  // Return the oldest market data age
  return Math.max(...Object.values(locationMarket).map(marketData => 
    state.day - marketData.lastUpdated
  ))
}

// Comparative Analysis
export const selectLocationPriceComparison = (state: GameState, potionType: string) => {
  const comparison = []
  
  for (const [location, marketData] of Object.entries(state.marketData)) {
    const potionData = marketData[potionType]
    if (potionData) {
      comparison.push({
        location,
        price: potionData.currentPrice,
        trend: potionData.trend,
        demand: potionData.demand,
        supply: potionData.supply
      })
    }
  }
  
  return comparison.sort((a, b) => a.price - b.price)
}

export const selectBestLocationToBuy = (state: GameState, potionType: string) => {
  const comparison = selectLocationPriceComparison(state, potionType)
  return comparison[0] // Lowest price
}

export const selectBestLocationToSell = (state: GameState, potionType: string) => {
  const comparison = selectLocationPriceComparison(state, potionType)
  return comparison[comparison.length - 1] // Highest price
}

export const selectArbitrageOpportunities = (state: GameState) => {
  const opportunities = []
  const potionTypes = Object.keys(state.marketData[state.location.name] || {})
  
  for (const potionType of potionTypes) {
    const comparison = selectLocationPriceComparison(state, potionType)
    if (comparison.length >= 2) {
      const lowest = comparison[0]!
      const highest = comparison[comparison.length - 1]!
      const profitMargin = highest.price - lowest.price
      const profitPercentage = (profitMargin / lowest.price) * 100
      
      if (profitPercentage > 10) { // Only show opportunities with >10% profit
        opportunities.push({
          potionType,
          buyLocation: lowest.location,
          sellLocation: highest.location,
          buyPrice: lowest.price,
          sellPrice: highest.price,
          profitMargin,
          profitPercentage
        })
      }
    }
  }
  
  return opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage)
}