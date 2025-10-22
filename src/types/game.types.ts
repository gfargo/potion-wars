import { type MultiStepEvent } from './events.types.js'
import { type Weather } from './weather.types.js'
import { type ReputationState } from './reputation.types.js'
import { type LocationMarketState, type TradeTransaction } from './economy.types.js'

export type ActionResult = {
  message?: string
  eventResult?: any // We'll type this more strictly later
}

export type GameState = {
  day: number
  cash: number
  debt: number
  health: number
  strength: number
  agility: number
  intelligence: number
  location: Location
  inventory: Record<string, number>
  prices: Record<string, number>
  weather: Weather
  currentEvent?: MultiStepEvent
  currentStep?: number
  lastSave?: string
  playerName?: string
  _result?: ActionResult
  // New features
  reputation: ReputationState
  marketData: LocationMarketState
  tradeHistory: TradeTransaction[]
}
export type Location = {
  name: string
  description: string
  dangerLevel: number // 1-10, affects probability of royal guard encounters
}
