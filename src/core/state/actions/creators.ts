import { type MultiStepEvent } from '../../../types/events.types.js'
import { type Weather } from '../../../types/weather.types.js'
import { type ReputationChange } from '../../../types/reputation.types.js'
import { type LocationMarketState, type SupplyDemandFactor } from '../../../types/economy.types.js'
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
    UPDATE_REPUTATION,
    type UpdateReputationAction,
    RESET_REPUTATION,
    type ResetReputationAction,
    UPDATE_MARKET_DATA,
    type UpdateMarketDataAction,
    RECORD_TRANSACTION,
    type RecordTransactionAction,
    UPDATE_DAILY_MARKETS,
    type UpdateDailyMarketsAction,
    APPLY_SUPPLY_DEMAND_FACTORS,
    type ApplySupplyDemandFactorsAction,
    START_NPC_INTERACTION,
    type StartNPCInteractionAction,
    END_NPC_INTERACTION,
    type EndNPCInteractionAction,
    PROCESS_NPC_DIALOGUE,
    type ProcessNPCDialogueAction,
    TRIGGER_ANIMATION,
    type TriggerAnimationAction,
    COMPLETE_ANIMATION,
    type CompleteAnimationAction
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

export const updateReputation = (change: ReputationChange): UpdateReputationAction => ({
  type: UPDATE_REPUTATION,
  payload: change,
})

export const resetReputation = (): ResetReputationAction => ({
  type: RESET_REPUTATION,
})

export const updateMarketData = (marketData: LocationMarketState): UpdateMarketDataAction => ({
  type: UPDATE_MARKET_DATA,
  payload: {
    marketData,
  },
})

export const recordTransaction = (
  location: string,
  potionType: string,
  quantity: number,
  pricePerUnit: number,
  day: number
): RecordTransactionAction => ({
  type: RECORD_TRANSACTION,
  payload: {
    location,
    potionType,
    quantity,
    pricePerUnit,
    day,
  },
})

export const updateDailyMarkets = (): UpdateDailyMarketsAction => ({
  type: UPDATE_DAILY_MARKETS,
})

export const applySupplyDemandFactors = (factors: SupplyDemandFactor[]): ApplySupplyDemandFactorsAction => ({
  type: APPLY_SUPPLY_DEMAND_FACTORS,
  payload: {
    factors,
  },
})

export const startNPCInteraction = (
  npcId: string,
  interactionType: 'dialogue' | 'trade' | 'information'
): StartNPCInteractionAction => ({
  type: START_NPC_INTERACTION,
  payload: {
    npcId,
    interactionType,
  },
})

export const endNPCInteraction = (npcId: string): EndNPCInteractionAction => ({
  type: END_NPC_INTERACTION,
  payload: {
    npcId,
  },
})

export const processNPCDialogue = (
  npcId: string,
  choiceIndex: number,
  dialogueData: any
): ProcessNPCDialogueAction => ({
  type: PROCESS_NPC_DIALOGUE,
  payload: {
    npcId,
    choiceIndex,
    dialogueData,
  },
})

export const triggerAnimation = (
  animationType: 'travel' | 'npc_encounter' | 'trade' | 'combat',
  animationData: any
): TriggerAnimationAction => ({
  type: TRIGGER_ANIMATION,
  payload: {
    animationType,
    animationData,
  },
})

export const completeAnimation = (animationType: string): CompleteAnimationAction => ({
  type: COMPLETE_ANIMATION,
  payload: {
    animationType,
  },
})
