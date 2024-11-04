import { drugs, type Location } from './constants.js'

export const generatePrices = (): Record<string, number> => {
  return drugs.reduce((accumulator: Record<string, number>, drug) => {
    accumulator[drug.name] = Math.floor(
      Math.random() * (drug.maxPrice - drug.minPrice + 1) + drug.minPrice
    )
    return accumulator
  }, {})
}

type Event = {
  name: string
  description: string
  effect: (state: any) => any
  locationSpecific?: string[]
}

export const events: Event[] = [
  {
    name: 'Police Raid',
    description: 'The police raid your stash! You lose half of your inventory.',
    effect(state: { inventory: Record<string, unknown> | ArrayLike<unknown> }) {
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
    effect(state: { prices: ArrayLike<unknown> | Record<string, unknown> }) {
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
  {
    name: 'Gang War',
    description:
      'A gang war breaks out! Prices are volatile and danger increases.',
    effect(state: { prices: Record<string, number>; location: Location }) {
      const newPrices = { ...state.prices }
      for (const drug of Object.keys(newPrices)) {
        if (newPrices[drug] !== undefined) {
          newPrices[drug] *= Math.random() < 0.5 ? 0.5 : 1.5
        }
      }

      return {
        ...state,
        prices: newPrices,
        location: {
          ...state.location,
          dangerLevel: Math.min(state.location.dangerLevel + 2, 10),
        },
      }
    },
    locationSpecific: ['Bronx', 'Brooklyn'],
  },
  {
    name: 'Stock Market Crash',
    description:
      'The stock market crashes! Rich clients are desperate for drugs.',
    effect(state: { prices: Record<string, number> }) {
      const newPrices = { ...state.prices }
      for (const drug of Object.keys(newPrices)) {
        if (newPrices[drug] !== undefined) {
          newPrices[drug] *= 2
        }
      }

      return { ...state, prices: newPrices }
    },
    locationSpecific: ['Manhattan'],
  },
]

type RandomEventResponse = {
  message?: string
  inventory: Record<string, number>
  cash: number
  prices: Record<string, number>
  location: Location
}

export const triggerRandomEvent = (state: {
  inventory: Record<string, number>
  prices: Record<string, number>
  cash: number
  location: Location
}): RandomEventResponse => {
  const locationEvents = events.filter(
    (event) =>
      !event.locationSpecific ||
      event.locationSpecific.includes(state.location.name)
  )
  const event =
    locationEvents[Math.floor(Math.random() * locationEvents.length)]

  if (!event) {
    return state
  }

  const newState = event.effect(state)

  return {
    ...newState,
    message: `${event.name}: ${event.description}`,
  }
}
