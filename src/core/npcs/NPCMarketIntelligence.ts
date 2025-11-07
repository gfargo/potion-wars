import { type GameState } from '../../types/game.types.js'
import { type NPCInformation } from '../../types/npc.types.js'
import { type MarketData } from '../../types/economy.types.js'

export type MarketTrend = {
  location: string
  potion: string
  trend: 'rising' | 'falling' | 'stable'
  confidence: number // 0-1, how reliable the prediction is
  priceChange: number // Percentage change expected
  timeframe: string // Description of when this might happen
}

export type MarketAdvice = {
  type: 'buy' | 'sell' | 'hold' | 'avoid'
  potion: string
  location: string
  reason: string
  confidence: number // 0-1
  expectedProfit?: number
}

export type PriceIntelligence = {
  currentPrice: number
  averagePrice: number
  highPrice: number
  lowPrice: number
  volatility: number // 0-1, how much prices fluctuate
  lastUpdated: number // Day
}

export class NPCMarketIntelligence {
  /**
   * Generate market trend information based on current market data
   */
  static generateMarketTrends(
    gameState: GameState,
    location?: string
  ): MarketTrend[] {
    const trends: MarketTrend[] = []
    const { marketData, day } = gameState

    // Get locations to analyze
    const locations = location ? [location] : Object.keys(marketData)

    for (const loc of locations) {
      const locationMarkets = marketData[loc]
      if (!locationMarkets) continue

      for (const [potion, market] of Object.entries(locationMarkets)) {
        const trend = this.analyzePriceTrend(market, day)
        if (trend) {
          trends.push({
            location: loc,
            potion,
            ...trend,
          })
        }
      }
    }

    return trends.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Generate market advice based on current conditions and player state
   */
  static generateMarketAdvice(
    gameState: GameState,
    location: string
  ): MarketAdvice[] {
    const advice: MarketAdvice[] = []
    const { marketData, inventory, cash, reputation } = gameState
    const locationMarkets = marketData[location]

    if (!locationMarkets) return advice

    const locationReputation = reputation.locations[location] || 0

    for (const [potion, market] of Object.entries(locationMarkets)) {
      const playerQuantity = inventory[potion] || 0
      const marketAdvice = this.analyzeMarketOpportunity(
        potion,
        market,
        playerQuantity,
        cash,
        locationReputation
      )

      if (marketAdvice) {
        advice.push({
          location,
          ...marketAdvice,
        })
      }
    }

    return advice.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Get price intelligence for a specific potion and location
   */
  static getPriceIntelligence(
    gameState: GameState,
    potion: string,
    location: string
  ): PriceIntelligence | undefined {
    const market = gameState.marketData[location]?.[potion]
    if (!market) return undefined

    const history = market.history || []
    if (history.length === 0) return undefined

    const prices = history.map((entry) => entry.price)
    const { currentPrice } = market
    const averagePrice =
      prices.reduce((sum, price) => sum + price, 0) / prices.length
    const highPrice = Math.max(...prices)
    const lowPrice = Math.min(...prices)

    // Calculate volatility as standard deviation / mean
    const variance =
      prices.reduce((sum, price) => sum + (price - averagePrice) ** 2, 0) /
      prices.length
    const volatility = Math.sqrt(variance) / averagePrice

    return {
      currentPrice,
      averagePrice: Math.round(averagePrice),
      highPrice,
      lowPrice,
      volatility: Math.min(1, volatility), // Cap at 1
      lastUpdated: gameState.day,
    }
  }

  /**
   * Generate location-specific market intelligence
   */
  static getLocationIntelligence(
    gameState: GameState,
    location: string
  ): NPCInformation[] {
    const intelligence: NPCInformation[] = []
    const trends = this.generateMarketTrends(gameState, location)
    const advice = this.generateMarketAdvice(gameState, location)

    // Create trend information
    const significantTrends = trends.filter((trend) => trend.confidence > 0.6)
    if (significantTrends.length > 0) {
      const trendInfo = significantTrends
        .slice(0, 3)
        .map((trend) => {
          const direction =
            trend.trend === 'rising'
              ? 'increasing'
              : trend.trend === 'falling'
                ? 'decreasing'
                : 'stable'
          return `${trend.potion} prices are ${direction} (${Math.abs(
            trend.priceChange
          )}% expected)`
        })
        .join('. ')

      intelligence.push({
        id: `market_trends_${location}`,
        content: `Market trends in ${location}: ${trendInfo}.`,
        category: 'market',
        reputationRequirement: 10,
      })
    }

    // Create advice information
    const goodAdvice = advice.filter(
      (adv) => adv.confidence > 0.7 && adv.type !== 'hold'
    )
    if (goodAdvice.length > 0) {
      const adviceText = goodAdvice
        .slice(0, 2)
        .map((adv) => {
          const action =
            adv.type === 'buy'
              ? 'stock up on'
              : adv.type === 'sell'
                ? 'sell your'
                : 'avoid buying'
          return `${action} ${adv.potion} - ${adv.reason}`
        })
        .join('. ')

      intelligence.push({
        id: `market_advice_${location}`,
        content: `Trading tip: ${adviceText}.`,
        category: 'market',
        reputationRequirement: 20,
      })
    }

    return intelligence
  }

  /**
   * Analyze price trend for a specific market
   */
  private static analyzePriceTrend(
    market: MarketData,
    currentDay: number
  ): Omit<MarketTrend, 'location' | 'potion'> | undefined {
    const history = market.history || []
    if (history.length < 3) return undefined

    // Get recent price data (last 5 days)
    const recentHistory = history
      .filter((entry) => currentDay - entry.day <= 5)
      .slice(-5)
    if (recentHistory.length < 2) return undefined

    const prices = recentHistory.map((entry) => entry.price)
    const firstPrice = prices[0]!
    const lastPrice = prices.at(-1)!
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100

    // Determine trend
    let trend: 'rising' | 'falling' | 'stable'
    if (Math.abs(priceChange) < 5) {
      trend = 'stable'
    } else if (priceChange > 0) {
      trend = 'rising'
    } else {
      trend = 'falling'
    }

    // Calculate confidence based on consistency of trend
    const priceChanges = []
    for (let i = 1; i < prices.length; i++) {
      priceChanges.push(prices[i]! - prices[i - 1]!)
    }

    const positiveChanges = priceChanges.filter((change) => change > 0).length
    const negativeChanges = priceChanges.filter((change) => change < 0).length
    const consistency =
      Math.max(positiveChanges, negativeChanges) / priceChanges.length

    // Confidence is higher for more consistent trends
    const confidence = Math.min(0.9, consistency * 0.8 + 0.2)

    // Generate timeframe description
    const timeframe =
      trend === 'stable'
        ? 'continuing'
        : Math.abs(priceChange) > 15
          ? 'next few days'
          : 'coming week'

    return {
      trend,
      confidence,
      priceChange: Math.round(priceChange),
      timeframe,
    }
  }

  /**
   * Analyze market opportunity for a specific potion
   */
  private static analyzeMarketOpportunity(
    potion: string,
    market: MarketData,
    playerQuantity: number,
    playerCash: number,
    reputation: number
  ): Omit<MarketAdvice, 'location'> | undefined {
    const { currentPrice } = market
    const { basePrice } = market
    const demand = market.demand || 0.5
    const supply = market.supply || 0.5

    // Calculate price relative to base
    const priceRatio = currentPrice / basePrice

    // Determine advice type
    let type: MarketAdvice['type']
    let reason: string
    let confidence: number
    let expectedProfit: number | undefined

    if (priceRatio < 0.85 && demand > 0.6) {
      // Low price, high demand - good buying opportunity
      type = 'buy'
      reason = 'prices are low and demand is increasing'
      confidence = 0.8
      expectedProfit = Math.round(
        (basePrice - currentPrice) *
          Math.min(10, Math.floor(playerCash / currentPrice))
      )
    } else if (priceRatio > 1.15 && playerQuantity > 0) {
      // High price, player has stock - good selling opportunity
      type = 'sell'
      reason = 'prices are high, good time to sell'
      confidence = 0.9
      expectedProfit = Math.round((currentPrice - basePrice) * playerQuantity)
    } else if (supply < 0.3 && playerQuantity === 0) {
      // Low supply, player doesn't have stock - buy before shortage
      type = 'buy'
      reason = 'supply is running low, prices may rise soon'
      confidence = 0.7
    } else if (supply > 0.8 && demand < 0.4) {
      // High supply, low demand - avoid buying
      type = 'avoid'
      reason = 'market is oversupplied, prices may fall'
      confidence = 0.6
    } else {
      // No clear opportunity
      type = 'hold'
      reason = 'market conditions are neutral'
      confidence = 0.5
    }

    // Adjust confidence based on reputation (better reputation = better info)
    const reputationMultiplier = Math.min(1.2, 1 + reputation / 100)
    confidence = Math.min(0.95, confidence * reputationMultiplier)

    // Only return advice if confidence is reasonable
    if (confidence < 0.4) return undefined

    return {
      type,
      potion,
      reason,
      confidence,
      expectedProfit,
    }
  }

  /**
   * Format market intelligence for display
   */
  static formatMarketTrend(trend: MarketTrend): string {
    const direction =
      trend.trend === 'rising' ? '📈' : trend.trend === 'falling' ? '📉' : '➡️'
    const confidenceText =
      trend.confidence > 0.8
        ? 'Very likely'
        : trend.confidence > 0.6
          ? 'Likely'
          : 'Possibly'

    return `${direction} ${trend.potion} in ${
      trend.location
    }: ${confidenceText} ${Math.abs(trend.priceChange)}% change ${
      trend.timeframe
    }`
  }

  /**
   * Format market advice for display
   */
  static formatMarketAdvice(advice: MarketAdvice): string {
    const action =
      advice.type === 'buy'
        ? '💰 BUY'
        : advice.type === 'sell'
          ? '💸 SELL'
          : advice.type === 'avoid'
            ? '⚠️ AVOID'
            : '⏸️ HOLD'

    const profitText = advice.expectedProfit
      ? ` (potential profit: ${advice.expectedProfit} gold)`
      : ''

    return `${action} ${advice.potion} in ${advice.location}: ${advice.reason}${profitText}`
  }
}
