import { type MultiStepEvent } from '../../../types/events.types.js'
import { type Weather } from '../../../types/weather.types.js'
import {
  ADVANCE_DAY,
  type AdvanceDayAction,
  BREW_POTION,
  type BrewPotionAction,
  HANDLE_EVENT_CHOICE,
  type HandleEventChoiceAction,
  INITIALIZE_GAME,
  type InitializeGameAction,
  LOAD_GAME,
  type LoadGameAction,
  REPAY_DEBT,
  type RepayDebtAction,
  SAVE_GAME,
  type SaveGameAction,
  SELL_POTION,
  type SellPotionAction,
  TRAVEL,
  type TravelAction,
  TRIGGER_EVENT,
  type TriggerEventAction,
  UPDATE_WEATHER,
  type UpdateWeatherAction,
} from './types.js'

export const brewPotion = (
  potionName: string,
  quantity: number
): BrewPotionAction => ({
  type: BREW_POTION,
  payload: {
    potionName,
    quantity,
  },
})

export const sellPotion = (
  potionName: string,
  quantity: number
): SellPotionAction => ({
  type: SELL_POTION,
  payload: {
    potionName,
    quantity,
  },
})

export const travel = (location: string): TravelAction => ({
  type: TRAVEL,
  payload: {
    location,
  },
})

export const repayDebt = (amount: number): RepayDebtAction => ({
  type: REPAY_DEBT,
  payload: {
    amount,
  },
})

export const advanceDay = (
  triggerEvent = false,
  triggerDebt = false
): AdvanceDayAction => ({
  type: ADVANCE_DAY,
  payload: {
    triggerEvent,
    triggerDebt,
  },
})

export const updateWeather = (weather: Weather): UpdateWeatherAction => ({
  type: UPDATE_WEATHER,
  payload: {
    weather,
  },
})

export const triggerEvent = (event: MultiStepEvent): TriggerEventAction => ({
  type: TRIGGER_EVENT,
  payload: {
    event,
  },
})

export const handleEventChoice = (
  choiceIndex: number
): HandleEventChoiceAction => ({
  type: HANDLE_EVENT_CHOICE,
  payload: {
    choiceIndex,
  },
})

export const initializeGame = (): InitializeGameAction => ({
  type: INITIALIZE_GAME,
})

export const saveGame = (slot: number): SaveGameAction => ({
  type: SAVE_GAME,
  payload: {
    slot,
  },
})

export const loadGame = (slot: number): LoadGameAction => ({
  type: LOAD_GAME,
  payload: {
    slot,
  },
})
