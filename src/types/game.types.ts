import { type MultiStepEvent } from './events.types.js'
import { type Weather } from './weather.types.js'
import { type ReputationState } from './reputation.types.js'
import { type LocationMarketState, type TradeTransaction } from './economy.types.js'

export type ActionResult = {
  message?: string
  eventResult?: any // We'll type this more strictly later
}

export type NPCInteractionState = {
  npcId: string
  type: 'dialogue' | 'trade' | 'information'
  active: boolean
}

export type AnimationState = {
  type: 'travel' | 'npc_encounter' | 'trade' | 'combat'
  data: any
  active: boolean
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
  // New interaction states
  currentNPCInteraction?: NPCInteractionState
  currentAnimation?: AnimationState
}
export type Location = {
  name: string
  description: string
  dangerLevel: number // 1-10, affects probability of royal guard encounters
}
