import { type Event, type MultiStepEvent } from '../../../types/events.types.js'
import { type GameState } from '../../../types/game.types.js'

export const handleEvent = (
  event: Event | MultiStepEvent,
  state: GameState
): GameState => {
  if ('steps' in event) {
    // Handle multi-step event
    const currentStep = state.currentStep ?? 0
    const step = event.steps[currentStep]

    if (!step) {
      return {
        ...state,
        currentEvent: undefined,
        currentStep: undefined,
      }
    }

    return {
      ...state,
      currentEvent: event,
      currentStep,
    }
  }

  // Handle single-step event
  return event.effect(state)
}

export const handleEventChoice = (
  state: GameState,
  choiceIndex: number
): GameState => {
  if (!state.currentEvent || !('steps' in state.currentEvent)) {
    return state
  }

  const currentStep = state.currentStep ?? 0
  const step = state.currentEvent.steps[currentStep]

  if (!step?.choices[choiceIndex]) {
    return state
  }

  const choice = step.choices[choiceIndex]
  const newState = choice.effect(state)

  // Move to next step or finish event
  if (currentStep >= state.currentEvent.steps.length - 1) {
    return {
      ...newState,
      currentEvent: undefined,
      currentStep: undefined,
    }
  }

  return {
    ...newState,
    currentStep: currentStep + 1,
  }
}
