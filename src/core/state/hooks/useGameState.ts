import { useCallback, useReducer } from 'react'
import { type GameState } from '../../../types/game.types.js'
import {
  loadGame as loadPersistedGame,
  saveGame as persistGame,
} from '../../persistence/saveLoad.js'
import * as actions from '../actions/creators.js'
import { gameReducer } from '../reducers/gameReducer.js'
import * as selectors from '../selectors/gameSelectors.js'

export const useGameState = (initialState: GameState) => {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  // Game Actions
  const brewPotion = useCallback((potionName: string, quantity: number) => {
    dispatch(actions.brewPotion(potionName, quantity))
  }, [])

  const sellPotion = useCallback((potionName: string, quantity: number) => {
    dispatch(actions.sellPotion(potionName, quantity))
  }, [])

  const travel = useCallback((location: string) => {
    dispatch(actions.travel(location))
  }, [])

  const repayDebt = useCallback((amount: number) => {
    dispatch(actions.repayDebt(amount))
  }, [])

  const advanceDay = useCallback(
    (triggerEvent?: boolean, triggerDebt?: boolean) => {
      const action = actions.advanceDay(triggerEvent, triggerDebt)
      const result = gameReducer(state, action)
      dispatch(action)
      return result._result ?? { message: undefined, eventResult: undefined }
    },
    [state]
  )

  const handleEventChoice = useCallback((choiceIndex: number) => {
    dispatch(actions.handleEventChoice(choiceIndex))
  }, [])

  // Save/Load Actions
  const saveGame = useCallback(
    (slot: number) => {
      persistGame(state, slot)
      dispatch(actions.saveGame(slot))
    },
    [state]
  )

  const loadGame = useCallback((slot: number) => {
    const loadedState = loadPersistedGame(slot)
    if (loadedState) {
      dispatch(actions.loadGame(slot))
    }
  }, [])

  const initializeGame = useCallback(() => {
    dispatch(actions.initializeGame())
  }, [])

  return {
    state,
    actions: {
      brewPotion,
      sellPotion,
      travel,
      repayDebt,
      advanceDay,
      handleEventChoice,
      saveGame,
      loadGame,
      initializeGame,
    },
    selectors: {
      health: selectors.selectHealth(state),
      cash: selectors.selectCash(state),
      debt: selectors.selectDebt(state),
      day: selectors.selectDay(state),
      inventory: selectors.selectInventory(state),
      prices: selectors.selectPrices(state),
      location: selectors.selectLocation(state),
      weather: selectors.selectWeather(state),
      currentEvent: selectors.selectCurrentEvent(state),
      currentEventStep: selectors.selectCurrentEventStep(state),
      isGameOver: selectors.selectIsGameOver(state),
      playerLevel: selectors.selectPlayerLevel(state),
      canAffordItem: (itemName: string, quantity?: number) =>
        selectors.selectCanAffordItem(state, itemName, quantity),
      canSellItem: (itemName: string, quantity?: number) =>
        selectors.selectCanSellItem(state, itemName, quantity),
    },
  }
}
