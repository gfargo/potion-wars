import { createGameState } from '../utils/testHelper.js'

/**
 * Common game states for testing
 */
export const gameStates = {
  /**
   * New game with default values
   */
  default: () => createGameState(),

  /**
   * Wealthy player with potions
   */
  wealthy: () =>
    createGameState({
      cash: 10_000,
      debt: 2000,
      inventory: {
        'Health Potion': 5,
        'Strength Potion': 3,
        'Agility Potion': 2,
      },
    }),

  /**
   * Poor player with high debt
   */
  poor: () =>
    createGameState({
      cash: 100,
      debt: 10_000,
      inventory: {},
    }),

  /**
   * Player near death
   */
  critical: () =>
    createGameState({
      health: 10,
      cash: 50,
      inventory: {
        'Health Potion': 1,
      },
    }),

  /**
   * End game scenario
   */
  endgame: () =>
    createGameState({
      day: 30,
      cash: 20_000,
      debt: 0,
      inventory: {
        'Health Potion': 10,
        'Strength Potion': 8,
        'Agility Potion': 8,
      },
    }),
}
