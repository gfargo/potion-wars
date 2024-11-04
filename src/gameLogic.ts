import { type Location, locations } from './constants.js'
import { generatePrices, triggerRandomEvent } from './gameData.js'

export type GameState = {
  day: number
  cash: number
  debt: number
  health: number
  location: Location
  inventory: Record<string, number>
  prices: Record<string, number>
}

export type CombatResult = {
  health: number
  cash: number
  inventory: Record<string, number>
  message: string
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

export const handleCombat = (state: GameState): CombatResult => {
  const isRoyalGuard = Math.random() < 0.6 // 60% chance of royal guard encounter, 40% chance of rival alchemist encounter
  const enemyName = isRoyalGuard ? 'Royal Guard' : 'Rival Alchemist'
  const playerStrength = Math.floor(Math.random() * 10) + 1 // Player's strength (1-10)
  const enemyStrength = Math.floor(Math.random() * 10) + 1 // Enemy's strength (1-10)

  let message = `You've encountered ${enemyName}! `

  if (playerStrength > enemyStrength) {
    message += `You managed to escape!`
    return {
      health: state.health - Math.floor(Math.random() * 10),
      cash: state.cash,
      inventory: state.inventory,
      message,
    }
  }

  const cashLost = Math.floor(state.cash * 0.2) // Lose 20% of gold
  const inventoryLost: Record<string, number> = {}

  for (const [potion, quantity] of Object.entries(state.inventory)) {
    inventoryLost[potion] = Math.floor(quantity * 0.3) // Lose 30% of each potion
  }

  message += `You were caught! Lost ${cashLost} gold and some potions.`

  return {
    health: state.health - Math.floor(Math.random() * 20),
    cash: state.cash - cashLost,
    inventory: Object.fromEntries(
      Object.entries(state.inventory).map(([potion, quantity]) => [
        potion,
        quantity - (inventoryLost[potion] || 0),
      ])
    ),
    message,
  }
}

export const travel = (
  state: GameState,
  newLocationName: string
): [GameState, string] => {
  const newLocation = locations.find((loc) => loc.name === newLocationName)
  if (!newLocation) {
    return [state, 'Invalid location!']
  }

  const newPrices = generatePrices()

  const newState = {
    ...state,
    location: newLocation,
    prices: newPrices,
  } as GameState

  const message = `Traveled to ${newLocation.name}. ${newLocation.description}`
  return [newState, message]
}

export const travelCombat = (
  state: GameState
): [GameState, string | undefined] => {
  if (Math.random() < state.location.dangerLevel / 20) {
    const combatResult = handleCombat(state)

    const newState = {
      ...state,
      health: combatResult.health,
      cash: combatResult.cash,
      inventory: combatResult.inventory,
    } as GameState

    const message = `${combatResult.message}`
    return [newState, message]
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
  const initialLocation =
    locations[Math.floor(Math.random() * locations.length)]!
  const initialState = {
    day: 0,
    cash: 2000,
    debt: 5000,
    health: 100,
    location: initialLocation,
    inventory: {},
    prices: generatePrices(),
  }

  return {
    ...initialState,
  }
}

export const advanceDay = (
  state: GameState,
  parameters?: {
    triggerEvent?: boolean
    triggerDebt?: boolean
  }
): [GameState, string] => {
  const newDay = state.day + 1

  const eventResult = parameters?.triggerEvent
    ? triggerRandomEvent({
        ...state,
      })
    : {
        prices: state.prices,
        inventory: state.inventory,
        cash: state.cash,
        location: state.location,
      }

  // Apply 10% daily interest to debt
  const newDebt = parameters?.triggerDebt
    ? Math.floor(state.debt * 1.1)
    : state.debt

  const newState = {
    ...state,
    day: newDay,
    prices: eventResult.prices,
    inventory: eventResult.inventory,
    cash: eventResult.cash,
    debt: newDebt,
    location: eventResult.location,
  }

  const message = `Day ${newDay}: ${
    eventResult.message || 'A new day begins.'
  } ${
    parameters?.triggerDebt
      ? `Your debt has increased to ${newDebt} gold due to interest.`
      : ''
  }`

  return [newState, message]
}

export const isGameOver = (state: GameState): boolean => {
  return (
    state.day > 30 ||
    state.health <= 0 ||
    (state.cash <= 0 && Object.values(state.inventory).every((v) => v === 0))
  )
}
