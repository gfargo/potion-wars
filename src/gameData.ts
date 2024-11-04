import { potions, type Location } from './constants.js'

export const generatePrices = (): Record<string, number> => {
  return potions.reduce((accumulator: Record<string, number>, potion) => {
    accumulator[potion.name] = Math.floor(
      Math.random() * (potion.maxPrice - potion.minPrice + 1) + potion.minPrice
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
    name: 'Royal Inspection',
    description: 'The royal guards inspect your potions! You lose half of your inventory.',
    effect(state: { inventory: Record<string, unknown> | ArrayLike<unknown> }) {
      const newInventory = Object.fromEntries(
        Object.entries(state.inventory).map(([potion, amount]) => [
          potion,
          Math.floor((amount as number) / 2),
        ])
      )
      return { ...state, inventory: newInventory }
    },
  },
  {
    name: 'Ingredient Shortage',
    description: "There's a shortage of potion ingredients! Prices double for the day.",
    effect(state: { prices: ArrayLike<unknown> | Record<string, unknown> }) {
      const newPrices = Object.fromEntries(
        Object.entries(state.prices).map(([potion, price]) => [
          potion,
          (price as number) * 2,
        ])
      )
      return { ...state, prices: newPrices }
    },
  },
  {
    name: 'Lucky Find',
    description: 'You found a rare ingredient! Gain 1000 gold.',
    effect: (state: { cash: number }) => ({
      ...state,
      cash: state.cash + 1000,
    }),
  },
  {
    name: 'Alchemist Rivalry',
    description:
      'A rivalry between alchemists breaks out! Prices are volatile and danger increases.',
    effect(state: { prices: Record<string, number>; location: Location }) {
      const newPrices = { ...state.prices }
      for (const potion of Object.keys(newPrices)) {
        if (newPrices[potion] !== undefined) {
          newPrices[potion] *= Math.random() < 0.5 ? 0.5 : 1.5
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
    locationSpecific: ['Alchemist\'s Quarter', 'Merchant\'s District'],
  },
  {
    name: 'Royal Decree',
    description:
      'A royal decree increases demand for potions! Nobles are desperate for your concoctions.',
    effect(state: { prices: Record<string, number> }) {
      const newPrices = { ...state.prices }
      for (const potion of Object.keys(newPrices)) {
        if (newPrices[potion] !== undefined) {
          newPrices[potion] *= 2
        }
      }

      return { ...state, prices: newPrices }
    },
    locationSpecific: ['Royal Castle'],
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
