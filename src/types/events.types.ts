import { type GameState, type Location } from './game.types.js'
import { type Weather } from './weather.types.js'

export type EventEffect = (state: GameState) => GameState

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

export type Choice = {
  text: string
  effect: EventEffect
}

export type MultiStepEvent = {
  name: string
  description: string
  steps: Array<{
    description: string
    choices: Choice[]
  }>
  locationSpecific?: string[]
  weatherSpecific?: Weather[]
  timeSpecific?: number | [number, number]
  probability: number
  type: 'positive' | 'neutral' | 'negative'
}

export type RandomEventResponse = {
  message?: string
  currentEvent?: Event | MultiStepEvent
  currentStep?: number
  weather: Weather
  inventory: Record<string, number>
  cash: number
  prices: Record<string, number>
  location: Location
}
