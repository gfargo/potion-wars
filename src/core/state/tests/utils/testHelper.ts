import { type Message } from '../../../../contexts/MessageContext.js'
import { type GameState } from '../../../../types/game.types.js'

/**
 * Create a basic game state for testing
 */
export const createGameState = (
  overrides: Partial<GameState> = {}
): GameState => ({
  day: 1,
  cash: 2000,
  debt: 5000,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: {
    name: "Alchemist's Quarter",
    description: 'A bustling area full of potion shops',
    dangerLevel: 1,
  },
  inventory: {},
  prices: {},
  weather: 'sunny',
  ...overrides,
})

/**
 * Create test messages
 */
export const createMessages = (messages: Array<Partial<Message>>): Message[] =>
  messages.map((message) => ({
    type: 'info',
    content: '',
    timestamp: Date.now(),
    ...message,
  }))

/**
 * Common test scenarios
 */
export const scenarios = {
  newGame: () => createGameState(),

  richPlayer: () =>
    createGameState({
      cash: 10_000,
      inventory: {
        'Health Potion': 5,
        'Strength Potion': 3,
      },
    }),

  poorPlayer: () =>
    createGameState({
      cash: 100,
      debt: 10_000,
    }),

  endGame: () =>
    createGameState({
      day: 30,
      cash: 20_000,
      debt: 0,
    }),

  criticalHealth: () =>
    createGameState({
      health: 10,
      cash: 50,
    }),
}
