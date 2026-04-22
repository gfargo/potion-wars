import {
  type GameState,
  type NPCInteractionState,
  type AnimationState,
} from '../../types/game.types.js'
import {
  type LocationMarketState,
  type MarketData,
  type TradeTransaction,
} from '../../types/economy.types.js'
import {
  isValidReputationState,
  createDefaultReputationState,
  sanitizeReputationState,
} from './reputationValidation.js'

/**
 * Validates that a market data object has the correct structure
 */
export const isValidMarketData = (data: any): data is MarketData => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  // Check required number fields
  const numberFields = ['basePrice', 'currentPrice', 'demand', 'supply']
  for (const field of numberFields) {
    if (typeof data[field] !== 'number' || data[field] < 0) {
      return false
    }
  }

  // Check trend field
  if (!['rising', 'falling', 'stable'].includes(data.trend)) {
    return false
  }

  // Check history array
  if (!Array.isArray(data.history)) {
    return false
  }

  // Validate history entries
  for (const entry of data.history) {
    if (typeof entry !== 'object' || entry === null) {
      return false
    }

    if (
      typeof entry.day !== 'number' ||
      typeof entry.price !== 'number' ||
      typeof entry.volume !== 'number'
    ) {
      return false
    }
  }

  return true
}

/**
 * Validates that a location market state has the correct structure
 */
export const isValidLocationMarketState = (
  data: any
): data is LocationMarketState => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  // Each location should have potion types as keys and MarketData as values
  for (const [location, locationData] of Object.entries(data)) {
    if (typeof location !== 'string') {
      return false
    }

    if (typeof locationData !== 'object' || locationData === null) {
      return false
    }

    for (const [potionType, marketData] of Object.entries(
      locationData as Record<string, any>
    )) {
      if (typeof potionType !== 'string') {
        return false
      }

      if (!isValidMarketData(marketData)) {
        return false
      }
    }
  }

  return true
}

/**
 * Validates that a trade transaction has the correct structure
 */
export const isValidTradeTransaction = (
  data: any
): data is TradeTransaction => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  // Check required fields
  const requiredFields = {
    day: 'number',
    location: 'string',
    potionType: 'string',
    quantity: 'number',
    pricePerUnit: 'number',
    totalValue: 'number',
  }

  for (const [field, expectedType] of Object.entries(requiredFields)) {
    if (typeof data[field] !== expectedType) {
      return false
    }
  }

  // Check type field
  if (!['buy', 'sell'].includes(data.type)) {
    return false
  }

  // Validate numeric constraints
  if (
    data.day < 0 ||
    data.quantity <= 0 ||
    data.pricePerUnit <= 0 ||
    data.totalValue <= 0
  ) {
    return false
  }

  return true
}

/**
 * Validates that an NPC interaction state has the correct structure
 */
export const isValidNPCInteractionState = (
  data: any
): data is NPCInteractionState => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  return (
    typeof data.npcId === 'string' &&
    ['dialogue', 'trade', 'information'].includes(data.type) &&
    typeof data.active === 'boolean'
  )
}

/**
 * Validates that an animation state has the correct structure
 */
export const isValidAnimationState = (data: any): data is AnimationState => {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  return (
    ['travel', 'npc_encounter', 'trade', 'combat'].includes(data.type) &&
    typeof data.active === 'boolean'
    // Data field can be any type, so we don't validate it strictly
  )
}

/**
 * Validates that a complete game state has the correct structure
 */
export const isValidGameState = (state: any): state is GameState => {
  if (typeof state !== 'object' || state === null) {
    return false
  }

  // Check basic game state fields
  const basicFields = {
    day: 'number',
    cash: 'number',
    debt: 'number',
    health: 'number',
    strength: 'number',
    agility: 'number',
    intelligence: 'number',
    weather: 'string',
  }

  for (const [field, expectedType] of Object.entries(basicFields)) {
    if (typeof state[field] !== expectedType) {
      return false
    }
  }

  // Check location object
  if (
    typeof state.location !== 'object' ||
    state.location === null ||
    typeof state.location.name !== 'string' ||
    typeof state.location.description !== 'string' ||
    typeof state.location.dangerLevel !== 'number'
  ) {
    return false
  }

  // Check inventory and prices objects
  if (
    typeof state.inventory !== 'object' ||
    state.inventory === null ||
    typeof state.prices !== 'object' ||
    state.prices === null
  ) {
    return false
  }

  // Validate inventory values are numbers
  for (const [item, quantity] of Object.entries(state.inventory)) {
    if (
      typeof item !== 'string' ||
      typeof quantity !== 'number' ||
      quantity < 0
    ) {
      return false
    }
  }

  // Validate price values are numbers
  for (const [item, price] of Object.entries(state.prices)) {
    if (typeof item !== 'string' || typeof price !== 'number' || price < 0) {
      return false
    }
  }

  // Validate reputation state (required)
  if (!isValidReputationState(state.reputation)) {
    return false
  }

  // Validate market data (required)
  if (!isValidLocationMarketState(state.marketData)) {
    return false
  }

  // Validate trade history (required)
  if (!Array.isArray(state.tradeHistory)) {
    return false
  }

  for (const transaction of state.tradeHistory) {
    if (!isValidTradeTransaction(transaction)) {
      return false
    }
  }

  // Validate optional NPC interaction state
  if (
    state.currentNPCInteraction !== undefined &&
    !isValidNPCInteractionState(state.currentNPCInteraction)
  ) {
    return false
  }

  // Validate optional animation state
  if (
    state.currentAnimation !== undefined &&
    !isValidAnimationState(state.currentAnimation)
  ) {
    return false
  }

  // Validate optional event fields
  if (
    state.currentEvent !== undefined && // Basic event validation - could be expanded
    (typeof state.currentEvent !== 'object' || state.currentEvent === null)
  ) {
    return false
  }

  if (
    state.currentStep !== undefined &&
    typeof state.currentStep !== 'number'
  ) {
    return false
  }

  return true
}

/**
 * Creates default market data for a potion type
 */
export const createDefaultMarketData = (basePrice: number): MarketData => ({
  basePrice,
  currentPrice: basePrice,
  demand: 0.5,
  supply: 0.5,
  trend: 'stable',
  history: [],
  volatility: 0.3,
  lastUpdated: 0,
})

/**
 * Creates default location market state
 */
export const createDefaultLocationMarketState = (): LocationMarketState => ({})

/**
 * Sanitizes market data to ensure values are within reasonable bounds
 */
export const sanitizeMarketData = (data: MarketData): MarketData => ({
  basePrice: Math.max(1, data.basePrice),
  currentPrice: Math.max(1, data.currentPrice),
  demand: Math.max(0, Math.min(1, data.demand)),
  supply: Math.max(0, Math.min(1, data.supply)),
  trend: ['rising', 'falling', 'stable', 'volatile'].includes(data.trend)
    ? data.trend
    : 'stable',
  history: data.history.slice(-100), // Keep only last 100 entries
  volatility: Math.max(0, Math.min(1, data.volatility || 0.3)),
  lastUpdated: data.lastUpdated || 0,
})

/**
 * Sanitizes location market state
 */
export const sanitizeLocationMarketState = (
  data: LocationMarketState
): LocationMarketState => {
  const sanitized: LocationMarketState = {}

  for (const [location, locationData] of Object.entries(data)) {
    sanitized[location] = {}
    for (const [potionType, marketData] of Object.entries(locationData)) {
      sanitized[location][potionType] = sanitizeMarketData(marketData)
    }
  }

  return sanitized
}

/**
 * Sanitizes trade history to remove invalid entries and limit size
 */
export const sanitizeTradeHistory = (
  history: TradeTransaction[]
): TradeTransaction[] => {
  return history
    .filter(isValidTradeTransaction)
    .slice(-1000) // Keep only last 1000 transactions
    .map((transaction) => ({
      ...transaction,
      day: Math.max(0, transaction.day),
      quantity: Math.max(1, transaction.quantity),
      pricePerUnit: Math.max(1, transaction.pricePerUnit),
      totalValue: Math.max(1, transaction.totalValue),
    }))
}

/**
 * Migrates legacy save files to include all new data structures
 */
export const migrateLegacySaveFile = (state: any): GameState => {
  // Create default reputation state if missing or invalid
  state.reputation =
    !state.reputation || !isValidReputationState(state.reputation)
      ? createDefaultReputationState()
      : sanitizeReputationState(state.reputation)

  // Create default market data if missing
  state.marketData =
    !state.marketData || !isValidLocationMarketState(state.marketData)
      ? createDefaultLocationMarketState()
      : sanitizeLocationMarketState(state.marketData)

  // Create default trade history if missing
  state.tradeHistory =
    !state.tradeHistory || !Array.isArray(state.tradeHistory)
      ? []
      : sanitizeTradeHistory(state.tradeHistory)

  // Migrate: legacy saves don't carry a seenTutorials list.
  state.seenTutorials =
    Array.isArray(state.seenTutorials)
      ? state.seenTutorials.filter((id: unknown) => typeof id === 'string')
      : []

  // Remove invalid optional states
  if (
    state.currentNPCInteraction &&
    !isValidNPCInteractionState(state.currentNPCInteraction)
  ) {
    delete state.currentNPCInteraction
  }

  if (
    state.currentAnimation &&
    !isValidAnimationState(state.currentAnimation)
  ) {
    delete state.currentAnimation
  }

  return state as GameState
}

/**
 * Sanitizes a complete game state
 */
export const sanitizeGameState = (state: GameState): GameState => {
  return {
    ...state,
    // Ensure numeric values are within reasonable bounds
    day: Math.max(0, state.day),
    cash: Math.max(0, state.cash),
    debt: Math.max(0, state.debt),
    health: Math.max(0, Math.min(100, state.health)),
    strength: Math.max(1, Math.min(20, state.strength)),
    agility: Math.max(1, Math.min(20, state.agility)),
    intelligence: Math.max(1, Math.min(20, state.intelligence)),

    // Sanitize inventory (remove negative quantities)
    inventory: Object.fromEntries(
      Object.entries(state.inventory).filter(([, quantity]) => quantity > 0)
    ),

    // Sanitize prices (ensure positive values)
    prices: Object.fromEntries(
      Object.entries(state.prices).map(([item, price]) => [
        item,
        Math.max(1, price),
      ])
    ),

    // Sanitize complex data structures
    reputation: sanitizeReputationState(state.reputation),
    marketData: sanitizeLocationMarketState(state.marketData),
    tradeHistory: sanitizeTradeHistory(state.tradeHistory),

    // IMPORTANT: Clear transient state that contains functions (cannot be serialized)
    // Events will be re-triggered naturally through gameplay
    currentEvent: undefined,
    currentStep: undefined,
    isShowingEventOutcome: undefined,
    currentNPCInteraction: undefined,
    currentAnimation: undefined,
  }
}
