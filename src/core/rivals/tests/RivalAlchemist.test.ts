import test from 'ava'
import {
  RivalAlchemistManager,
  type RivalAlchemist,
  type RivalEncounterContext,
} from '../RivalAlchemist.js'
import { type GameState } from '../../../types/game.types.js'

// Test helper to create a mock game state
function createMockGameState(): GameState {
  return {
    day: 10,
    cash: 1000,
    health: 100,
    strength: 5,
    agility: 5,
    intelligence: 5,
    inventory: {
      'Healing Potion': 5,
      'Strength Potion': 3,
    },
    debt: 0,
    location: {
      name: "Alchemist's Quarter",
      description: 'A bustling area filled with potion shops',
      dangerLevel: 7,
    },
    weather: 'sunny',
    reputation: {
      global: 25,
      locations: {
        "Alchemist's Quarter": 30,
        'Royal Castle': 10,
      },
      npcRelationships: {},
    },
    marketData: {},
    tradeHistory: [],
    prices: {},
  }
}

// Test helper to create a mock rival
function createMockRival(): RivalAlchemist {
  return {
    id: 'test_rival',
    type: 'aggressive',
    personality: {
      name: 'Test Rival',
      description: 'A test rival',
      greeting: 'Hello test',
      victory: 'I win!',
      defeat: 'You win!',
      threat: 'Watch out!',
      bribe: 'Take my money!',
    },
    strength: 7,
    cunning: 5,
    wealth: 6,
    reputation: 20,
    activeLocations: ["Alchemist's Quarter", 'Royal Castle'],
    encounterHistory: [],
  }
}

test('RivalAlchemistManager singleton pattern', (t) => {
  const manager1 = RivalAlchemistManager.getInstance()
  const manager2 = RivalAlchemistManager.getInstance()

  t.is(manager1, manager2, 'Should return the same instance')
})

test('RivalAlchemistManager rival registration and retrieval', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()

  manager.registerRival(rival)

  const retrieved = manager.getRival('test_rival')
  t.deepEqual(retrieved, rival, 'Should retrieve the registered rival')

  const notFound = manager.getRival('nonexistent')
  t.is(notFound, undefined, 'Should return undefined for non-existent rival')
})

test('RivalAlchemistManager getAllRivals', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival1 = createMockRival()
  const rival2 = {
    ...createMockRival(),
    id: 'test_rival_2',
    personality: { ...createMockRival().personality, name: 'Test Rival 2' },
  }

  manager.registerRival(rival1)
  manager.registerRival(rival2)

  const allRivals = manager.getAllRivals()
  t.true(allRivals.length >= 2, 'Should return all registered rivals')
  t.true(
    allRivals.some((r) => r.id === 'test_rival'),
    'Should include first rival'
  )
  t.true(
    allRivals.some((r) => r.id === 'test_rival_2'),
    'Should include second rival'
  )
})

test('RivalAlchemistManager encounter probability calculation', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  const gameState = createMockGameState()

  manager.registerRival(rival)

  // Test multiple rolls to check probability distribution
  let encounterCount = 0
  const trials = 1000

  for (let i = 0; i < trials; i++) {
    const encounter = manager.rollForRivalEncounter(
      "Alchemist's Quarter",
      gameState
    )
    if (encounter) {
      encounterCount++
    }
  }

  const encounterRate = encounterCount / trials
  t.true(encounterRate > 0.05, 'Should have some encounters')
  t.true(encounterRate < 0.5, 'Should not encounter too frequently')
})

test('RivalAlchemistManager no encounter in location without rivals', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const gameState = createMockGameState()

  const encounter = manager.rollForRivalEncounter('Empty Location', gameState)
  t.is(
    encounter,
    undefined,
    'Should not encounter rivals in locations where none are active'
  )
})

test('RivalAlchemistManager encounter cooldown', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  const gameState = createMockGameState()

  // Set recent encounter
  rival.lastEncounter = gameState.day - 1
  manager.registerRival(rival)

  // Should not encounter due to cooldown
  let encounterCount = 0
  for (let i = 0; i < 100; i++) {
    const encounter = manager.rollForRivalEncounter(
      "Alchemist's Quarter",
      gameState
    )
    if (encounter?.id === 'test_rival') {
      encounterCount++
    }
  }

  t.is(encounterCount, 0, 'Should not encounter rival during cooldown period')
})

test('RivalAlchemistManager price war resolution - player wins', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  const context: RivalEncounterContext = {
    rival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 30,
    marketConditions: {},
  }

  // Mock Math.random to ensure player wins
  const originalRandom = Math.random
  Math.random = () => 0.8 // High value favors player

  const outcome = manager.resolveEncounter(context, 'price_war')

  Math.random = originalRandom

  t.true(outcome.success, 'Player should win the price war')
  t.true(outcome.reputationChange.locationChange! > 0, 'Should gain reputation')
  t.true(outcome.cashChange < 0, 'Should cost money to engage in price war')
  t.true(outcome.marketImpact!.length > 0, 'Should have market impact')
  t.true(
    outcome.message.includes(rival.personality.name),
    'Message should mention rival name'
  )
})

test('RivalAlchemistManager price war resolution - player loses', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  rival.wealth = 9 // High wealth rival
  const context: RivalEncounterContext = {
    rival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 30,
    marketConditions: {},
  }

  // Mock Math.random to ensure player loses
  const originalRandom = Math.random
  Math.random = () => 0.2 // Low value favors rival

  const outcome = manager.resolveEncounter(context, 'price_war')

  Math.random = originalRandom

  t.false(outcome.success, 'Player should lose the price war')
  t.true(outcome.reputationChange.locationChange! < 0, 'Should lose reputation')
  t.true(outcome.cashChange < 0, 'Should lose money')
  t.true(outcome.marketImpact!.length > 0, 'Should have market impact')
})

test('RivalAlchemistManager sabotage resolution - player detects', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  rival.cunning = 3 // Low cunning rival
  const context: RivalEncounterContext = {
    rival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 30,
    marketConditions: {},
  }

  // Mock Math.random to ensure detection
  const originalRandom = Math.random
  Math.random = () => 0.8 // High awareness

  const outcome = manager.resolveEncounter(context, 'sabotage')

  Math.random = originalRandom

  t.true(outcome.success, 'Player should detect sabotage')
  t.true(outcome.reputationChange.locationChange! > 0, 'Should gain reputation')
  t.is(outcome.cashChange, 0, 'Should not lose cash when detecting sabotage')
  t.true(
    outcome.message.includes('caught'),
    'Message should indicate detection'
  )
})

test('RivalAlchemistManager sabotage resolution - player fails to detect', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  rival.cunning = 9 // High cunning rival
  const context: RivalEncounterContext = {
    rival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 30,
    marketConditions: {},
  }

  // Mock Math.random to ensure failure to detect
  const originalRandom = Math.random
  Math.random = () => 0.1 // Low awareness

  const outcome = manager.resolveEncounter(context, 'sabotage')

  Math.random = originalRandom

  t.false(outcome.success, 'Player should fail to detect sabotage')
  t.true(outcome.reputationChange.locationChange! < 0, 'Should lose reputation')
  t.true(outcome.inventoryChange !== undefined, 'Should lose inventory items')
  t.true(
    outcome.message.includes('sabotaged'),
    'Message should indicate sabotage success'
  )
})

test('RivalAlchemistManager theft resolution - player defends', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  rival.strength = 3 // Low strength rival
  const context: RivalEncounterContext = {
    rival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 30,
    marketConditions: {},
  }

  // Mock Math.random to ensure successful defense
  const originalRandom = Math.random
  Math.random = () => 0.8 // High defense

  const outcome = manager.resolveEncounter(context, 'theft')

  Math.random = originalRandom

  t.true(outcome.success, 'Player should defend against theft')
  t.true(outcome.reputationChange.locationChange! > 0, 'Should gain reputation')
  t.true(outcome.cashChange > 0, 'Should receive reward')
  t.true(
    outcome.message.includes('caught'),
    'Message should indicate catching thief'
  )
})

test('RivalAlchemistManager theft resolution - player fails to defend', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  rival.strength = 9 // High strength rival
  const context: RivalEncounterContext = {
    rival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 30,
    marketConditions: {},
  }

  // Mock Math.random to ensure failed defense
  const originalRandom = Math.random
  Math.random = () => 0.2 // Low defense

  const outcome = manager.resolveEncounter(context, 'theft')

  Math.random = originalRandom

  t.false(outcome.success, 'Player should fail to defend against theft')
  t.true(outcome.reputationChange.locationChange! < 0, 'Should lose reputation')
  t.true(outcome.cashChange < 0, 'Should lose money')
  t.true(outcome.message.includes('stole'), 'Message should indicate theft')
})

test('RivalAlchemistManager competition resolution', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  const context: RivalEncounterContext = {
    rival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 50, // High reputation
    marketConditions: {},
  }

  const outcome = manager.resolveEncounter(context, 'competition')

  t.true(typeof outcome.success === 'boolean', 'Should have success result')
  t.true(
    typeof outcome.reputationChange.locationChange === 'number',
    'Should have reputation change'
  )
  t.true(typeof outcome.cashChange === 'number', 'Should have cash change')
  t.true(outcome.message.length > 0, 'Should have message')

  if (outcome.success) {
    t.true(
      outcome.reputationChange.locationChange! > 0,
      'Winning should increase reputation'
    )
    t.true(outcome.cashChange > 0, 'Winning should provide cash reward')
  } else {
    t.true(
      outcome.reputationChange.locationChange! < 0,
      'Losing should decrease reputation'
    )
    t.true(outcome.cashChange < 0, 'Losing should cost cash')
  }
})

test('RivalAlchemistManager negotiation resolution with different choices', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const merchantRival = { ...createMockRival(), type: 'merchant' as const }
  const context: RivalEncounterContext = {
    rival: merchantRival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 30,
    marketConditions: {},
  }

  // Test bribe with merchant (should have high success rate)
  const originalRandom = Math.random
  Math.random = () => 0.5 // Should succeed with merchant bribe

  const brideOutcome = manager.resolveEncounter(context, 'negotiation', 'bribe')

  Math.random = originalRandom

  t.true(brideOutcome.success, 'Bribe should succeed with merchant rival')
  t.true(brideOutcome.cashChange < 0, 'Bribe should cost money')
  t.true(brideOutcome.message.includes('bribe'), 'Message should mention bribe')
})

test('RivalAlchemistManager market impact calculation', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()

  const impacts = manager.calculateMarketImpact(
    rival,
    "Alchemist's Quarter",
    10
  )

  t.true(impacts.length > 0, 'Should generate market impacts')
  t.true(
    impacts.every((impact) => impact.type === 'rival'),
    'All impacts should be rival type'
  )
  t.true(
    impacts.every((impact) => impact.location === "Alchemist's Quarter"),
    'All impacts should be for correct location'
  )
  t.true(
    impacts.every((impact) => impact.startDay === 10),
    'All impacts should start on correct day'
  )
})

test('RivalAlchemistManager update rival after encounter', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  manager.registerRival(rival)

  const originalReputation = rival.reputation

  const encounterRecord = {
    day: 15,
    location: "Alchemist's Quarter",
    type: 'competition' as const,
    outcome: 'player_win' as const,
    impact: 'Player won competition',
  }

  manager.updateRivalAfterEncounter('test_rival', encounterRecord)

  const updatedRival = manager.getRival('test_rival')
  t.is(updatedRival!.lastEncounter, 15, 'Should update last encounter day')
  t.is(
    updatedRival!.encounterHistory.length,
    1,
    'Should add encounter to history'
  )
  t.deepEqual(
    updatedRival!.encounterHistory[0],
    encounterRecord,
    'Should store encounter record'
  )
  t.true(
    updatedRival!.reputation < originalReputation,
    'Rival reputation should decrease after losing'
  )
})

test('RivalAlchemistManager determine encounter type based on rival type', (t) => {
  const manager = RivalAlchemistManager.getInstance()

  const aggressiveRival = { ...createMockRival(), type: 'aggressive' as const }

  const context: RivalEncounterContext = {
    rival: aggressiveRival,
    location: "Alchemist's Quarter",
    day: 10,
    playerReputation: 30,
    marketConditions: {},
  }

  // Test multiple determinations to check variety
  const encounterTypes = new Set<string>()
  for (let i = 0; i < 50; i++) {
    const type = manager.determineEncounterType(aggressiveRival, context)
    encounterTypes.add(type)
  }

  t.true(encounterTypes.size > 1, 'Should generate variety of encounter types')
  t.true(
    encounterTypes.has('competition'),
    'Should include base encounter types'
  )
})

test('RivalAlchemistManager encounter history limit', (t) => {
  const manager = RivalAlchemistManager.getInstance()
  const rival = createMockRival()
  manager.registerRival(rival)

  // Add more than 20 encounters
  for (let i = 0; i < 25; i++) {
    const encounterRecord = {
      day: i,
      location: "Alchemist's Quarter",
      type: 'competition' as const,
      outcome: 'player_win' as const,
      impact: `Encounter ${i}`,
    }
    manager.updateRivalAfterEncounter('test_rival', encounterRecord)
  }

  const updatedRival = manager.getRival('test_rival')
  t.is(
    updatedRival!.encounterHistory.length,
    20,
    'Should limit encounter history to 20 entries'
  )
  t.is(
    updatedRival!.encounterHistory[0]!.day,
    5,
    'Should keep most recent encounters'
  )
  t.is(
    updatedRival!.encounterHistory[19]!.day,
    24,
    'Should keep latest encounter'
  )
})
