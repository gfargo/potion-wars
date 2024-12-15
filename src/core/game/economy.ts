import { potions } from '../../constants.js'
import { type GameState } from '../../types/game.types.js'

export function generatePrices(): Record<string, number> {
  const prices: Record<string, number> = {}

  for (const potion of potions) {
    prices[potion.name] = Math.floor(
      Math.random() * (potion.maxPrice - potion.minPrice + 1) + potion.minPrice
    )
  }

  return prices
}

export function repayDebt(
  state: GameState,
  amount: number
): [GameState, string] {
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
