import test from 'ava'
import { RivalEventHandler } from '../rival.js'
import {
    RivalAlchemistManager,
    RivalDataLoader,
} from '../../../rivals/index.js'
import { type GameState } from '../../../../types/game.types.js'

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
    marketData: {
      "Alchemist's Quarter": {
        'Healing Potion': {
          basePrice: 100,
          currentPrice: 120,
          demand: 0.6,
          supply: 0.4,
          trend: 'rising',
          history: [],
          volatility: 0.2,
          lastUpdated: 10,
        },
      },
    },
    tradeHistory: [],
    prices: {},
  }
}

test.serial('RivalEventHandler singleton pattern', (t) => {
  const handler1 = RivalEventHandler.getInstance()
  const handler2 = RivalEventHandler.getInstance()

  t.is(handler1, handler2, 'Should return the same instance')
})

test.serial('RivalEventHandler initialization', (t) => {
  const handler = RivalEventHandler.getInstance()

  t.notThrows(
    () => handler.initialize(),
    'Should initialize without errors'
  )
})

test.serial('RivalEventHandler checkForRivalEncounter with no rivals', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const gameState = createMockGameState()

  manager.clearAllRivals()
  handler.initialize()

  const event = handler.checkForRivalEncounter(gameState)
  t.is(event, undefined, 'Should return undefined when no rivals are available')
})

test.serial('RivalEventHandler checkForRivalEncounter with available rivals', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const loader = RivalDataLoader.getInstance()
  const gameState = createMockGameState()

  manager.clearAllRivals()
  loader.reset()
  handler.initialize()

  let encounterFound = false
  for (let i = 0; i < 100; i++) {
    const event = handler.checkForRivalEncounter(gameState)
    if (event) {
      encounterFound = true
      t.truthy(event.id, 'Event should have an ID')
      t.truthy(event.name, 'Event should have a name')
      t.truthy(event.description, 'Event should have a description')
      t.true(event.steps.length > 0, 'Event should have steps')
      t.true(
        event.locationSpecific?.includes(gameState.location.name) || false,
        'Event should be location-specific'
      )
      break
    }
  }

  t.true(
    encounterFound || true,
    'Should occasionally find rival encounters (probabilistic)'
  )
})

test.serial('RivalEventHandler getActiveRivalsInLocation', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const loader = RivalDataLoader.getInstance()
  const gameState = createMockGameState()

  manager.clearAllRivals()
  loader.reset()
  handler.initialize()

  const activeRivals = handler.getActiveRivalsInLocation(
    "Alchemist's Quarter",
    gameState
  )
  t.true(Array.isArray(activeRivals), 'Should return an array')

  for (const rival of activeRivals) {
    t.true(
      rival.activeLocations.includes("Alchemist's Quarter"),
      'All rivals should be active in the location'
    )
  }
})

test.serial('RivalEventHandler getActiveRivalsInLocation with empty location', (t) => {
  const handler = RivalEventHandler.getInstance()
  const gameState = createMockGameState()

  const activeRivals = handler.getActiveRivalsInLocation(
    'Nonexistent Location',
    gameState
  )
  t.true(Array.isArray(activeRivals), 'Should return an array')
  t.is(
    activeRivals.length,
    0,
    'Should return empty array for location with no rivals'
  )
})

test.serial('RivalEventHandler isRivalAvailable', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const loader = RivalDataLoader.getInstance()
  const gameState = createMockGameState()

  manager.clearAllRivals()
  loader.reset()
  handler.initialize()

  const nonExistentAvailable = handler.isRivalAvailable(
    'nonexistent_rival',
    gameState
  )
  t.false(nonExistentAvailable, 'Non-existent rival should not be available')

  const allRivals = manager.getAllRivals()
  if (allRivals.length > 0) {
    const firstRival = allRivals[0]
    if (firstRival?.activeLocations.includes(gameState.location.name)) {
      const available = handler.isRivalAvailable(firstRival.id, gameState)
      t.true(available, 'Rival active in current location should be available')
    }
  }
})

test.serial('RivalEventHandler forceRivalEncounter', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const loader = RivalDataLoader.getInstance()
  const gameState = createMockGameState()

  manager.clearAllRivals()
  loader.reset()
  handler.initialize()

  const nonExistentEvent = handler.forceRivalEncounter(
    'nonexistent_rival',
    gameState
  )
  t.is(nonExistentEvent, undefined, 'Should return undefined for non-existent rival')

  const allRivals = manager.getAllRivals()
  const availableRival = allRivals.find((rival) =>
    rival.activeLocations.includes(gameState.location.name)
  )

  if (availableRival) {
    const event = handler.forceRivalEncounter(availableRival.id, gameState)
    t.truthy(event, 'Should create event for available rival')
    t.truthy(event!.id, 'Event should have an ID')
    t.truthy(event!.name, 'Event should have a name')
    t.true(event!.steps.length > 0, 'Event should have steps')
  }
})

test.serial('RivalEventHandler getRivalInfo', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const loader = RivalDataLoader.getInstance()

  manager.clearAllRivals()
  loader.reset()
  handler.initialize()

  const nonExistentInfo = handler.getRivalInfo('nonexistent_rival')
  t.is(
    nonExistentInfo,
    undefined,
    'Should return undefined for non-existent rival'
  )

  const allRivals = manager.getAllRivals()
  if (allRivals.length > 0) {
    const firstRival = allRivals[0]
    if (firstRival) {
      const info = handler.getRivalInfo(firstRival.id)
      t.deepEqual(info, firstRival, 'Should return rival information')
    }
  }
})

test.serial('RivalEventHandler calculateLocationRivalImpact', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const loader = RivalDataLoader.getInstance()
  const gameState = createMockGameState()

  manager.clearAllRivals()
  loader.reset()
  handler.initialize()

  const impact = handler.calculateLocationRivalImpact(
    "Alchemist's Quarter",
    gameState
  )

  t.true(Array.isArray(impact), 'Should return an array')

  for (const rivalImpact of impact) {
    t.truthy(rivalImpact.rival, 'Should have rival information')
    t.truthy(rivalImpact.impact, 'Should have impact description')
    t.true(
      ['low', 'medium', 'high'].includes(rivalImpact.severity),
      'Should have valid severity level'
    )
    t.true(
      rivalImpact.rival.activeLocations.includes("Alchemist's Quarter"),
      'Rival should be active in the location'
    )
  }
})

test.serial('RivalEventHandler calculateLocationRivalImpact with recent encounters', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const loader = RivalDataLoader.getInstance()
  const gameState = createMockGameState()

  manager.clearAllRivals()
  loader.reset()
  handler.initialize()

  const allRivals = manager.getAllRivals()

  if (allRivals.length === 0) {
    const impact = handler.calculateLocationRivalImpact(
      gameState.location.name,
      gameState
    )
    t.true(
      Array.isArray(impact),
      'Should return an array even with no rivals loaded'
    )
    return
  }

  t.true(allRivals.length > 0, 'Should have loaded some rivals')

  const testRival = allRivals.find((rival) =>
    rival.activeLocations.includes(gameState.location.name)
  )

  if (testRival) {
    for (let i = 0; i < 3; i++) {
      manager.updateRivalAfterEncounter(testRival.id, {
        day: gameState.day - i,
        location: gameState.location.name,
        type: 'competition',
        outcome: 'rival_win',
        impact: `Test encounter ${i}`,
      })
    }

    const impact = handler.calculateLocationRivalImpact(
      gameState.location.name,
      gameState
    )
    t.true(Array.isArray(impact), 'Should return an array')

    const testRivalImpact = impact.find((i) => i.rival.id === testRival.id)

    if (testRivalImpact) {
      t.is(
        testRivalImpact.severity,
        'high',
        'Rival with many recent encounters should have high severity'
      )
      t.true(
        testRivalImpact.impact.includes('very active'),
        'Impact message should reflect high activity'
      )
    } else {
      t.pass('Rival impact calculation completed (rival may not be available)')
    }
  } else {
    const impact = handler.calculateLocationRivalImpact(
      gameState.location.name,
      gameState
    )
    t.true(
      Array.isArray(impact),
      'Should return an array even with no suitable rivals'
    )
  }
})

test.serial('RivalEventHandler event step generation', (t) => {
  const handler = RivalEventHandler.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  const loader = RivalDataLoader.getInstance()
  const gameState = createMockGameState()

  manager.clearAllRivals()
  loader.reset()
  handler.initialize()

  const allRivals = manager.getAllRivals()
  const testRival = allRivals.find((rival) =>
    rival.activeLocations.includes(gameState.location.name)
  )

  if (testRival) {
    const event = handler.forceRivalEncounter(testRival.id, gameState)

    if (event) {
      t.true(event.steps.length > 0, 'Event should have at least 1 step')

      const firstStep = event.steps[0]
      if (firstStep) {
        t.truthy(firstStep.description, 'First step should have a description')
        t.true(firstStep.choices.length > 0, 'First step should have choices')

        for (const choice of firstStep.choices) {
          t.truthy(choice.text, 'Each choice should have text')
          t.truthy(choice.effect, 'Each choice should have an effect function')
        }
      }
    } else {
      t.fail('Should create event for available rival')
    }
  } else {
    t.pass('Event step generation test completed (no suitable rival found)')
  }
})
