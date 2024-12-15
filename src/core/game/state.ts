import { locations, phrases } from '../../constants.js'
import { type GameState } from '../../types/game.types.js'
import { triggerRandomEvent } from '../events/index.js'
import { generatePrices } from './economy.js'

export const initializeGame = (): GameState => {
  const initialLocation =
    locations[Math.floor(Math.random() * locations.length)]
  return {
    day: 0, // Day 0 is the start of the game, initializing game handles setting the first day
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

export function advanceDay(
  state: GameState,
  options: { triggerEvent: boolean; triggerDebt: boolean }
): [GameState, string] {
  const parsedOptions = {
    triggerEvent: options.triggerEvent ?? false,
    triggerDebt: options.triggerDebt ?? false,
  }

  let newState = { ...state, day: state.day + 1 }
  let message = `Day ${newState.day}: `

  if (parsedOptions.triggerEvent) {
    const eventResult = triggerRandomEvent(newState)
    newState = {
      ...(newState as GameState),
      ...(eventResult as GameState),
    }
    message += eventResult.message ?? ''
  } else {
    const dailyIntroCloser =
      phrases.newDayClosers[
        Math.floor(Math.random() * phrases.newDayClosers.length)
      ]
    message += `Another ${newState.weather} day here in the ${newState.location.name}... ${dailyIntroCloser}`
  }

  if (parsedOptions.triggerDebt) {
    // Apply daily interest to debt
    const newDebt = Math.floor(newState.debt * 1.1) // 10% daily interest
    newState.debt = newDebt
    message += ` Your debt has increased to ${newDebt}g due to interest.`
  }

  return [newState, message]
}

export const isGameOver = (state: GameState): boolean => {
  return (
    state.day > 30 ||
    state.health <= 0 ||
    (state.cash <= 0 && Object.values(state.inventory).every((v) => v === 0))
  )
}
