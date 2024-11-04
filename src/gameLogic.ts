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

export const buyDrug = (
  state: GameState,
  drugName: string,
  quantity: number
): [GameState, string] => {
  const price = state.prices[drugName]
  if (price === undefined) {
    return [state, 'Price is not available for this drug!']
  }

  const totalCost = price * quantity

  if (totalCost > state.cash) {
    return [state, "You don't have enough cash!"]
  }

  const newState = {
    ...state,
    cash: state.cash - totalCost,
    inventory: {
      ...state.inventory,
      [drugName]: (state.inventory[drugName] || 0) + quantity,
    },
  }
  return [newState, `Bought ${quantity} ${drugName} for $${totalCost}`]
}

export const sellDrug = (
  state: GameState,
  drugName: string,
  quantity: number
): [GameState, string] => {
  if (!state.inventory[drugName] || state.inventory[drugName] < quantity) {
    return [state, "You don't have enough to sell!"]
  }

  const price = state.prices[drugName]
  if (price === undefined) {
    return [state, 'Price is not available for this drug!']
  }

  const totalEarned = price * quantity

  const newState = {
    ...state,
    cash: state.cash + totalEarned,
    inventory: {
      ...state.inventory,
      [drugName]: state.inventory[drugName] - quantity,
    },
  }
  return [newState, `Sold ${quantity} ${drugName} for $${totalEarned}`]
}

export const handleCombat = (state: GameState): CombatResult => {
  const isPolice = Math.random() < 0.6 // 60% chance of police encounter, 40% chance of gang encounter
  const enemyName = isPolice ? 'Police' : 'Rival Gang'
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

  const cashLost = Math.floor(state.cash * 0.2) // Lose 20% of cash
  const inventoryLost: Record<string, number> = {}

  for (const [drug, quantity] of Object.entries(state.inventory)) {
    inventoryLost[drug] = Math.floor(quantity * 0.3) // Lose 30% of each drug
  }

  message += `You were caught! Lost $${cashLost} and some inventory.`

  return {
    health: state.health - Math.floor(Math.random() * 20),
    cash: state.cash - cashLost,
    inventory: Object.fromEntries(
      Object.entries(state.inventory).map(([drug, quantity]) => [
        drug,
        quantity - (inventoryLost[drug] || 0),
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
  const eventResult = triggerRandomEvent({
    inventory: state.inventory,
    prices: newPrices,
    cash: state.cash,
    location: newLocation,
  })

  let newState = {
    ...state,
    location: newLocation,
    day: state.day + 1,
    prices: eventResult.prices,
    inventory: eventResult.inventory,
    cash: eventResult.cash,
  }

  let message = `Traveled to ${newLocation.name}. ${newLocation.description} ${
    eventResult.message || ''
  }`

  // Chance of combat encounter during travel based on location danger level
  if (Math.random() < newLocation.dangerLevel / 20) {
    const combatResult = handleCombat(newState)
    newState = {
      ...newState,
      health: combatResult.health,
      cash: combatResult.cash,
      inventory: combatResult.inventory,
    }
    message += ' ' + combatResult.message
  }

  return [newState, message]
}

export const repayDebt = (
  state: GameState,
  amount: number
): [GameState, string] => {
  if (amount > state.cash) {
    return [state, "You don't have enough cash to repay that much!"]
  }

  if (amount > state.debt) {
    return [state, "You're repaying more than you owe!"]
  }

  const newState = {
    ...state,
    cash: state.cash - amount,
    debt: state.debt - amount,
  }
  return [newState, `Repaid $${amount} of debt.`]
}

export const isGameOver = (state: GameState): boolean => {
  return (
    state.day > 30 ||
    state.health <= 0 ||
    (state.cash <= 0 && Object.values(state.inventory).every((v) => v === 0))
  )
}
