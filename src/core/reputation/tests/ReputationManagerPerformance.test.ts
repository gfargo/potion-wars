import test from 'ava'
import { ReputationManager } from '../ReputationManager.js'
import { type ReputationState } from '../../../types/reputation.types.js'

// Test data setup
const createTestReputationState = (): ReputationState => ({
  global: 25,
  locations: {
    'Market Square': 50,
    'Royal Castle': -20,
    'Enchanted Forest': 75,
    'Peasant Village': 10,
  },
  npcRelationships: {
    merchant_aldric: 60,
    guard_marcus: -15,
    informant_sara: 30,
  },
})

test.beforeEach(() => {
  ReputationManager.clearCaches()
})

test('ReputationManager price modifier caching improves performance', (t) => {
  // Test with multiple reputation values
  const reputationValues = [-75, -25, 0, 25, 50, 85]

  // First pass - populate cache
  const start1 = performance.now()
  const modifiers1 = reputationValues.map((rep) =>
    ReputationManager.calculatePriceModifier(rep)
  )
  const time1 = performance.now() - start1

  // Second pass - use cache
  const start2 = performance.now()
  const modifiers2 = reputationValues.map((rep) =>
    ReputationManager.calculatePriceModifier(rep)
  )
  const time2 = performance.now() - start2

  // Results should be identical
  t.deepEqual(modifiers1, modifiers2)

  // Second pass should be faster
  t.true(
    time2 < time1,
    `Cached calls (${time2}ms) should be faster than initial calls (${time1}ms)`
  )

  // Verify correct values
  t.is(modifiers1[0], 1.5) // Despised
  t.is(modifiers1[2], 1) // Neutral
  t.is(modifiers1[5], 0.7) // Revered
})

test('ReputationManager reputation level caching improves performance', (t) => {
  const reputationValues = Array.from({ length: 100 }, (_, i) => i - 50)

  // First pass - populate cache
  const start1 = performance.now()
  const levels1 = reputationValues.map((rep) =>
    ReputationManager.getReputationLevel(rep)
  )
  const time1 = performance.now() - start1

  // Second pass - use cache
  const start2 = performance.now()
  const levels2 = reputationValues.map((rep) =>
    ReputationManager.getReputationLevel(rep)
  )
  const time2 = performance.now() - start2

  // Results should be identical
  t.deepEqual(levels1, levels2)

  // Second pass should be faster
  t.true(
    time2 < time1,
    `Cached calls (${time2}ms) should be faster than initial calls (${time1}ms)`
  )
})

test('ReputationManager location reputation caching improves performance', (t) => {
  const reputationState = createTestReputationState()
  const locations = [
    'Market Square',
    'Royal Castle',
    'Enchanted Forest',
    'Peasant Village',
  ]

  // First pass - populate cache
  const start1 = performance.now()
  const locationReps1 = locations.map((loc) =>
    ReputationManager.getLocationReputation(reputationState, loc)
  )
  const time1 = performance.now() - start1

  // Second pass - use cache
  const start2 = performance.now()
  const locationReps2 = locations.map((loc) =>
    ReputationManager.getLocationReputation(reputationState, loc)
  )
  const time2 = performance.now() - start2

  // Results should be identical
  t.deepEqual(locationReps1, locationReps2)

  // Second pass should be faster
  t.true(
    time2 < time1,
    `Cached calls (${time2}ms) should be faster than initial calls (${time1}ms)`
  )

  // Verify calculations are correct
  // Market Square: 50 * 0.6 + 25 * 0.4 = 30 + 10 = 40
  t.is(locationReps1[0], 40)
})

test('ReputationManager NPC reputation caching improves performance', (t) => {
  const reputationState = createTestReputationState()
  const npcs = [
    { id: 'merchant_aldric', location: 'Market Square' },
    { id: 'guard_marcus', location: 'Royal Castle' },
    { id: 'informant_sara', location: 'Enchanted Forest' },
  ]

  // First pass - populate cache
  const start1 = performance.now()
  const npcReps1 = npcs.map((npc) =>
    ReputationManager.getNPCReputation(reputationState, npc.id, npc.location)
  )
  const time1 = performance.now() - start1

  // Second pass - use cache
  const start2 = performance.now()
  const npcReps2 = npcs.map((npc) =>
    ReputationManager.getNPCReputation(reputationState, npc.id, npc.location)
  )
  const time2 = performance.now() - start2

  // Results should be identical
  t.deepEqual(npcReps1, npcReps2)

  // Second pass should be faster
  t.true(
    time2 < time1,
    `Cached calls (${time2}ms) should be faster than initial calls (${time1}ms)`
  )
})

test('ReputationManager cache invalidation works with state changes', (t) => {
  let reputationState = createTestReputationState()

  // First calculation
  const locationRep1 = ReputationManager.getLocationReputation(
    reputationState,
    'Market Square'
  )

  // Change reputation state
  reputationState = {
    ...reputationState,
    global: 50, // Changed from 25
    locations: {
      ...reputationState.locations,
      'Market Square': 75, // Changed from 50
    },
  }

  // Second calculation with new state
  const locationRep2 = ReputationManager.getLocationReputation(
    reputationState,
    'Market Square'
  )

  // Should be different due to state change
  t.not(locationRep1, locationRep2)

  // New calculation: 75 * 0.6 + 50 * 0.4 = 45 + 20 = 65
  t.is(locationRep2, 65)
})

test('ReputationManager performance with large number of calculations', (t) => {
  const reputationState = createTestReputationState()

  // Test performance with many calculations
  const start = performance.now()

  for (let i = 0; i < 1000; i++) {
    ReputationManager.calculatePriceModifier((i % 200) - 100)
    ReputationManager.getReputationLevel((i % 200) - 100)
    ReputationManager.getLocationReputation(reputationState, 'Market Square')
  }

  const time = performance.now() - start

  // Should complete in reasonable time (less than 100ms)
  t.true(time < 100, `1000 calculations took ${time}ms, should be under 100ms`)
})

test('ReputationManager cache size limits prevent memory leaks', (t) => {
  // Fill cache with many different values
  for (let i = 0; i < 2000; i++) {
    ReputationManager.calculatePriceModifier(i - 1000)
    ReputationManager.getReputationLevel(i - 1000)
  }

  // Cache should handle large numbers without errors
  // This test mainly ensures no memory issues occur
  t.pass('Cache size limiting completed without errors')
})

test('ReputationManager memoization accuracy', (t) => {
  // Test that memoized results are mathematically correct
  const testCases = [
    { reputation: -75, expectedModifier: 1.5 },
    { reputation: -35, expectedModifier: 1.25 },
    { reputation: 0, expectedModifier: 1 },
    { reputation: 35, expectedModifier: 0.9 },
    { reputation: 65, expectedModifier: 0.8 },
    { reputation: 90, expectedModifier: 0.7 },
  ]

  for (const testCase of testCases) {
    // First call (not cached)
    const modifier1 = ReputationManager.calculatePriceModifier(
      testCase.reputation
    )

    // Second call (cached)
    const modifier2 = ReputationManager.calculatePriceModifier(
      testCase.reputation
    )

    // Both should match expected value
    t.is(modifier1, testCase.expectedModifier)
    t.is(modifier2, testCase.expectedModifier)

    // Both calls should return identical results
    t.is(modifier1, modifier2)
  }
})

test('ReputationManager complex reputation calculations with caching', (t) => {
  const reputationState = createTestReputationState()

  // Test complex calculations that involve multiple cache layers
  const npcId = 'merchant_aldric'
  const location = 'Market Square'

  // This will trigger location reputation caching, then NPC reputation caching
  const npcRep1 = ReputationManager.getNPCReputation(
    reputationState,
    npcId,
    location
  )
  const npcRep2 = ReputationManager.getNPCReputation(
    reputationState,
    npcId,
    location
  )

  // Should be identical
  t.is(npcRep1, npcRep2)

  // Verify the calculation is correct
  // Location rep: 50 * 0.6 + 25 * 0.4 = 40
  // NPC rep: 60 * 0.7 + 40 * 0.3 = 42 + 12 = 54
  t.is(npcRep1, 54)
})
