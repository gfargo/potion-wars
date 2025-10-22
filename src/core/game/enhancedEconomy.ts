import { potions } from '../../constants.js'
import { type GameState } from '../../types/game.types.js'
import { type MarketData, type MarketState, type LocationMarketState, type PriceHistoryEntry, type MarketTrend, type SupplyDemandFactor } from '../../types/economy.types.js'

export class EnhancedEconomyManager {
  /**
   * Initialize market data for all locations and potions
   */
  static initializeMarketData(): LocationMarketState {
    const locations = ["Alchemist's Quarter", 'Royal Castle', "Merchant's District", 'Enchanted Forest', 'Peasant Village']
    const marketData: LocationMarketState = {}

    for (const location of locations) {
      marketData[location] = this.initializeLocationMarket()
    }

    return marketData
  }

  /**
   * Initialize market data for a single location
   */
  static initializeLocationMarket(): MarketState {
    const market: MarketState = {}

    for (const potion of potions) {
      market[potion.name] = this.createInitialMarketData(potion.minPrice, potion.maxPrice)
    }

    return market
  }

  /**
   * Create initial market data for a potion
   */
  static createInitialMarketData(minPrice: number, maxPrice: number): MarketData {
    const basePrice = Math.floor((minPrice + maxPrice) / 2)
    const currentPrice = Math.floor(Math.random() * (maxPrice - minPrice + 1) + minPrice)
    
    return {
      basePrice,
      currentPrice,
      demand: 0.5 + (Math.random() - 0.5) * 0.3, // 0.35 to 0.65
      supply: 0.5 + (Math.random() - 0.5) * 0.3, // 0.35 to 0.65
      trend: 'stable',
      history: [{
        day: 1,
        price: currentPrice,
        volume: 0,
        playerTransaction: false
      }],
      volatility: 0.1 + Math.random() * 0.2, // 0.1 to 0.3
      lastUpdated: 1
    }
  }

  /**
   * Record a transaction in the market data
   */
  static recordTransaction(
    marketData: MarketData, 
    quantity: number, 
    day: number, 
    isPlayerTransaction = false
  ): MarketData {
    const newHistory = [...marketData.history]
    
    // Find existing entry for this day or create new one
    const existingEntryIndex = newHistory.findIndex(entry => entry.day === day)
    
    if (existingEntryIndex >= 0) {
      // Update existing entry
      const existingEntry = newHistory[existingEntryIndex]
      if (existingEntry) {
        newHistory[existingEntryIndex] = {
          ...existingEntry,
          volume: existingEntry.volume + Math.abs(quantity),
          playerTransaction: existingEntry.playerTransaction || isPlayerTransaction
        }
      }
    } else {
      // Create new entry
      newHistory.push({
        day,
        price: marketData.currentPrice,
        volume: Math.abs(quantity),
        playerTransaction: isPlayerTransaction
      })
    }

    // Keep only last 30 days of history
    const recentHistory = newHistory
      .filter(entry => day - entry.day <= 30)
      .sort((a, b) => a.day - b.day)

    // Update supply and demand based on transaction
    const demandChange = quantity > 0 ? 0.02 : -0.01 // Buying increases demand, selling decreases it
    const supplyChange = quantity > 0 ? -0.01 : 0.02 // Buying decreases supply, selling increases it
    
    const newDemand = Math.max(0.1, Math.min(0.9, marketData.demand + demandChange))
    const newSupply = Math.max(0.1, Math.min(0.9, marketData.supply + supplyChange))

    return {
      ...marketData,
      demand: newDemand,
      supply: newSupply,
      history: recentHistory,
      lastUpdated: day
    }
  }

  /**
   * Calculate dynamic price based on supply, demand, and other factors
   */
  static calculateDynamicPrice(
    marketData: MarketData, 
    reputationModifier = 1.0
  ): number {
    // Base price calculation using supply and demand
    const supplyDemandMultiplier = (marketData.demand / marketData.supply)
    
    // Add some volatility
    const volatilityFactor = 1 + (Math.random() - 0.5) * marketData.volatility
    
    // Calculate new price
    let newPrice = marketData.basePrice * supplyDemandMultiplier * volatilityFactor * reputationModifier
    
    // Ensure price doesn't go too extreme
    const minPrice = marketData.basePrice * 0.3
    const maxPrice = marketData.basePrice * 2.5
    newPrice = Math.max(minPrice, Math.min(maxPrice, newPrice))
    
    return Math.floor(newPrice)
  }

  /**
   * Update market dynamics for all locations
   */
  static updateMarketDynamics(state: GameState): GameState {
    const updatedMarketData: LocationMarketState = {}

    for (const [location, locationMarket] of Object.entries(state.marketData)) {
      updatedMarketData[location] = {}
      
      for (const [potionType, marketData] of Object.entries(locationMarket)) {
        // Skip if already updated today
        if (marketData.lastUpdated >= state.day) {
          updatedMarketData[location][potionType] = marketData
          continue
        }

        // Calculate new price
        const newPrice = this.calculateDynamicPrice(marketData, 1.0)
        
        // Determine trend based on price history
        const trend = this.calculateMarketTrend(marketData.history, newPrice)
        
        // Natural supply/demand drift towards equilibrium
        const demandDrift = (0.5 - marketData.demand) * 0.05
        const supplyDrift = (0.5 - marketData.supply) * 0.05
        
        updatedMarketData[location][potionType] = {
          ...marketData,
          currentPrice: newPrice,
          demand: Math.max(0.1, Math.min(0.9, marketData.demand + demandDrift)),
          supply: Math.max(0.1, Math.min(0.9, marketData.supply + supplyDrift)),
          trend,
          lastUpdated: state.day
        }
      }
    }

    return {
      ...state,
      marketData: updatedMarketData
    }
  }

  /**
   * Calculate market trend based on price history
   */
  static calculateMarketTrend(history: PriceHistoryEntry[], currentPrice: number): MarketTrend {
    if (history.length < 3) return 'stable'

    const recentPrices = history.slice(-5).map(entry => entry.price)
    recentPrices.push(currentPrice)

    // Calculate average change over recent periods
    let totalChange = 0
    let changeCount = 0

    for (let i = 1; i < recentPrices.length; i++) {
      const currentPriceValue = recentPrices[i]
      const previousPriceValue = recentPrices[i - 1]
      if (currentPriceValue !== undefined && previousPriceValue !== undefined) {
        totalChange += currentPriceValue - previousPriceValue
        changeCount++
      }
    }

    if (changeCount === 0) return 'stable'

    const averageChange = totalChange / changeCount
    const firstPrice = recentPrices[0]
    if (firstPrice === undefined || firstPrice === 0) return 'stable'
    
    const changePercentage = averageChange / firstPrice

    // Calculate volatility
    const changes = []
    for (let i = 1; i < recentPrices.length; i++) {
      const currentPriceValue = recentPrices[i]
      const previousPriceValue = recentPrices[i - 1]
      if (currentPriceValue !== undefined && previousPriceValue !== undefined) {
        changes.push(Math.abs(currentPriceValue - previousPriceValue))
      }
    }
    
    if (changes.length === 0) return 'stable'
    
    const avgVolatility = changes.reduce((sum, change) => sum + change, 0) / changes.length
    const volatilityThreshold = firstPrice * 0.15

    if (avgVolatility > volatilityThreshold) {
      return 'volatile'
    } else if (changePercentage > 0.05) {
      return 'rising'
    } else if (changePercentage < -0.05) {
      return 'falling'
    } else {
      return 'stable'
    }
  }

  /**
   * Apply supply and demand factors (from events, weather, etc.)
   */
  static applySupplyDemandFactors(
    state: GameState, 
    factors: SupplyDemandFactor[]
  ): GameState {
    const updatedMarketData: LocationMarketState = { ...state.marketData }

    for (const factor of factors) {
      // Check if factor is still active
      if (state.day > factor.startDay + factor.duration) {
        continue
      }

      const locations = factor.location ? [factor.location] : Object.keys(updatedMarketData)

      for (const location of locations) {
        if (!updatedMarketData[location] || !updatedMarketData[location][factor.potionType]) {
          continue
        }

        const currentMarket = updatedMarketData[location][factor.potionType]
        if (!currentMarket) continue
        
        const demandChange = factor.demandChange * 0.1 // Scale down the impact
        const supplyChange = factor.supplyChange * 0.1

        updatedMarketData[location][factor.potionType] = {
          ...currentMarket,
          demand: Math.max(0.1, Math.min(0.9, currentMarket.demand + demandChange)),
          supply: Math.max(0.1, Math.min(0.9, currentMarket.supply + supplyChange))
        }
      }
    }

    return {
      ...state,
      marketData: updatedMarketData
    }
  }

  /**
   * Get market trends for a location
   */
  static getMarketTrends(markets: MarketState): Array<{
    potionType: string
    trend: MarketTrend
    priceChange: number
    confidence: number
  }> {
    const trends = []

    for (const [potionType, marketData] of Object.entries(markets)) {
      const history = marketData.history
      let priceChange = 0
      
      if (history.length >= 2) {
        const oldPriceEntry = history[history.length - 2]
        if (oldPriceEntry) {
          const oldPrice = oldPriceEntry.price
          priceChange = ((marketData.currentPrice - oldPrice) / oldPrice) * 100
        }
      }

      trends.push({
        potionType,
        trend: marketData.trend,
        priceChange,
        confidence: Math.max(0.3, Math.min(1.0, history.length / 10)) // More history = higher confidence
      })
    }

    return trends
  }
}