import { type MultiStepEvent } from '../../../types/events.types.js'
import { type Weather } from '../../../types/weather.types.js'

// Game Actions
export const BREW_POTION = 'game/brewPotion'
export const SELL_POTION = 'game/sellPotion'
export const TRAVEL = 'game/travel'
export const REPAY_DEBT = 'game/repayDebt'
export const ADVANCE_DAY = 'game/advanceDay'
export const UPDATE_WEATHER = 'game/updateWeather'
export const TRIGGER_EVENT = 'game/triggerEvent'
export const HANDLE_EVENT_CHOICE = 'game/handleEventChoice'

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
