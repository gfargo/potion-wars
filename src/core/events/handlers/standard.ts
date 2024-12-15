import { type Event, type MultiStepEvent } from '../../../types/events.types.js'

export const standardEvents: Array<Event | MultiStepEvent> = [
  {
    name: 'Royal Inspection',
    description:
      'The royal guards inspect your potions! You lose half of your inventory.',
    effect(state) {
      const newInventory = Object.fromEntries(
        Object.entries(state.inventory).map(([potion, amount]) => [
          potion,
          Math.floor(amount / 2),
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
    effect(state) {
      const newPrices = Object.fromEntries(
        Object.entries(state.prices).map(([potion, price]) => [
          potion,
          price * 2,
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
    effect: (state) => ({
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
    effect(state) {
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
    effect(state) {
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
    effect(state) {
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
    effect(state) {
      const newPrices = { ...state.prices }

      for (const potion of Object.keys(newPrices)) {
        if (newPrices[potion] !== undefined) {
          newPrices[potion] = Math.floor(newPrices[potion] * 0.5)
        }
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
            effect(state) {
              if (state.cash < 1000) {
                return { ...state, message: "You don't have enough gold!" }
              }

              return {
                ...state,
                cash: state.cash - 1000,
                inventory: {
                  ...state.inventory,
                  'Rare Potion': (state.inventory['Rare Potion'] ?? 0) + 1,
                },
                message: 'You learned how to brew a Rare Potion!',
              }
            },
          },
          {
            text: 'Decline the offer',
            effect: (state) => ({
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
    effect(state) {
      const newPrices = { ...state.prices }
      for (const potion of Object.keys(newPrices)) {
        if (newPrices[potion]) {
          newPrices[potion] *= 1.5
        }
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
    effect(state) {
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
            effect: (state) => ({
              ...state,
              cash: state.cash + 300,
              message: 'You learned how to brew potions more efficiently!',
            }),
          },
          {
            text: 'Advanced Techniques (Increases health)',
            effect: (state) => ({
              ...state,
              health: Math.min(state.health + 20, 100),
              message:
                'You learned advanced brewing techniques, improving your health!',
            }),
          },
          {
            text: 'Rare Ingredients (New inventory item)',
            effect: (state) => ({
              ...state,
              inventory: {
                ...state.inventory,
                'Exotic Herb': (state.inventory['Exotic Herb'] ?? 0) + 5,
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
