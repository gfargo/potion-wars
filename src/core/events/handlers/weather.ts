import { type Event } from '../../../types/events.types.js'
import { type Weather } from '../../../types/weather.types.js'

export const currentWeather: Weather = 'sunny'

export const weatherEvents: Event[] = [
  {
    name: 'Sunny Day',
    description: 'The sun is shining brightly, boosting potion potency.',
    effect(state) {
      const newPrices = { ...state.prices }
      for (const potion of Object.keys(newPrices)) {
        newPrices[potion] &&= Math.floor(newPrices[potion] * 1.1)
      }

      return { ...state, prices: newPrices }
    },
    probability: 0.3,
    weatherSpecific: ['sunny'],
    type: 'positive',
  },
  {
    name: 'Rainy Day',
    description: 'The rain is making it difficult to brew potions outdoors.',
    effect(state) {
      const newPrices = { ...state.prices }
      for (const potion of Object.keys(newPrices)) {
        newPrices[potion] &&= Math.floor(newPrices[potion] * 0.9)
      }

      return { ...state, prices: newPrices }
    },
    probability: 0.2,
    weatherSpecific: ['rainy'],
    type: 'negative',
  },
  {
    name: 'Stormy Weather',
    description: 'A fierce storm is raging, making travel dangerous.',
    effect: (state) => ({
      ...state,
      weather: 'stormy',
      location: {
        ...state.location,
        dangerLevel: Math.min(state.location.dangerLevel + 3, 10),
      },
    }),
    probability: 0.1,
    weatherSpecific: ['stormy'],
    type: 'negative',
  },
  {
    name: 'Windy Day',
    description: 'Strong winds are spreading potion fumes far and wide.',
    effect: (state) => ({
      ...state,
      cash: state.cash + 200,
    }),
    probability: 0.2,
    weatherSpecific: ['windy'],
    type: 'positive',
  },
  {
    name: 'Foggy Morning',
    description: 'A thick fog has settled, making it hard to see.',
    effect: (state) => ({
      ...state,
      location: {
        ...state.location,
        dangerLevel: Math.max(state.location.dangerLevel - 1, 1),
      },
    }),
    probability: 0.2,
    weatherSpecific: ['foggy'],
    type: 'neutral',
  },
]

export const updateWeather = (): Weather => {
  const randomValue = Math.random()
  if (randomValue < 0.4) return 'sunny'
  if (randomValue < 0.6) return 'rainy'
  if (randomValue < 0.7) return 'stormy'
  if (randomValue < 0.9) return 'windy'
  return 'foggy'
}
