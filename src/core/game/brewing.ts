import { type GameState } from '../../types/game.types.js'

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
      [potionName]: (state.inventory[potionName] ?? 0) + quantity,
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
