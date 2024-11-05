import { type Location } from './constants.js'
import { Weather, weatherEvents } from './weather.js'

type EventEffect = (state: any) => any

export type Event = {
  name: string
  description: string
  effect: EventEffect
  locationSpecific?: string[]
  timeSpecific?: number | [number, number]
  weatherSpecific?: Weather[]
  probability: number // 0-1, with 1 being most likely
  type: 'positive' | 'neutral' | 'negative'
}

type Choice = {
  text: string
  effect: EventEffect
}

export type MultiStepEvent = {
  name: string
  description: string
  steps: {
    description: string
    choices: Choice[]
  }[]
  locationSpecific?: string[]
  weatherSpecific?: Weather[]
  timeSpecific?: number | [number, number]
  probability: number
  type: 'positive' | 'neutral' | 'negative'
}

export const events: (Event | MultiStepEvent)[] = [
  {
    name: 'Royal Inspection',
    description:
      'The royal guards inspect your potions! You lose half of your inventory.',
    effect(state: { inventory: Record<string, unknown> | ArrayLike<unknown> }) {
      const newInventory = Object.fromEntries(
        Object.entries(state.inventory).map(([potion, amount]) => [
          potion,
          Math.floor((amount as number) / 2),
        ])
      )
      return { ...state, inventory: newInventory }
    },
    probability: 0.1,
    type: 'negative',
  },
  {
    name: 'Ingredient Shortage',
    description:
      "There's a shortage of potion ingredients! Prices double for the day.",
    effect(state: { prices: ArrayLike<unknown> | Record<string, unknown> }) {
      const newPrices = Object.fromEntries(
        Object.entries(state.prices).map(([potion, price]) => [
          potion,
          (price as number) * 2,
        ])
      )
      return { ...state, prices: newPrices }
    },
    probability: 0.2,
    type: 'negative',
  },
  {
    name: 'Lucky Find',
    description: 'You found a rare ingredient! Gain 1000 gold.',
    effect: (state: { cash: number }) => ({
      ...state,
      cash: state.cash + 1000,
    }),
    probability: 0.15,
    type: 'positive',
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
    locationSpecific: ["Alchemist's Quarter", "Merchant's District"],
    probability: 0.1,
    type: 'neutral',
  },
  {
    name: 'Royal Decree',
    description:
      'A royal decree increases demand for potions! Nobles are desperate for your concoctions.',
    effect(state: { prices: Record<string, number> }) {
      const newPrices = { ...state.prices }
      for (const potion of Object.keys(newPrices)) {
        if (newPrices[potion] !== undefined) {
          newPrices[potion] = Math.floor(newPrices[potion] * 1.8)
        }
      }

      return { ...state, prices: newPrices }
    },
    locationSpecific: ['Royal Castle'],
    probability: 0.1,
    type: 'positive',
  },
  {
    name: 'Potion Brewing Contest',
    description:
      'The local alchemist guild is hosting a potion brewing contest!',
    effect: (state: any) => {
      const reward = Math.floor(Math.random() * 500) + 500
      return { ...state, cash: state.cash + reward }
    },
    probability: 0.1,
    type: 'positive',
    locationSpecific: ["Alchemist's Quarter"],
  },
  {
    name: 'Market Crash',
    description: 'The potion market has suddenly crashed!',
    effect: (state: any) => {
      const newPrices = { ...state.prices }
      for (const potion of Object.keys(newPrices)) {
        newPrices[potion] = Math.floor(newPrices[potion] * 0.5)
      }
      return { ...state, prices: newPrices }
    },
    probability: 0.05,
    type: 'negative',
    timeSpecific: [10, 30], // Only occurs between day 10 and 30
  },
  {
    name: 'Mysterious Stranger',
    description: 'A cloaked figure approaches you with an intriguing offer...',
    steps: [
      {
        description:
          'The stranger offers to teach you a rare potion recipe for 1000 gold. Do you accept?',
        choices: [
          {
            text: 'Accept the offer',
            effect: (state: any) => {
              if (state.cash < 1000) {
                return { ...state, message: "You don't have enough gold!" }
              }
              return {
                ...state,
                cash: state.cash - 1000,
                inventory: {
                  ...state.inventory,
                  'Rare Potion': (state.inventory['Rare Potion'] || 0) + 1,
                },
                message: 'You learned how to brew a Rare Potion!',
              }
            },
          },
          {
            text: 'Decline the offer',
            effect: (state: any) => ({
              ...state,
              message: 'You politely decline the offer.',
            }),
          },
        ],
      },
    ],
    probability: 0.1,
    type: 'neutral',
  },
  {
    name: 'Royal Wedding',
    description: 'The royal family is preparing for a grand wedding!',
    effect: (state: any) => {
      const newPrices = { ...state.prices }
      for (const potion of Object.keys(newPrices)) {
        newPrices[potion] *= 1.5
      }
      return {
        ...state,
        prices: newPrices,
        message: 'Potion prices have increased due to high demand!',
      }
    },
    probability: 0.05,
    type: 'positive',
    locationSpecific: ['Royal Castle'],
    timeSpecific: 15, // Occurs only on day 15
  },
  {
    name: 'Potion Explosion',
    description: 'One of your potions has become unstable!',
    effect: (state: any) => {
      const lostGold = Math.floor(state.cash * 0.1)
      return {
        ...state,
        cash: state.cash - lostGold,
        health: Math.max(state.health - 10, 0),
        message: `Your potion exploded! You lost ${lostGold} gold and 10 health.`,
      }
    },
    probability: 0.1,
    type: 'negative',
  },
  {
    name: 'Alchemist Convention',
    description: 'The annual Alchemist Convention is in town!',
    steps: [
      {
        description:
          'You can attend workshops to improve your skills. Which one do you choose?',
        choices: [
          {
            text: 'Brewing Efficiency (Increases gold)',
            effect: (state: any) => ({
              ...state,
              cash: state.cash + 300,
              message: 'You learned how to brew potions more efficiently!',
            }),
          },
          {
            text: 'Advanced Techniques (Increases health)',
            effect: (state: any) => ({
              ...state,
              health: Math.min(state.health + 20, 100),
              message:
                'You learned advanced brewing techniques, improving your health!',
            }),
          },
          {
            text: 'Rare Ingredients (New inventory item)',
            effect: (state: any) => ({
              ...state,
              inventory: {
                ...state.inventory,
                'Exotic Herb': (state.inventory['Exotic Herb'] || 0) + 5,
              },
              message: 'You received 5 Exotic Herbs!',
            }),
          },
        ],
      },
    ],
    probability: 0.1,
    type: 'positive',
    locationSpecific: ["Alchemist's Quarter"],
    timeSpecific: [5, 25], // Occurs between day 5 and 25
  },
]

type RandomEventResponse = {
  message?: string
  currentEvent?: Event | MultiStepEvent
  currentStep?: number
  weather: Weather
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
  weather: Weather
  day: number
}): RandomEventResponse => {
  const allEvents = [...events, ...weatherEvents]
  const eligibleEvents = allEvents.filter((event) => {
    const weatherMatch =
      !event.weatherSpecific || event.weatherSpecific.includes(state.weather)
    const locationMatch =
      !event.locationSpecific ||
      event.locationSpecific.includes(state.location.name)
    const timeMatch =
      !event.timeSpecific ||
      (typeof event.timeSpecific === 'number' &&
        event.timeSpecific === state.day) ||
      (Array.isArray(event.timeSpecific) &&
        state.day >= event.timeSpecific[0] &&
        state.day <= event.timeSpecific[1])
    return locationMatch && timeMatch && weatherMatch
  })

  const totalProbability = eligibleEvents.reduce(
    (sum, event) => sum + event.probability,
    0
  )
  let randomValue = Math.random() * totalProbability
  let selectedEvent: Event | MultiStepEvent | undefined

  for (const event of eligibleEvents) {
    randomValue -= event.probability
    if (randomValue <= 0) {
      selectedEvent = event
      break
    }
  }

  if (!selectedEvent) {
    return state
  }

  if ('steps' in selectedEvent) {
    // Handle multi-step event
    const firstStep = selectedEvent.steps[0]
    return {
      ...state,
      message: `${selectedEvent.name}: ${selectedEvent.description}\n${
        firstStep ? firstStep.description : ''
      }`,
      currentEvent: selectedEvent,
      currentStep: 0,
    }
  } else {
    // Handle single-step event
    const newState = selectedEvent.effect(state)
    return {
      ...newState,
      message: `${selectedEvent.name}: ${selectedEvent.description}`,
    }
  }
}

export const handleMultiStepEventChoice = (
  state: any,
  choiceIndex: number
): RandomEventResponse => {
  if (!state.currentEvent || !('steps' in state.currentEvent)) {
    return state
  }

  const currentStep = state.currentEvent.steps[state.currentStep]
  const selectedChoice = currentStep.choices[choiceIndex]

  if (!selectedChoice) {
    return state
  }

  const newState = selectedChoice.effect(state)
  const nextStep = state.currentStep + 1

  if (nextStep >= state.currentEvent.steps.length) {
    // Event is complete
    return {
      ...newState,
      currentEvent: undefined,
      currentStep: undefined,
    }
  } else {
    // Move to next step
    const nextStepData = state.currentEvent.steps[nextStep]
    return {
      ...newState,
      currentStep: nextStep,
      message: nextStepData.description,
    }
  }
}
