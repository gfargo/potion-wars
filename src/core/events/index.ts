import {
    type Event,
    type MultiStepEvent,
    type RandomEventResponse,
} from '../../types/events.types.js'
import { type GameState } from '../../types/game.types.js'
import { standardEvents } from './handlers/standard.js'
import { weatherEvents } from './handlers/weather.js'
import { RivalEventHandler } from './handlers/rival.js'

export * from './handlers/weather.js'
export * from './handlers/npc.js'
export * from './handlers/rival.js'

export const triggerRandomEvent = (state: GameState): RandomEventResponse => {
  // First check for rival encounters
  try {
    const rivalHandler = RivalEventHandler.getInstance()
    // Note: We'll initialize rivals elsewhere to avoid async issues
    
    const rivalEvent = rivalHandler.checkForRivalEncounter(state)
    if (rivalEvent) {
      const firstStep = rivalEvent.steps[0]
      return {
        ...state,
        message: `${rivalEvent.name}: ${rivalEvent.description}\n${
          firstStep ? firstStep.description : ''
        }`,
        currentEvent: rivalEvent,
        currentStep: 0,
      }
    }
  } catch (error) {
    // If rival system fails, continue with regular events
    console.warn('Rival encounter check failed:', error)
  }

  // If no rival encounter, proceed with regular events
  const allEvents = [...standardEvents, ...weatherEvents]
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
  }

  // Handle single-step event
  const newState = selectedEvent.effect(state)
  return {
    ...newState,
    message: `${selectedEvent.name}: ${selectedEvent.description}`,
  }
}

export const handleMultiStepEventChoice = (
  state: GameState,
  choiceIndex: number
): RandomEventResponse => {
  if (!state.currentEvent || !('steps' in state.currentEvent)) {
    return state
  }

  const currentStep = state.currentEvent.steps[state.currentStep ?? 0]
  if (!currentStep) {
    return state
  }

  const selectedChoice = currentStep.choices[choiceIndex]

  if (!selectedChoice) {
    return state
  }

  const newState = selectedChoice.effect(state)
  const nextStep = (state.currentStep ?? 0) + 1

  if (nextStep >= state.currentEvent.steps.length) {
    // Event is complete
    return {
      ...newState,
      currentEvent: undefined,
      currentStep: undefined,
    }
  }

  // Move to next step
  const nextStepData = state.currentEvent.steps[nextStep]
  if (!nextStepData) {
    return {
      ...newState,
      currentEvent: undefined,
      currentStep: undefined,
      message: 'Event completed',
    }
  }

  return {
    ...newState,
    currentStep: nextStep,
    message: nextStepData.description,
  }
}
