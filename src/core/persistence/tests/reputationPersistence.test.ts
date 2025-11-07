import test from 'ava'
import { type ReputationState } from '../../../types/reputation.types.js'
import { createGameState } from '../../state/tests/utils/testHelper.js'
import { saveGame, loadGame } from '../saveLoad.js'
import { SaveFileManager, SaveFileType } from '../utils.js'
import {
  isValidReputationState,
  isValidReputationChange,
  sanitizeReputationState,
  createDefaultReputationState,
} from '../reputationValidation.js'

// Helper to clean up test files
const cleanup = () => {
  const manager = SaveFileManager.getInstance()
  for (let slot = 1; slot <= 5; slot++) {
    try {
      manager.clearSaveFile(slot, SaveFileType.GAME_SAVE)
      manager.clearSaveFile(slot, SaveFileType.GAME_LOG)
    } catch {
      // Ignore cleanup errors
    }
  }
}

test.after(cleanup)
test.beforeEach(cleanup)

// Reputation State Validation Tests
test('isValidReputationState validates correct reputation state', (t) => {
  const validState: ReputationState = {
    global: 25,
    locations: {
      'Market Square': 10,
      'Royal District': -5,
    },
    npcRelationships: {
      merchant_aldric: 15,
      guard_captain: -10,
    },
  }

  t.true(isValidReputationState(validState))
})

test('isValidReputationState rejects invalid reputation state', (t) => {
  // Test null/undefined
  t.false(isValidReputationState(null))
  t.false(isValidReputationState(undefined))
  t.false(isValidReputationState('not an object'))

  // Test missing fields
  t.false(isValidReputationState({}))
  t.false(isValidReputationState({ global: 10 }))
  t.false(isValidReputationState({ global: 10, locations: {} }))

  // Test wrong types
  t.false(
    isValidReputationState({
      global: 'not a number',
      locations: {},
      npcRelationships: {},
    })
  )

  t.false(
    isValidReputationState({
      global: 10,
      locations: 'not an object',
      npcRelationships: {},
    })
  )

  t.false(
    isValidReputationState({
      global: 10,
      locations: {},
      npcRelationships: null,
    })
  )

  // Test invalid location values
  t.false(
    isValidReputationState({
      global: 10,
      locations: { location: 'not a number' },
      npcRelationships: {},
    })
  )

  // Test invalid NPC relationship values
  t.false(
    isValidReputationState({
      global: 10,
      locations: {},
      npcRelationships: { npc: 'not a number' },
    })
  )
})

test('isValidReputationChange validates correct reputation changes', (t) => {
  // Test global change
  t.true(isValidReputationChange({ global: 5 }))

  // Test location change
  t.true(
    isValidReputationChange({
      location: 'Market Square',
      locationChange: 10,
    })
  )

  // Test NPC change
  t.true(
    isValidReputationChange({
      npc: 'merchant_aldric',
      npcChange: -5,
    })
  )

  // Test combined changes
  t.true(
    isValidReputationChange({
      global: 2,
      location: 'Royal District',
      locationChange: 5,
      npc: 'guard_captain',
      npcChange: -3,
      reason: 'Successful trade',
    })
  )
})

test('isValidReputationChange rejects invalid reputation changes', (t) => {
  // Test null/undefined
  t.false(isValidReputationChange(null))
  t.false(isValidReputationChange(undefined))
  t.false(isValidReputationChange('not an object'))

  // Test empty object (no changes)
  t.false(isValidReputationChange({}))

  // Test wrong types
  t.false(isValidReputationChange({ global: 'not a number' }))
  t.false(isValidReputationChange({ location: 123 }))
  t.false(isValidReputationChange({ locationChange: 'not a number' }))
  t.false(isValidReputationChange({ npc: 123 }))
  t.false(isValidReputationChange({ npcChange: 'not a number' }))
  t.false(isValidReputationChange({ reason: 123 }))

  // Test incomplete location change (missing locationChange)
  t.false(isValidReputationChange({ location: 'Market Square' }))

  // Test incomplete NPC change (missing npcChange)
  t.false(isValidReputationChange({ npc: 'merchant_aldric' }))
})

test('sanitizeReputationState clamps values to valid ranges', (t) => {
  const extremeState: ReputationState = {
    global: 150, // Should be clamped to 100
    locations: {
      'Market Square': -200, // Should be clamped to -100
      'Royal District': 75, // Should remain 75
    },
    npcRelationships: {
      merchant_aldric: 300, // Should be clamped to 100
      guard_captain: -150, // Should be clamped to -100
    },
  }

  const sanitized = sanitizeReputationState(extremeState)

  t.is(sanitized.global, 100)
  t.is(sanitized.locations['Market Square'], -100)
  t.is(sanitized.locations['Royal District'], 75)
  t.is(sanitized.npcRelationships['merchant_aldric'], 100)
  t.is(sanitized.npcRelationships['guard_captain'], -100)
})

test('createDefaultReputationState creates valid default state', (t) => {
  const defaultState = createDefaultReputationState()

  t.true(isValidReputationState(defaultState))
  t.is(defaultState.global, 0)
  t.deepEqual(defaultState.locations, {})
  t.deepEqual(defaultState.npcRelationships, {})
})

// Save/Load Integration Tests
test('saves and loads game state with reputation data', (t) => {
  const gameState = createGameState({
    reputation: {
      global: 25,
      locations: {
        'Market Square': 15,
        'Royal District': -10,
      },
      npcRelationships: {
        merchant_aldric: 20,
        guard_captain: -5,
      },
    },
  })

  saveGame(gameState, 1)
  const loadedState = loadGame(1)

  t.truthy(loadedState)
  t.is(loadedState!.reputation.global, 25)
  t.is(loadedState!.reputation.locations['Market Square'], 15)
  t.is(loadedState!.reputation.locations['Royal District'], -10)
  t.is(loadedState!.reputation.npcRelationships['merchant_aldric'], 20)
  t.is(loadedState!.reputation.npcRelationships['guard_captain'], -5)
})

test('sanitizes reputation data when saving', (t) => {
  const gameState = createGameState({
    reputation: {
      global: 150, // Will be clamped to 100
      locations: {
        'Market Square': -200, // Will be clamped to -100
      },
      npcRelationships: {
        merchant_aldric: 300, // Will be clamped to 100
      },
    },
  })

  saveGame(gameState, 1)
  const loadedState = loadGame(1)

  t.truthy(loadedState)
  t.is(loadedState!.reputation.global, 100)
  t.is(loadedState!.reputation.locations['Market Square'], -100)
  t.is(loadedState!.reputation.npcRelationships['merchant_aldric'], 100)
})

test('migrates legacy save file without reputation data', (t) => {
  const manager = SaveFileManager.getInstance()

  // Create a legacy save file without reputation data
  const legacyState = {
    day: 5,
    cash: 1500,
    debt: 4000,
    health: 90,
    strength: 8,
    agility: 12,
    intelligence: 10,
    location: {
      name: 'Market Square',
      description: 'A bustling marketplace',
      dangerLevel: 2,
    },
    inventory: { 'Health Potion': 3 },
    prices: { 'Health Potion': 100 },
    weather: 'rainy',
    // Note: No reputation, marketData, or tradeHistory fields
  }

  // Write the legacy state directly
  manager.writeSaveFile(2, SaveFileType.GAME_SAVE, legacyState)

  // Load it - should trigger migration
  const loadedState = loadGame(2)

  t.truthy(loadedState)
  t.is(loadedState!.day, 5)
  t.is(loadedState!.cash, 1500)

  // Check that reputation data was added with defaults
  t.truthy(loadedState!.reputation)
  t.is(loadedState!.reputation.global, 0)
  t.deepEqual(loadedState!.reputation.locations, {})
  t.deepEqual(loadedState!.reputation.npcRelationships, {})

  // Check that market data and trade history were added
  t.truthy(loadedState!.marketData)
  t.deepEqual(loadedState!.marketData, {})
  t.truthy(loadedState!.tradeHistory)
  t.deepEqual(loadedState!.tradeHistory, [])
})

test('migrates legacy save file with invalid reputation data', (t) => {
  const manager = SaveFileManager.getInstance()

  // Create a save file with invalid reputation data
  const invalidState = {
    day: 10,
    cash: 2500,
    debt: 3000,
    health: 100,
    strength: 10,
    agility: 10,
    intelligence: 10,
    location: {
      name: 'Royal District',
      description: 'The royal quarter',
      dangerLevel: 3,
    },
    inventory: {},
    prices: {},
    weather: 'sunny',
    reputation: 'invalid reputation data', // Invalid type
    marketData: null, // Invalid type
    tradeHistory: 'not an array', // Invalid type
  }

  // Write the invalid state directly
  manager.writeSaveFile(3, SaveFileType.GAME_SAVE, invalidState)

  // Load it - should trigger migration
  const loadedState = loadGame(3)

  t.truthy(loadedState)
  t.is(loadedState!.day, 10)

  // Check that invalid reputation data was replaced with defaults
  t.truthy(loadedState!.reputation)
  t.is(loadedState!.reputation.global, 0)
  t.deepEqual(loadedState!.reputation.locations, {})
  t.deepEqual(loadedState!.reputation.npcRelationships, {})

  // Check that invalid market data and trade history were replaced
  t.deepEqual(loadedState!.marketData, {})
  t.deepEqual(loadedState!.tradeHistory, [])
})

test('preserves valid reputation data during migration', (t) => {
  const manager = SaveFileManager.getInstance()

  // Create a save file with some valid reputation data but missing other fields
  const partialState = {
    day: 15,
    cash: 3000,
    debt: 2000,
    health: 85,
    strength: 12,
    agility: 8,
    intelligence: 14,
    location: {
      name: 'Merchant Quarter',
      description: 'Where traders gather',
      dangerLevel: 1,
    },
    inventory: { 'Strength Potion': 2 },
    prices: { 'Strength Potion': 150 },
    weather: 'cloudy',
    reputation: {
      global: 30,
      locations: {
        'Market Square': 25,
      },
      npcRelationships: {
        merchant_aldric: 40,
      },
    },
    // Missing marketData and tradeHistory
  }

  // Write the partial state directly
  manager.writeSaveFile(1, SaveFileType.GAME_SAVE, partialState)

  // Load it - should trigger migration
  const loadedState = loadGame(1)

  t.truthy(loadedState)

  // Check that valid reputation data was preserved
  t.is(loadedState!.reputation.global, 30)
  t.is(loadedState!.reputation.locations['Market Square'], 25)
  t.is(loadedState!.reputation.npcRelationships['merchant_aldric'], 40)

  // Check that missing fields were added
  t.deepEqual(loadedState!.marketData, {})
  t.deepEqual(loadedState!.tradeHistory, [])
})
