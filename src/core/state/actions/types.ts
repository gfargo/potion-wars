import { type MultiStepEvent } from '../../../types/events.types.js'
import { type Weather } from '../../../types/weather.types.js'
import { type ReputationChange } from '../../../types/reputation.types.js'
import { type LocationMarketState, type SupplyDemandFactor } from '../../../types/economy.types.js'

// Game Actions
export const BREW_POTION = 'game/brewPotion'
export const SELL_POTION = 'game/sellPotion'
export const TRAVEL = 'game/travel'
export const REPAY_DEBT = 'game/repayDebt'
export const ADVANCE_DAY = 'game/advanceDay'
export const UPDATE_WEATHER = 'game/updateWeather'
export const TRIGGER_EVENT = 'game/triggerEvent'
export const HANDLE_EVENT_CHOICE = 'game/handleEventChoice'

// Reputation Actions
export const UPDATE_REPUTATION = 'reputation/updateReputation'
export const RESET_REPUTATION = 'reputation/resetReputation'

// Market Actions
export const UPDATE_MARKET_DATA = 'market/updateMarketData'
export const RECORD_TRANSACTION = 'market/recordTransaction'
export const UPDATE_DAILY_MARKETS = 'market/updateDailyMarkets'
export const APPLY_SUPPLY_DEMAND_FACTORS = 'market/applySupplyDemandFactors'

// Save/Load Actions
export const INITIALIZE_GAME = 'save/initializeGame'
export const SAVE_GAME = 'save/saveGame'
export const LOAD_GAME = 'save/loadGame'

// Action Interfaces
export type BrewPotionAction = {
  type: typeof BREW_POTION
  payload: {
    potionName: string
    quantity: number
  }
}

export type SellPotionAction = {
  type: typeof SELL_POTION
  payload: {
    potionName: string
    quantity: number
  }
}

export type TravelAction = {
  type: typeof TRAVEL
  payload: {
    location: string
  }
}

export type RepayDebtAction = {
  type: typeof REPAY_DEBT
  payload: {
    amount: number
  }
}

export type AdvanceDayAction = {
  type: typeof ADVANCE_DAY
  payload: {
    triggerEvent: boolean
    triggerDebt: boolean
  }
}

export type UpdateWeatherAction = {
  type: typeof UPDATE_WEATHER
  payload: {
    weather: Weather
  }
}

export type TriggerEventAction = {
  type: typeof TRIGGER_EVENT
  payload: {
    event: MultiStepEvent
  }
}

export type HandleEventChoiceAction = {
  type: typeof HANDLE_EVENT_CHOICE
  payload: {
    choiceIndex: number
  }
}

export type InitializeGameAction = {
  type: typeof INITIALIZE_GAME
}

export type SaveGameAction = {
  type: typeof SAVE_GAME
  payload: {
    slot: number
  }
}

export type LoadGameAction = {
  type: typeof LOAD_GAME
  payload: {
    slot: number
  }
}

export type UpdateReputationAction = {
  type: typeof UPDATE_REPUTATION
  payload: ReputationChange
}

export type ResetReputationAction = {
  type: typeof RESET_REPUTATION
}

export type UpdateMarketDataAction = {
  type: typeof UPDATE_MARKET_DATA
  payload: {
    marketData: LocationMarketState
  }
}

export type RecordTransactionAction = {
  type: typeof RECORD_TRANSACTION
  payload: {
    location: string
    potionType: string
    quantity: number
    pricePerUnit: number
    day: number
  }
}

export type UpdateDailyMarketsAction = {
  type: typeof UPDATE_DAILY_MARKETS
}

export type ApplySupplyDemandFactorsAction = {
  type: typeof APPLY_SUPPLY_DEMAND_FACTORS
  payload: {
    factors: SupplyDemandFactor[]
  }
}

// Union type of all actions
export type GameAction =
  | BrewPotionAction
  | SellPotionAction
  | TravelAction
  | RepayDebtAction
  | AdvanceDayAction
  | UpdateWeatherAction
  | TriggerEventAction
  | HandleEventChoiceAction
  | InitializeGameAction
  | SaveGameAction
  | LoadGameAction
  | UpdateReputationAction
  | ResetReputationAction
  | UpdateMarketDataAction
  | RecordTransactionAction
  | UpdateDailyMarketsAction
  | ApplySupplyDemandFactorsAction
