export type PriceHistoryEntry = {
  day: number
  price: number
  volume: number // Amount traded that day
  playerTransaction?: boolean // Whether player was involved in this transaction
}

export type MarketTrend = 'rising' | 'falling' | 'stable' | 'volatile'

export type MarketData = {
  basePrice: number // Base price before any modifiers
  currentPrice: number // Current market price
  demand: number // 0-1, affects price multiplier (higher demand = higher prices)
  supply: number // 0-1, affects price multiplier (higher supply = lower prices)
  trend: MarketTrend
  history: PriceHistoryEntry[]
  volatility: number // 0-1, how much prices fluctuate
  lastUpdated: number // Day when market was last updated
}

export type MarketState = Record<string, MarketData> // Keyed by potion type

export type LocationMarketState = Record<string, MarketState> // Keyed by location name

export type SupplyDemandFactor = {
  type: 'event' | 'weather' | 'time' | 'player_action' | 'rival'
  potionType: string
  location?: string // If undefined, affects all locations
  demandChange: number // Positive increases demand, negative decreases
  supplyChange: number // Positive increases supply, negative decreases
  duration: number // Number of days the effect lasts
  startDay: number // When the effect started
}

export type MarketIntelligence = {
  location: string
  potionType: string
  predictedTrend: MarketTrend
  confidence: number // 0-1, how reliable the prediction is
  timeframe: number // Days ahead the prediction covers
  source: 'npc' | 'observation' | 'rumor'
  reputationRequired: number // Minimum reputation to access this intelligence
}

export type TradeTransaction = {
  day: number
  location: string
  potionType: string
  quantity: number
  pricePerUnit: number
  totalValue: number
  type: 'buy' | 'sell'
  npcInvolved?: string // If trade was with an NPC
  reputationChange?: number
}

export type EconomicEvent = {
  id: string
  name: string
  description: string
  effects: SupplyDemandFactor[]
  triggerConditions?: EconomicEventCondition[]
  probability: number
  duration: number
}

export type EconomicEventCondition = {
  type: 'day' | 'weather' | 'location' | 'reputation' | 'market_state'
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  value: number | string
  location?: string
}
