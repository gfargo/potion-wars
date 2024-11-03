import { drugs } from "./constants.js"

export const generatePrices = (): { [key: string]: number } => {
  return drugs.reduce((acc: { [key: string]: number }, drug) => {
    acc[drug.name] = Math.floor(
      Math.random() * (drug.maxPrice - drug.minPrice + 1) + drug.minPrice
    )
    return acc
  }, {})
}

export const randomEvents = [
  {
    name: 'Police Raid',
    description: 'The police raid your stash! You lose half of your inventory.',
    effect: (state: {
      inventory: { [s: string]: unknown } | ArrayLike<unknown>
    }) => {
      const newInventory = Object.fromEntries(
        Object.entries(state.inventory).map(([drug, amount]) => [
          drug,
          Math.floor((amount as number) / 2),
        ])
      )
      return { ...state, inventory: newInventory }
    },
  },
  {
    name: 'Price Spike',
    description: "There's a shortage of drugs! Prices double for the day.",
    effect: (state: {
      prices: ArrayLike<unknown> | { [s: string]: unknown }
    }) => {
      const newPrices = Object.fromEntries(
        Object.entries(state.prices).map(([drug, price]) => [
          drug,
          (price as number) * 2,
        ])
      )
      return { ...state, prices: newPrices }
    },
  },
  {
    name: 'Lucky Find',
    description: 'You found a hidden stash! Gain $1000.',
    effect: (state: { cash: number }) => ({
      ...state,
      cash: state.cash + 1000,
    }),
  },
]

type RandomEventResponse = {
  message?: string
  inventory: { [key: string]: number }
  cash: number
}

export const triggerRandomEvent = (state: {
  inventory: { [key: string]: number }
  prices: { [key: string]: number }
  cash: number
}): RandomEventResponse => {
  const event = randomEvents[Math.floor(Math.random() * randomEvents.length)]
  
  if (!event) {
    return state
  }
  
  return {
    inventory: state.inventory,
    cash: state.cash,
    ...event.effect(state),
    message: `${event.name}: ${event.description}`,
  }
}
