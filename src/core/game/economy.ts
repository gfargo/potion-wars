import { potions } from '../../constants.js'
import { type GameState } from '../../types/game.types.js'
import { ReputationManager } from '../reputation/ReputationManager.js'
import { EnhancedEconomyManager } from './enhancedEconomy.js'

export function generatePrices(): Record<string, number> {
  const prices: Record<string, number> = {}

  for (const potion of potions) {
    prices[potion.name] = Math.floor(
      Math.random() * (potion.maxPrice - potion.minPrice + 1) + potion.minPrice
    )
  }

  return prices
}

/**
 * Generate dynamic prices based on market data and reputation
 * This replaces the simple generatePrices function for enhanced gameplay
 */
export function generateDynamicPrices(
  state: GameState
): Record<string, number> {
  const prices: Record<string, number> = {}
  const currentLocation = state.location.name
  const locationMarket = state.marketData[currentLocation]

  if (!locationMarket) {
    // Fallback to simple price generation if market data is not available
    return generatePrices()
  }

  // Get reputation modifier for current location
  const locationReputation = ReputationManager.getLocationReputation(
    state.reputation,
    currentLocation
  )
  const reputationModifier =
    ReputationManager.calculatePriceModifier(locationReputation)

  for (const potion of potions) {
    const marketData = locationMarket[potion.name]

    if (marketData) {
      // Use enhanced economy for dynamic pricing
      const dynamicPrice = EnhancedEconomyManager.calculateDynamicPrice(
        marketData,
        reputationModifier
      )
      prices[potion.name] = dynamicPrice
    } else {
      // Fallback to simple pricing with reputation modifier
      const basePrice = Math.floor(
        Math.random() * (potion.maxPrice - potion.minPrice + 1) +
          potion.minPrice
      )
      prices[potion.name] = Math.floor(basePrice * reputationModifier)
    }
  }

  return prices
}

export function repayDebt(
  state: GameState,
  amount: number
): [GameState, string] {
  if (amount > state.cash) {
    return [state, "You don't have enough gold to repay that much!"]
  }

  if (amount > state.debt) {
    return [state, "You're trying to repay more than you owe!"]
  }

  const newState = {
    ...state,
    cash: state.cash - amount,
    debt: state.debt - amount,
  }

  return [newState, `Repaid ${amount} gold of debt.`]
}

/**
 * Process a potion purchase and update market data
 */
export function processPurchase(
  state: GameState,
  potionName: string,
  quantity: number,
  pricePerUnit: number
): GameState {
  const currentLocation = state.location.name
  const totalCost = quantity * pricePerUnit

  // Update inventory and cash
  const newInventory = { ...state.inventory }
  newInventory[potionName] = (newInventory[potionName] || 0) + quantity

  const newState = {
    ...state,
    inventory: newInventory,
    cash: state.cash - totalCost,
  }

  // Record transaction in market data
  const locationMarket = newState.marketData[currentLocation]
  if (locationMarket?.[potionName]) {
    const updatedMarketData = EnhancedEconomyManager.recordTransaction(
      locationMarket[potionName],
      quantity, // Positive for purchases
      state.day,
      true // Player transaction
    )

    newState.marketData = {
      ...newState.marketData,
      [currentLocation]: {
        ...locationMarket,
        [potionName]: updatedMarketData,
      },
    }
  }

  // Add to trade history
  const tradeRecord = {
    day: state.day,
    location: currentLocation,
    potionType: potionName,
    quantity,
    pricePerUnit,
    totalValue: totalCost,
    type: 'buy' as const,
  }

  newState.tradeHistory = [...state.tradeHistory, tradeRecord]

  return newState
}

/**
 * Process a potion sale and update market data
 */
export function processSale(
  state: GameState,
  potionName: string,
  quantity: number,
  pricePerUnit: number
): GameState {
  const currentLocation = state.location.name
  const totalRevenue = quantity * pricePerUnit

  // Update inventory and cash
  const newInventory = { ...state.inventory }
  newInventory[potionName] = (newInventory[potionName] || 0) - quantity

  const newState = {
    ...state,
    inventory: newInventory,
    cash: state.cash + totalRevenue,
  }

  // Record transaction in market data
  const locationMarket = newState.marketData[currentLocation]
  if (locationMarket?.[potionName]) {
    const updatedMarketData = EnhancedEconomyManager.recordTransaction(
      locationMarket[potionName],
      -quantity, // Negative for sales
      state.day,
      true // Player transaction
    )

    newState.marketData = {
      ...newState.marketData,
      [currentLocation]: {
        ...locationMarket,
        [potionName]: updatedMarketData,
      },
    }
  }

  // Add to trade history
  const tradeRecord = {
    day: state.day,
    location: currentLocation,
    potionType: potionName,
    quantity,
    pricePerUnit,
    totalValue: totalRevenue,
    type: 'sell' as const,
  }

  newState.tradeHistory = [...state.tradeHistory, tradeRecord]

  return newState
}

/**
 * Update market dynamics for the current day
 * Should be called at the start of each day
 */
export function updateDailyMarkets(state: GameState): GameState {
  return EnhancedEconomyManager.updateMarketDynamics(state)
}

/**
 * Get current market trends for a location
 */
export function getLocationMarketTrends(state: GameState, location?: string) {
  const targetLocation = location || state.location.name
  const locationMarket = state.marketData[targetLocation]

  if (!locationMarket) {
    return []
  }

  return EnhancedEconomyManager.getMarketTrends(locationMarket)
}

/**
 * Initialize market data for a new game
 */
export function initializeGameMarkets(): {
  marketData: any
  tradeHistory: any[]
} {
  return {
    marketData: EnhancedEconomyManager.initializeMarketData(),
    tradeHistory: [],
  }
}
