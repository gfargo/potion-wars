import test from 'ava'
import { ReputationManager } from '../../reputation/ReputationManager.js'
import { createGameState } from '../../state/tests/utils/testHelper.js'
import { saveGame, loadGame } from '../saveLoad.js'
import { SaveFileManager, SaveFileType } from '../utils.js'

// Helper to clean up test files
const cleanup = () => {
  const manager = SaveFileManager.getInstance()
  for (let slot = 1; slot <= 3; slot++) {
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

test('full reputation persistence workflow', (t) => {
  // Create a game state with some reputation changes
  let gameState = createGameState({
    cash: 5000,
    location: { name: 'Market Square', description: 'A busy marketplace', dangerLevel: 2 }
  })

  // Apply some reputation changes using ReputationManager
  gameState = ReputationManager.applyReputationChange(gameState, {
    global: 10,
    location: 'Market Square',
    locationChange: 15,
    npc: 'merchant_aldric',
    npcChange: 20,
    reason: 'Successful trade'
  })

  gameState = ReputationManager.applyReputationChange(gameState, {
    location: 'Royal District',
    locationChange: -5,
    reason: 'Minor incident'
  })

  // Save the game
  saveGame(gameState, 1)

  // Load the game
  const loadedState = loadGame(1)

  t.truthy(loadedState)
  
  // Verify all reputation data was preserved
  t.is(loadedState!.reputation.global, 10)
  t.is(loadedState!.reputation.locations['Market Square'], 15)
  t.is(loadedState!.reputation.locations['Royal District'], -5)
  t.is(loadedState!.reputation.npcRelationships['merchant_aldric'], 20)

  // Verify ReputationManager functions work with loaded data
  const locationReputation = ReputationManager.getLocationReputation(loadedState!.reputation, 'Market Square')
  t.is(locationReputation, 13) // Should be weighted: location(15) * 0.6 + global(10) * 0.4 = 9 + 4 = 13
  
  const priceModifier = ReputationManager.calculatePriceModifier(locationReputation)
  t.true(priceModifier <= 1.0) // Should get a discount or neutral due to positive reputation

  const reputationLevel = ReputationManager.getReputationLevel(loadedState!.reputation.global)
  t.truthy(reputationLevel) // Should return a valid reputation level

  // Test that extreme values get sanitized
  gameState = ReputationManager.applyReputationChange(loadedState!, {
    global: 200, // This should be clamped to 100
    location: 'Market Square',
    locationChange: -300 // This should be clamped to make total not exceed -100
  })

  saveGame(gameState, 2)
  const sanitizedState = loadGame(2)

  t.truthy(sanitizedState)
  t.true(sanitizedState!.reputation.global <= 100)
  t.true(sanitizedState!.reputation.global >= -100)
  
  const marketSquareRep = sanitizedState!.reputation.locations['Market Square']
  if (marketSquareRep !== undefined) {
    t.true(marketSquareRep <= 100)
    t.true(marketSquareRep >= -100)
  }
})

test('reputation data survives multiple save/load cycles', (t) => {
  let gameState = createGameState()

  // Perform multiple reputation changes and save/load cycles
  for (let i = 0; i < 5; i++) {
    gameState = ReputationManager.applyReputationChange(gameState, {
      global: 2,
      location: `Location${i}`,
      locationChange: i * 3,
      npc: `npc_${i}`,
      npcChange: i * 2,
      reason: `Action ${i}`
    })

    saveGame(gameState, 1)
    const reloadedState = loadGame(1)
    t.truthy(reloadedState)
    gameState = reloadedState!
  }

  // Verify final state has accumulated all changes
  t.is(gameState.reputation.global, 10) // 2 * 5 = 10
  t.is(gameState.reputation.locations['Location0'], 0) // 0 * 3 = 0
  t.is(gameState.reputation.locations['Location4'], 12) // 4 * 3 = 12
  t.is(gameState.reputation.npcRelationships['npc_0'], 0) // 0 * 2 = 0
  t.is(gameState.reputation.npcRelationships['npc_4'], 8) // 4 * 2 = 8
})

test('reputation persistence handles concurrent location and NPC changes', (t) => {
  let gameState = createGameState()

  // Apply complex reputation changes
  gameState = ReputationManager.applyReputationChange(gameState, {
    global: 5,
    location: 'Market Square',
    locationChange: 10,
    npc: 'merchant_aldric',
    npcChange: 15,
    reason: 'Excellent trade'
  })

  gameState = ReputationManager.applyReputationChange(gameState, {
    location: 'Market Square',
    locationChange: 5, // Should accumulate with previous
    npc: 'merchant_aldric',
    npcChange: -3, // Should accumulate with previous
    reason: 'Minor disagreement'
  })

  saveGame(gameState, 1)
  const loadedState = loadGame(1)

  t.truthy(loadedState)
  t.is(loadedState!.reputation.global, 5)
  t.is(loadedState!.reputation.locations['Market Square'], 15) // 10 + 5
  t.is(loadedState!.reputation.npcRelationships['merchant_aldric'], 12) // 15 - 3
})