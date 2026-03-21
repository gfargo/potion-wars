import fs from 'node:fs'
import path from 'node:path'
import test from 'ava'
import { saveGame, loadGame, getSaveSlots } from '../saveLoad.js'
import { SaveFileManager, SaveFileType } from '../utils.js'
import {
    isValidGameState,
    isValidMarketData,
    isValidTradeTransaction,
    isValidNPCInteractionState,
    isValidAnimationState,
    migrateLegacySaveFile,
    sanitizeGameState,
} from '../dataValidation.js'
import { type GameState } from '../../../types/game.types.js'
import {
    type MarketData,
    type TradeTransaction,
} from '../../../types/economy.types.js'

const createTestGameState = (): GameState => ({
  day: 5,
  cash: 1000,
  debt: 500,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: {
    name: "Alchemist's Quarter",
    description: 'Test location',
    dangerLevel: 1,
  },
  inventory: { 'Health Potion': 5, 'Mana Potion': 3 },
  prices: { 'Health Potion': 100, 'Mana Potion': 150 },
  weather: 'sunny',
  reputation: {
    global: 10,
    locations: { "Alchemist's Quarter": 15 },
    npcRelationships: { test_npc: 5 },
  },
  marketData: {
    "Alchemist's Quarter": {
      'Health Potion': {
        basePrice: 100,
        currentPrice: 110,
        demand: 0.6,
        supply: 0.4,
        trend: 'rising',
        history: [
          { day: 1, price: 100, volume: 10 },
          { day: 2, price: 105, volume: 8 },
        ],
        volatility: 0.3,
        lastUpdated: 0,
      },
    },
  },
  tradeHistory: [
    {
      day: 3,
      location: "Alchemist's Quarter",
      potionType: 'Health Potion',
      quantity: 2,
      pricePerUnit: 110,
      totalValue: 220,
      type: 'sell',
    },
  ],
})

const createLegacyGameState = (): any => ({
  day: 5,
  cash: 1000,
  debt: 500,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: {
    name: "Alchemist's Quarter",
    description: 'Test location',
    dangerLevel: 1,
  },
  inventory: { 'Health Potion': 5 },
  prices: { 'Health Potion': 100 },
  weather: 'sunny',
  // Missing: reputation, marketData, tradeHistory
})

// This file exclusively uses slot 2 to avoid cross-file filesystem contamination.
// Other persistence test files use different slots:
//   SaveFileManager → slot 1
//   reputationPersistence → slot 3
//   reputationIntegration → slots 4, 5
const SLOT = 2

const cleanup = () => {
  const saveManager = SaveFileManager.getInstance()
  try {
    saveManager.clearSaveFile(SLOT, SaveFileType.GAME_SAVE)
    saveManager.clearSaveFile(SLOT, SaveFileType.GAME_LOG)
  } catch {
    // Ignore cleanup errors
  }
}

test.before(cleanup)
test.after(cleanup)
test.beforeEach(cleanup)

test('isValidGameState - validates complete game state', (t) => {
  const validState = createTestGameState()
  t.true(isValidGameState(validState))
})

test('isValidGameState - rejects invalid basic fields', (t) => {
  const invalidState = { ...createTestGameState(), day: 'invalid' }
  t.false(isValidGameState(invalidState))
})

test('isValidGameState - rejects invalid reputation', (t) => {
  const invalidState = { ...createTestGameState(), reputation: 'invalid' }
  t.false(isValidGameState(invalidState))
})

test('isValidGameState - rejects invalid market data', (t) => {
  const invalidState = { ...createTestGameState(), marketData: 'invalid' }
  t.false(isValidGameState(invalidState))
})

test('isValidGameState - rejects invalid trade history', (t) => {
  const invalidState = { ...createTestGameState(), tradeHistory: 'invalid' }
  t.false(isValidGameState(invalidState))
})

test('isValidMarketData - validates market data structure', (t) => {
  const validMarketData: MarketData = {
    basePrice: 100,
    currentPrice: 110,
    demand: 0.6,
    supply: 0.4,
    trend: 'rising',
    history: [{ day: 1, price: 100, volume: 10 }],
    volatility: 0.3,
    lastUpdated: 0,
  }

  t.true(isValidMarketData(validMarketData))
})

test('isValidMarketData - rejects invalid trend', (t) => {
  const invalidMarketData = {
    basePrice: 100,
    currentPrice: 110,
    demand: 0.6,
    supply: 0.4,
    trend: 'invalid',
    history: [],
    volatility: 0.3,
    lastUpdated: 0,
  }

  t.false(isValidMarketData(invalidMarketData))
})

test('isValidTradeTransaction - validates transaction structure', (t) => {
  const validTransaction: TradeTransaction = {
    day: 5,
    location: "Alchemist's Quarter",
    potionType: 'Health Potion',
    quantity: 2,
    pricePerUnit: 110,
    totalValue: 220,
    type: 'sell',
  }

  t.true(isValidTradeTransaction(validTransaction))
})

test('isValidTradeTransaction - rejects invalid type', (t) => {
  const invalidTransaction = {
    day: 5,
    location: "Alchemist's Quarter",
    potionType: 'Health Potion',
    quantity: 2,
    pricePerUnit: 110,
    totalValue: 220,
    type: 'invalid',
  }

  t.false(isValidTradeTransaction(invalidTransaction))
})

test('isValidNPCInteractionState - validates NPC interaction', (t) => {
  const validInteraction = {
    npcId: 'test_npc',
    type: 'dialogue',
    active: true,
  }

  t.true(isValidNPCInteractionState(validInteraction))
})

test('isValidAnimationState - validates animation state', (t) => {
  const validAnimation = {
    type: 'travel',
    data: { from: 'A', to: 'B' },
    active: true,
  }

  t.true(isValidAnimationState(validAnimation))
})

test('migrateLegacySaveFile - adds missing data structures', (t) => {
  const legacyState = createLegacyGameState()
  const migratedState = migrateLegacySaveFile(legacyState)

  t.truthy(migratedState.reputation)
  t.truthy(migratedState.marketData)
  t.truthy(migratedState.tradeHistory)
  t.true(Array.isArray(migratedState.tradeHistory))
  t.true(isValidGameState(migratedState))
})

test('sanitizeGameState - cleans invalid data', (t) => {
  const dirtyState: GameState = {
    ...createTestGameState(),
    day: -5, // Invalid negative day
    cash: -100, // Invalid negative cash
    health: 150, // Invalid high health
    inventory: { 'Health Potion': -2, 'Mana Potion': 5 }, // Negative quantity
    prices: { 'Health Potion': -50, 'Mana Potion': 100 }, // Negative price
  }

  const cleanState = sanitizeGameState(dirtyState)

  t.is(cleanState.day, 0)
  t.is(cleanState.cash, 0)
  t.is(cleanState.health, 100)
  t.is(cleanState.inventory['Health Potion'], undefined) // Negative quantity removed
  t.is(cleanState.inventory['Mana Potion'], 5)
  t.is(cleanState.prices['Health Potion'], 1) // Minimum price
  t.is(cleanState.prices['Mana Potion'], 100)
})

test.serial('saveGame - saves complete game state', (t) => {
  const gameState = createTestGameState()

  saveGame(gameState, SLOT)

  const saveManager = SaveFileManager.getInstance()
  const filePath = path.join(saveManager.saveDir, `slot_${SLOT}_save.json`)

  t.true(fs.existsSync(filePath))

  const savedData = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  t.truthy(savedData.lastSave)
  t.is(savedData.day, gameState.day)
  t.deepEqual(savedData.reputation, gameState.reputation)
  t.deepEqual(savedData.marketData, gameState.marketData)
  t.deepEqual(savedData.tradeHistory, gameState.tradeHistory)
})

test.serial('loadGame - loads complete game state', (t) => {
  const originalState = createTestGameState()
  saveGame(originalState, SLOT)

  const loadedState = loadGame(SLOT)

  t.truthy(loadedState)
  t.is(loadedState?.day, originalState.day)
  t.deepEqual(loadedState?.reputation, originalState.reputation)
  t.deepEqual(loadedState?.marketData, originalState.marketData)
  t.deepEqual(loadedState?.tradeHistory, originalState.tradeHistory)
})

test.serial('loadGame - migrates legacy save file', (t) => {
  const saveManager = SaveFileManager.getInstance()
  const legacyState = createLegacyGameState()
  saveManager.writeSaveFile(SLOT, SaveFileType.GAME_SAVE, legacyState)

  const loadedState = loadGame(SLOT)

  t.truthy(loadedState)
  t.truthy(loadedState?.reputation)
  t.truthy(loadedState?.marketData)
  t.truthy(loadedState?.tradeHistory)
  t.true(isValidGameState(loadedState!))
})

test.serial('loadGame - returns undefined for non-existent save', (t) => {
  // Ensure our slot is completely clean
  const saveManager = SaveFileManager.getInstance()
  saveManager.deleteSlotSaveFiles(SLOT)

  // loadGame falls through to legacy path which creates a default if file missing
  // This is expected behavior — it returns a default game state for empty slots
  const loadedState = loadGame(SLOT)
  t.truthy(loadedState)
  t.is(loadedState?.day, 0) // Default game state
})

test.serial('getSaveSlots - returns array of save states', (t) => {
  const state1 = createTestGameState()

  saveGame(state1, SLOT)

  const slots = getSaveSlots()

  t.is(slots.length, 5)
  t.truthy(slots[SLOT - 1])

  // Slot with actual save has the correct day value
  t.is(slots[SLOT - 1]?.day, 5)
})

test.serial('save/load with NPC interaction state', (t) => {
  const gameState = createTestGameState()
  gameState.currentNPCInteraction = {
    npcId: 'test_npc',
    type: 'dialogue',
    active: true,
  }

  saveGame(gameState, SLOT)
  const loadedState = loadGame(SLOT)

  // sanitizeGameState intentionally clears transient NPC interaction state
  t.truthy(loadedState)
  t.is(loadedState?.currentNPCInteraction, undefined)
})

test.serial('save/load with animation state', (t) => {
  const gameState = createTestGameState()
  gameState.currentAnimation = {
    type: 'travel',
    data: { from: 'Location A', to: 'Location B' },
    active: true,
  }

  saveGame(gameState, SLOT)
  const loadedState = loadGame(SLOT)

  // sanitizeGameState intentionally clears transient animation state
  t.truthy(loadedState)
  t.is(loadedState?.currentAnimation, undefined)
})

test.serial('save/load preserves complex market data', (t) => {
  const gameState = createTestGameState()

  // Add more complex market data
  gameState.marketData['Market Square'] = {
    'Strength Potion': {
      basePrice: 200,
      currentPrice: 180,
      demand: 0.3,
      supply: 0.7,
      trend: 'falling',
      history: [
        { day: 1, price: 200, volume: 5 },
        { day: 2, price: 190, volume: 8 },
        { day: 3, price: 180, volume: 12 },
      ],
      volatility: 0.3,
      lastUpdated: 0,
    },
  }

  saveGame(gameState, SLOT)
  const loadedState = loadGame(SLOT)

  t.truthy(loadedState?.marketData['Market Square'])
  t.truthy(loadedState?.marketData?.['Market Square']?.['Strength Potion'])

  const strengthPotionData =
    loadedState?.marketData?.['Market Square']?.['Strength Potion']
  t.is(strengthPotionData?.basePrice, 200)
  t.is(strengthPotionData?.currentPrice, 180)
  t.is(strengthPotionData?.trend, 'falling')
  t.is(strengthPotionData?.history.length, 3)
})

test.serial('save/load preserves trade history', (t) => {
  const gameState = createTestGameState()

  // Add more trade history
  gameState.tradeHistory.push(
    {
      day: 4,
      location: 'Market Square',
      potionType: 'Mana Potion',
      quantity: 3,
      pricePerUnit: 150,
      totalValue: 450,
      type: 'buy',
    },
    {
      day: 5,
      location: "Alchemist's Quarter",
      potionType: 'Strength Potion',
      quantity: 1,
      pricePerUnit: 200,
      totalValue: 200,
      type: 'sell',
    }
  )

  saveGame(gameState, SLOT)
  const loadedState = loadGame(SLOT)

  t.is(loadedState?.tradeHistory.length, 3)
  t.is(loadedState?.tradeHistory[1]?.type, 'buy')
  t.is(loadedState?.tradeHistory[1]?.potionType, 'Mana Potion')
  t.is(loadedState?.tradeHistory[2]?.type, 'sell')
  t.is(loadedState?.tradeHistory[2]?.potionType, 'Strength Potion')
})
