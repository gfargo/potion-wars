import test from 'ava'
import { type MultiStepEvent } from '../../../types/events.types.js'
import { createGameState } from '../../state/tests/utils/testHelper.js'
import { handleEvent, handleEventChoice } from '../handlers/eventHandler.js'

const mysteriousStrangerEvent: MultiStepEvent = {
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
              return {
                ...state,
                message: "You don't have enough gold!",
              }
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
}

test('initializes event state correctly', (t) => {
  const initialState = createGameState({ cash: 2000 })
  const result = handleEvent(mysteriousStrangerEvent, initialState)

  t.is(result.currentEvent, mysteriousStrangerEvent)
  t.is(result.currentStep, 0)
})

test('handles accepting offer with enough gold', (t) => {
  const initialState = createGameState({ cash: 2000 })
  const eventState = handleEvent(mysteriousStrangerEvent, initialState)
  const result = handleEventChoice(eventState, 0) // Accept offer

  t.is(result.cash, 1000)
  t.is(result.inventory['Rare Potion'], 1)
  t.is((result as any).message, 'You learned how to brew a Rare Potion!')
  t.is(result.currentEvent, undefined) // Event should be complete
})

test('handles accepting offer without enough gold', (t) => {
  const initialState = createGameState({ cash: 500 })
  const eventState = handleEvent(mysteriousStrangerEvent, initialState)
  const result = handleEventChoice(eventState, 0) // Accept offer

  t.is(result.cash, 500) // Cash shouldn't change
  t.is(result.inventory['Rare Potion'], undefined)
  t.is((result as any).message, "You don't have enough gold!")
})

test('handles declining offer', (t) => {
  const initialState = createGameState()
  const eventState = handleEvent(mysteriousStrangerEvent, initialState)
  const result = handleEventChoice(eventState, 1) // Decline offer

  t.is(result.cash, initialState.cash)
  t.is(result.inventory['Rare Potion'], undefined)
  t.is((result as any).message, 'You politely decline the offer.')
})

test('cleans up event state after completion', (t) => {
  const initialState = createGameState({ cash: 2000 })
  const eventState = handleEvent(mysteriousStrangerEvent, initialState)
  const result = handleEventChoice(eventState, 0) // Accept offer

  t.is(result.currentEvent, undefined)
  t.is(result.currentStep, undefined)
})
