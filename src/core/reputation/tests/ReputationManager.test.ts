import test from 'ava'
import { ReputationManager } from '../ReputationManager.js'
import { ReputationLevel } from '../../../types/reputation.types.js'
import { type GameState } from '../../../types/game.types.js'

// Helper function to create a minimal game state for testing
const createTestGameState = (reputation = ReputationManager.initializeReputation()): GameState => ({
  day: 1,
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: { name: 'Test Location', description: 'Test', dangerLevel: 1 },
  inventory: {},
  prices: {},
  weather: 'sunny',
  reputation,
  marketData: {},
  tradeHistory: []
})

test('calculatePriceModifier returns correct multipliers for different reputation levels', t => {
  // Test DESPISED level (< -50)
  t.is(ReputationManager.calculatePriceModifier(-75), 1.5)
  t.is(ReputationManager.calculatePriceModifier(-60), 1.5)
  
  // Test DISLIKED level (-50 to -20)
  t.is(ReputationManager.calculatePriceModifier(-50), 1.25)
  t.is(ReputationManager.calculatePriceModifier(-30), 1.25)
  
  // Test NEUTRAL level (-20 to 20)
  t.is(ReputationManager.calculatePriceModifier(-10), 1.0)
  t.is(ReputationManager.calculatePriceModifier(0), 1.0)
  t.is(ReputationManager.calculatePriceModifier(15), 1.0)
  
  // Test LIKED level (20 to 50)
  t.is(ReputationManager.calculatePriceModifier(25), 0.9)
  t.is(ReputationManager.calculatePriceModifier(45), 0.9)
  
  // Test RESPECTED level (50 to 80)
  t.is(ReputationManager.calculatePriceModifier(55), 0.8)
  t.is(ReputationManager.calculatePriceModifier(75), 0.8)
  
  // Test REVERED level (> 80)
  t.is(ReputationManager.calculatePriceModifier(85), 0.7)
  t.is(ReputationManager.calculatePriceModifier(100), 0.7)
})

test('getReputationLevel returns correct levels for different reputation values', t => {
  t.is(ReputationManager.getReputationLevel(-75), ReputationLevel.DESPISED)
  t.is(ReputationManager.getReputationLevel(-50), ReputationLevel.DISLIKED)
  t.is(ReputationManager.getReputationLevel(-30), ReputationLevel.DISLIKED)
  t.is(ReputationManager.getReputationLevel(-10), ReputationLevel.NEUTRAL)
  t.is(ReputationManager.getReputationLevel(0), ReputationLevel.NEUTRAL)
  t.is(ReputationManager.getReputationLevel(15), ReputationLevel.NEUTRAL)
  t.is(ReputationManager.getReputationLevel(25), ReputationLevel.LIKED)
  t.is(ReputationManager.getReputationLevel(45), ReputationLevel.LIKED)
  t.is(ReputationManager.getReputationLevel(55), ReputationLevel.RESPECTED)
  t.is(ReputationManager.getReputationLevel(75), ReputationLevel.RESPECTED)
  t.is(ReputationManager.getReputationLevel(85), ReputationLevel.REVERED)
  t.is(ReputationManager.getReputationLevel(100), ReputationLevel.REVERED)
})

test('getReputationModifier returns complete modifier objects', t => {
  const despisedModifier = ReputationManager.getReputationModifier(-75)
  t.is(despisedModifier.priceMultiplier, 1.5)
  t.is(despisedModifier.accessLevel, 0)
  t.is(despisedModifier.encounterProbability, -0.3)
  
  const neutralModifier = ReputationManager.getReputationModifier(0)
  t.is(neutralModifier.priceMultiplier, 1.0)
  t.is(neutralModifier.accessLevel, 2)
  t.is(neutralModifier.encounterProbability, 0)
  
  const reveredModifier = ReputationManager.getReputationModifier(90)
  t.is(reveredModifier.priceMultiplier, 0.7)
  t.is(reveredModifier.accessLevel, 5)
  t.is(reveredModifier.encounterProbability, 0.3)
})

test('applyReputationChange correctly updates global reputation', t => {
  const initialState = createTestGameState()
  
  const updatedState = ReputationManager.applyReputationChange(initialState, {
    global: 25
  })
  
  t.is(updatedState.reputation.global, 25)
  t.deepEqual(updatedState.reputation.locations, {})
  t.deepEqual(updatedState.reputation.npcRelationships, {})
})

test('applyReputationChange correctly updates location reputation', t => {
  const initialState = createTestGameState()
  
  const updatedState = ReputationManager.applyReputationChange(initialState, {
    location: 'Market Square',
    locationChange: 15
  })
  
  t.is(updatedState.reputation.global, 0)
  t.is(updatedState.reputation.locations['Market Square'], 15)
  t.deepEqual(updatedState.reputation.npcRelationships, {})
})

test('applyReputationChange correctly updates NPC reputation', t => {
  const initialState = createTestGameState()
  
  const updatedState = ReputationManager.applyReputationChange(initialState, {
    npc: 'merchant_aldric',
    npcChange: 10
  })
  
  t.is(updatedState.reputation.global, 0)
  t.deepEqual(updatedState.reputation.locations, {})
  t.is(updatedState.reputation.npcRelationships['merchant_aldric'], 10)
})

test('applyReputationChange can update multiple reputation types simultaneously', t => {
  const initialState = createTestGameState()
  
  const updatedState = ReputationManager.applyReputationChange(initialState, {
    global: 5,
    location: 'Market Square',
    locationChange: 20,
    npc: 'merchant_aldric',
    npcChange: 15
  })
  
  t.is(updatedState.reputation.global, 5)
  t.is(updatedState.reputation.locations['Market Square'], 20)
  t.is(updatedState.reputation.npcRelationships['merchant_aldric'], 15)
})

test('applyReputationChange clamps reputation values to bounds', t => {
  const initialState = createTestGameState({
    global: 95,
    locations: { 'Test Location': -95 },
    npcRelationships: {}
  })
  
  const updatedState = ReputationManager.applyReputationChange(initialState, {
    global: 20, // Should clamp to 100
    location: 'Test Location',
    locationChange: -20 // Should clamp to -100
  })
  
  t.is(updatedState.reputation.global, 100)
  t.is(updatedState.reputation.locations['Test Location'], -100)
})

test('getLocationReputation combines global and location reputation correctly', t => {
  const reputation = {
    global: 20,
    locations: { 'Market Square': 40 },
    npcRelationships: {}
  }
  
  // 40 * 0.6 + 20 * 0.4 = 24 + 8 = 32
  const locationRep = ReputationManager.getLocationReputation(reputation, 'Market Square')
  t.is(locationRep, 32)
  
  // Location not in record should use 0 for location-specific
  // 0 * 0.6 + 20 * 0.4 = 0 + 8 = 8
  const unknownLocationRep = ReputationManager.getLocationReputation(reputation, 'Unknown Location')
  t.is(unknownLocationRep, 8)
})

test('getNPCReputation combines location and NPC reputation correctly', t => {
  const reputation = {
    global: 10,
    locations: { 'Market Square': 30 },
    npcRelationships: { 'merchant_aldric': 50 }
  }
  
  // First calculate location reputation: 30 * 0.6 + 10 * 0.4 = 18 + 4 = 22
  // Then NPC reputation: 50 * 0.7 + 22 * 0.3 = 35 + 6.6 = 41.6 -> 42
  const npcRep = ReputationManager.getNPCReputation(reputation, 'merchant_aldric', 'Market Square')
  t.is(npcRep, 42)
  
  // NPC not in record should use 0 for NPC-specific
  // Location rep: 22, NPC rep: 0 * 0.7 + 22 * 0.3 = 0 + 6.6 = 6.6 -> 7
  const unknownNPCRep = ReputationManager.getNPCReputation(reputation, 'unknown_npc', 'Market Square')
  t.is(unknownNPCRep, 7)
})

test('calculateTradeReputationGain returns appropriate values', t => {
  // Small trade
  t.is(ReputationManager.calculateTradeReputationGain(50), 0)
  
  // Medium trade
  t.is(ReputationManager.calculateTradeReputationGain(250), 2)
  
  // Large trade
  t.is(ReputationManager.calculateTradeReputationGain(600), 5) // Capped at 5
  
  // NPC trade bonus
  t.is(ReputationManager.calculateTradeReputationGain(200, true), 3) // 2 * 1.5 = 3
  
  // Very large trade should still cap at 5 for regular, 7.5 -> 8 for NPC
  t.is(ReputationManager.calculateTradeReputationGain(1000), 5)
  t.is(ReputationManager.calculateTradeReputationGain(1000, true), 8) // 5 * 1.5 = 7.5 -> 8
})

test('calculateReputationLoss returns negative values based on severity', t => {
  // Test different severity levels
  for (let severity = 1; severity <= 5; severity++) {
    const loss = ReputationManager.calculateReputationLoss(severity)
    t.true(loss < 0, `Loss should be negative for severity ${severity}`)
    t.true(loss >= -(severity * 2 + severity), `Loss should be within expected range for severity ${severity}`)
    t.true(loss <= -(severity * 2), `Loss should be at least base amount for severity ${severity}`)
  }
  
  // Test clamping
  t.true(ReputationManager.calculateReputationLoss(0) <= -2) // Should clamp to severity 1
  t.true(ReputationManager.calculateReputationLoss(10) >= -15) // Should clamp to severity 5
})

test('meetsReputationRequirement correctly evaluates requirements', t => {
  t.true(ReputationManager.meetsReputationRequirement(50, 30))
  t.true(ReputationManager.meetsReputationRequirement(30, 30))
  t.false(ReputationManager.meetsReputationRequirement(20, 30))
  t.true(ReputationManager.meetsReputationRequirement(-10, -20))
  t.false(ReputationManager.meetsReputationRequirement(-30, -20))
})

test('getAccessLevel returns correct access levels', t => {
  t.is(ReputationManager.getAccessLevel(-75), 0) // DESPISED
  t.is(ReputationManager.getAccessLevel(-30), 1) // DISLIKED
  t.is(ReputationManager.getAccessLevel(0), 2)   // NEUTRAL
  t.is(ReputationManager.getAccessLevel(30), 3)  // LIKED
  t.is(ReputationManager.getAccessLevel(60), 4)  // RESPECTED
  t.is(ReputationManager.getAccessLevel(90), 5)  // REVERED
})

test('getEncounterProbabilityModifier returns correct modifiers', t => {
  t.is(ReputationManager.getEncounterProbabilityModifier(-75), -0.3) // DESPISED
  t.is(ReputationManager.getEncounterProbabilityModifier(-30), -0.15) // DISLIKED
  t.is(ReputationManager.getEncounterProbabilityModifier(0), 0)      // NEUTRAL
  t.is(ReputationManager.getEncounterProbabilityModifier(30), 0.1)   // LIKED
  t.is(ReputationManager.getEncounterProbabilityModifier(60), 0.2)   // RESPECTED
  t.is(ReputationManager.getEncounterProbabilityModifier(90), 0.3)   // REVERED
})

test('initializeReputation returns clean initial state', t => {
  const initialRep = ReputationManager.initializeReputation()
  
  t.is(initialRep.global, 0)
  t.deepEqual(initialRep.locations, {})
  t.deepEqual(initialRep.npcRelationships, {})
})

test('reputation changes preserve other game state properties', t => {
  const initialState = createTestGameState()
  initialState.cash = 500
  initialState.day = 15
  
  const updatedState = ReputationManager.applyReputationChange(initialState, {
    global: 10
  })
  
  // Reputation should change
  t.is(updatedState.reputation.global, 10)
  
  // Other properties should be preserved
  t.is(updatedState.cash, 500)
  t.is(updatedState.day, 15)
  t.is(updatedState.location.name, 'Test Location')
})

test('reputation calculations handle edge cases', t => {
  // Test boundary values
  t.is(ReputationManager.getReputationLevel(-50), ReputationLevel.DISLIKED)
  t.is(ReputationManager.getReputationLevel(-49), ReputationLevel.DISLIKED)
  t.is(ReputationManager.getReputationLevel(-20), ReputationLevel.NEUTRAL)
  t.is(ReputationManager.getReputationLevel(-19), ReputationLevel.NEUTRAL)
  t.is(ReputationManager.getReputationLevel(20), ReputationLevel.LIKED)
  t.is(ReputationManager.getReputationLevel(21), ReputationLevel.LIKED)
  
  // Test extreme values
  t.is(ReputationManager.getReputationLevel(-1000), ReputationLevel.DESPISED)
  t.is(ReputationManager.getReputationLevel(1000), ReputationLevel.REVERED)
})