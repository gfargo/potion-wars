import { handleCombat } from './combat.js'
import { locations, phrases, potions, type Location } from './constants.js'
import { triggerRandomEvent, type MultiStepEvent } from './events.js'
import { Weather } from './weather.js'

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
}

export const brewPotion = (
  state: GameState,
  potionName: string,
  quantity: number
): [GameState, string] => {
  const price = state.prices[potionName]
  if (price === undefined) {
    return [state, 'Price is not available for this potion!']
  }

  const totalCost = price * quantity

  if (totalCost > state.cash) {
    return [state, "You don't have enough gold!"]
  }

  const newState = {
    ...state,
    cash: state.cash - totalCost,
    inventory: {
      ...state.inventory,
      [potionName]: (state.inventory[potionName] || 0) + quantity,
    },
  }
  return [newState, `Brewed ${quantity} ${potionName} for ${totalCost} gold`]
}

export const sellPotion = (
  state: GameState,
  potionName: string,
  quantity: number
): [GameState, string] => {
  if (!state.inventory[potionName] || state.inventory[potionName] < quantity) {
    return [state, "You don't have enough to sell!"]
  }

  const price = state.prices[potionName]
  if (price === undefined) {
    return [state, 'Price is not available for this potion!']
  }

  const totalEarned = price * quantity

  const newState = {
    ...state,
    cash: state.cash + totalEarned,
    inventory: {
      ...state.inventory,
      [potionName]: state.inventory[potionName] - quantity,
    },
  }
  return [newState, `Sold ${quantity} ${potionName} for ${totalEarned} gold`]
}

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

  let message = `Traveled to ${newLocation.name}. ${newLocation.description}`

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

export const repayDebt = (
  state: GameState,
  amount: number
): [GameState, string] => {
  if (amount > state.cash) {
    return [state, "You don't have enough gold to repay that much!"]
  }

  if (amount > state.debt) {
    return [state, "You're trying to repay more than you owe!"]
  }

  const newState = {
    ...state,
    cash: state.cash - amount,
    debt: state.debt - amount,
  }

  return [newState, `Repaid ${amount} gold of debt.`]
}

export const initializeGame = (): GameState => {
  const initialLocation = locations[
    Math.floor(Math.random() * locations.length)
  ] as Location
  return {
    day: 0, // Day 0 is the start of the game, initializing game handles setting the first day
    cash: 2000,
    debt: 5000,
    health: 100,
    strength: Math.floor(Math.random() * 5) + 5,
    agility: Math.floor(Math.random() * 5) + 5,
    intelligence: Math.floor(Math.random() * 5) + 5,
    location: initialLocation,
    inventory: {},
    prices: generatePrices(),
    weather: 'sunny',
  }
}

export const advanceDay = (
  state: GameState,
  options: { triggerEvent: boolean; triggerDebt: boolean } = {
    triggerEvent: false,
    triggerDebt: false,
  }
): [GameState, string] => {
  let newState = { ...state, day: state.day + 1 }
  let message = `Day ${newState.day}: `

  if (options.triggerEvent) {
    const eventResult = triggerRandomEvent(newState)
    newState = {
      ...(newState as GameState),
      ...(eventResult as GameState),
    }
    message += eventResult.message || ''
  } else {
    const dailyIntroCloser =
      phrases.newDayClosers[
        Math.floor(Math.random() * phrases.newDayClosers.length)
      ]
    message += `Another ${newState.weather} day here in the ${newState.location.name}... ${dailyIntroCloser}`
  }

  if (options.triggerDebt) {
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

export const generatePrices = (): Record<string, number> => {
  return potions.reduce((accumulator: Record<string, number>, potion) => {
    accumulator[potion.name] = Math.floor(
      Math.random() * (potion.maxPrice - potion.minPrice + 1) + potion.minPrice
    )
    return accumulator
  }, {})
}
