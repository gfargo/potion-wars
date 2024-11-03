import { locations } from "./constants.js"
import { generatePrices, triggerRandomEvent } from './gameData.js'

export interface GameState {
  day: number
  cash: number
  debt: number
  health: number
  location: string
  inventory: { [key: string]: number }
  prices: { [key: string]: number }
}

export interface CombatResult {
  health: number
  cash: number
  inventory: { [key: string]: number }
  message: string
}

export const buyDrug = (state: GameState, drugName: string, quantity: number): [GameState, string] => {
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

export const sellDrug = (state: GameState, drugName: string, quantity: number): [GameState, string] => {
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
  const damage = Math.floor(Math.random() * 20) + 1
  const newHealth = Math.max(0, state.health - damage)
  
  let cashLost = 0
  let inventoryLost: { [key: string]: number } = {}
  
  if (Math.random() < 0.5) {
    cashLost = Math.floor(state.cash * 0.1)
    Object.entries(state.inventory).forEach(([drug, quantity]) => {
      inventoryLost[drug] = Math.floor(quantity * 0.1)
    })
  }

  const newCash = state.cash - cashLost
  const newInventory = Object.fromEntries(
    Object.entries(state.inventory).map(([drug, quantity]) => [
      drug,
      quantity - (inventoryLost[drug] || 0)
    ])
  )

  return {
    health: newHealth,
    cash: newCash,
    inventory: newInventory,
    message: `You were attacked! Lost ${damage} health, $${cashLost} cash, and some inventory.`
  }
}

export const travel = (state: GameState, newLocation: string): [GameState, string] => {
  if (!locations.includes(newLocation)) {
    return [state, 'Invalid location!']
  }

  const newPrices = generatePrices()
  const eventResult = triggerRandomEvent({ inventory: state.inventory, prices: newPrices, cash: state.cash })

  let newState = {
    ...state,
    location: newLocation,
    day: state.day + 1,
    prices: newPrices,
    inventory: eventResult.inventory,
    cash: eventResult.cash,
  }

  let message = `Traveled to ${newLocation}. ${eventResult.message}`

  // 20% chance of combat encounter during travel
  if (Math.random() < 0.2) {
    const combatResult = handleCombat(newState)
    newState = {
      ...newState,
      health: combatResult.health,
      cash: combatResult.cash,
      inventory: combatResult.inventory
    }
    message += ' ' + combatResult.message
  }

  return [newState, message]
}

export const repayDebt = (state: GameState, amount: number): [GameState, string] => {
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

