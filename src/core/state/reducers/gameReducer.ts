import { locations } from '../../../constants.js'
import { type GameState } from '../../../types/game.types.js'
import { handleCombat } from '../../combat/index.js'
import {
  handleMultiStepEventChoice,
  triggerRandomEvent,
} from '../../events/index.js'
import { generatePrices } from '../../game/economy.js'
import { brewPotion, sellPotion, travel } from '../../game/index.js'
import { type GameAction } from '../actions/types.js'

export const gameReducer = (
  state: GameState,
  action: GameAction
): GameState => {
  switch (action.type) {
    case 'game/brewPotion': {
      const [newState, actionResponseMessage] = brewPotion(
        state,
        action.payload.potionName,
        action.payload.quantity
      )
      console.log(actionResponseMessage)
      return newState
    }

    case 'game/sellPotion': {
      const [newState, actionResponseMessage] = sellPotion(
        state,
        action.payload.potionName,
        action.payload.quantity
      )
      console.log(actionResponseMessage)

      return newState
    }

    case 'game/travel': {
      const [travelState, actionResponseMessage] = travel(
        state,
        action.payload.location
      )
      console.log(actionResponseMessage)

      // Check for combat
      if (Math.random() < travelState.location.dangerLevel / 20) {
        const combatResult = handleCombat(travelState)
        return {
          ...travelState,
          health: combatResult.health,
          cash: combatResult.cash,
          inventory: combatResult.inventory,
        }
      }

      return travelState
    }

    case 'game/repayDebt': {
      if (action.payload.amount > state.cash) {
        return state
      }

      if (action.payload.amount > state.debt) {
        return state
      }

      return {
        ...state,
        cash: state.cash - action.payload.amount,
        debt: state.debt - action.payload.amount,
      }
    }

    case 'game/advanceDay': {
      let newState = { ...state, day: state.day + 1 }
      let message = `Day ${newState.day}`
      let eventResult = null

      if (action.payload.triggerEvent) {
        eventResult = triggerRandomEvent(newState)
        newState = {
          ...(newState as GameState),
          ...(eventResult as GameState),
        }
      }

      if (action.payload.triggerDebt) {
        // Apply daily interest to debt
        const newDebt = Math.floor(newState.debt * 1.1) // 10% daily interest
        newState.debt = newDebt
        message += ` Your debt has increased to ${newDebt}g due to interest.`
      }

      return {
        ...newState,
        _result: {
          message,
          eventResult,
        },
      }
    }

    case 'game/updateWeather': {
      return {
        ...state,
        weather: action.payload.weather,
      }
    }

    case 'game/handleEventChoice': {
      const eventResult = handleMultiStepEventChoice(
        state,
        action.payload.choiceIndex
      )
      return { ...state, ...(eventResult as GameState) }
    }

    case 'save/initializeGame': {
      const initialLocation =
        locations[Math.floor(Math.random() * locations.length)]
      return {
        day: 0,
        cash: 2000,
        debt: 5000,
        health: 100,
        strength: Math.floor(Math.random() * 5) + 5,
        agility: Math.floor(Math.random() * 5) + 5,
        intelligence: Math.floor(Math.random() * 5) + 5,
        location: initialLocation!,
        inventory: {},
        prices: generatePrices(),
        weather: 'sunny',
      }
    }

    default: {
      return state
    }
  }
}
