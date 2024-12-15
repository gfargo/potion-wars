import { type GameState } from '../../../../types/game.types.js'
import { createGameState } from '../utils/testHelper.js'

/**
 * Common screen states for testing
 */
export const screenStates = {
  /**
   * Game screen states
   */
  game: {
    default: () => ({
      screen: 'game',
      gameState: createGameState(),
    }),

    playing: () => ({
      screen: 'game',
      gameState: createGameState({
        day: 15,
        cash: 5000,
        inventory: {
          'Health Potion': 3,
          'Strength Potion': 2,
        },
      }),
    }),
  },

  /**
   * Event screen states
   */
  event: {
    simple: () => ({
      screen: 'event',
      gameState: createGameState({
        currentEvent: {
          name: 'Market Crash',
          description: 'The market has crashed!',
          steps: [
            {
              description: 'The market has crashed!',
              choices: [
                {
                  text: 'Accept',
                  effect: (state: GameState) => state,
                },
              ],
            },
          ],
          probability: 0.1,
          type: 'negative',
        },
      }),
    }),

    multiStep: () => ({
      screen: 'event',
      gameState: createGameState({
        currentEvent: {
          name: 'Mysterious Stranger',
          description: 'A stranger approaches...',
          steps: [
            {
              description: 'What do you do?',
              choices: [
                { text: 'Accept', effect: (state: GameState) => state },
                { text: 'Decline', effect: (state: GameState) => state },
              ],
            },
          ],
          probability: 0.1,
          type: 'neutral',
        },
        currentStep: 0,
      }),
    }),
  },

  /**
   * Combat screen states
   */
  combat: {
    start: () => ({
      screen: 'combat',
      gameState: createGameState({
        health: 100,
        inventory: { 'Health Potion': 2 },
      }),
    }),

    critical: () => ({
      screen: 'combat',
      gameState: createGameState({
        health: 20,
        inventory: { 'Health Potion': 1 },
      }),
    }),
  },

  /**
   * Travel screen states
   */
  travel: {
    default: () => ({
      screen: 'traveling',
      gameState: createGameState({
        location: {
          name: 'Forest Path',
          description: 'A dangerous path through the forest',
          dangerLevel: 5,
        },
      }),
    }),
  },
}
