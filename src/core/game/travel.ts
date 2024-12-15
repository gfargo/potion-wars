import { handleCombat } from '../combat/index.js'
import { locations } from '../../constants.js'
import { type GameState } from '../../types/game.types.js'
import { generatePrices } from './economy.js'

export const travel = (
  state: GameState,
  newLocationName: string
): [GameState, string] => {
  const newLocation = locations.find((loc) => loc.name === newLocationName)
  if (!newLocation) {
    return [state, 'Invalid location!']
  }

  const newState = {
    ...state,
    prices: generatePrices(),
    location: newLocation,
  }

  const message = `Traveled to ${newLocation.name}. ${newLocation.description}`

  return [newState, message]
}

export const travelCombat = (
  state: GameState
): [GameState, string | undefined] => {
  // Chance of combat encounter during travel based on location danger level
  if (Math.random() < state.location.dangerLevel / 20) {
    const combatResult = handleCombat(state)
    const newState = {
      ...state,
      health: combatResult.health,
      cash: combatResult.cash,
      inventory: combatResult.inventory,
    }
    return [newState, combatResult.message]
  }

  return [state, undefined]
}
