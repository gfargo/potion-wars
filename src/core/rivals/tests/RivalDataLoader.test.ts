import test from 'ava'
import { RivalDataLoader } from '../RivalDataLoader.js'
import { RivalAlchemistManager } from '../RivalAlchemist.js'

// All tests must be serial — both singletons (RivalDataLoader + RivalAlchemistManager)
// are shared mutable state that causes cross-test contamination when run concurrently.

function resetSingletons() {
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()
  manager.clearAllRivals()
  loader.reset()
}

test.serial('RivalDataLoader singleton pattern', (t) => {
  const loader1 = RivalDataLoader.getInstance()
  const loader2 = RivalDataLoader.getInstance()

  t.is(loader1, loader2, 'Should return the same instance')
})

test.serial('RivalDataLoader initial state', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()

  t.false(loader.isLoaded(), 'Should not be loaded initially')
})

test.serial('RivalDataLoader loads default rivals', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()

  loader.loadRivals()

  t.true(loader.isLoaded(), 'Should be marked as loaded')

  const allRivals = manager.getAllRivals()
  t.true(allRivals.length >= 6, 'Should load at least 6 default rivals')

  // Check for specific default rivals
  const marcusRival = manager.getRival('marcus_the_ruthless')
  t.truthy(marcusRival, 'Should load Marcus the Ruthless')
  t.is(marcusRival!.type, 'aggressive', 'Marcus should be aggressive type')
  t.true(
    marcusRival!.activeLocations.includes("Alchemist's Quarter"),
    "Marcus should be active in Alchemist's Quarter"
  )

  const elenaRival = manager.getRival('elena_shadowmix')
  t.truthy(elenaRival, 'Should load Elena Shadowmix')
  t.is(elenaRival!.type, 'cunning', 'Elena should be cunning type')

  const goldbeardRival = manager.getRival('goldbeard_trader')
  t.truthy(goldbeardRival, 'Should load Goldbeard the Trader')
  t.is(goldbeardRival!.type, 'merchant', 'Goldbeard should be merchant type')

  const vexRival = manager.getRival('vex_the_saboteur')
  t.truthy(vexRival, 'Should load Vex the Saboteur')
  t.is(vexRival!.type, 'saboteur', 'Vex should be saboteur type')

  const professorRival = manager.getRival('professor_blackwater')
  t.truthy(professorRival, 'Should load Professor Blackwater')
  t.is(professorRival!.type, 'cunning', 'Professor should be cunning type')

  const borisRival = manager.getRival('iron_fist_boris')
  t.truthy(borisRival, 'Should load Iron Fist Boris')
  t.is(borisRival!.type, 'aggressive', 'Boris should be aggressive type')
})

test.serial('RivalDataLoader prevents duplicate loading', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()

  loader.loadRivals()
  const firstLoadCount = manager.getAllRivals().length

  t.true(firstLoadCount >= 6, 'Should load at least 6 default rivals')

  loader.loadRivals() // Second load attempt — should be a no-op
  const secondLoadCount = manager.getAllRivals().length

  t.is(
    firstLoadCount,
    secondLoadCount,
    'Should not duplicate rivals on second load'
  )
})

test.serial('RivalDataLoader rival stats validation', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()

  loader.loadRivals()

  const allRivals = manager.getAllRivals()

  for (const rival of allRivals) {
    t.true(
      rival.strength >= 1 && rival.strength <= 10,
      `${rival.personality.name} strength should be 1-10`
    )
    t.true(
      rival.cunning >= 1 && rival.cunning <= 10,
      `${rival.personality.name} cunning should be 1-10`
    )
    t.true(
      rival.wealth >= 1 && rival.wealth <= 10,
      `${rival.personality.name} wealth should be 1-10`
    )

    t.truthy(rival.id, `${rival.personality.name} should have ID`)
    t.truthy(rival.personality.name, 'Rival should have name')
    t.truthy(
      rival.personality.description,
      `${rival.personality.name} should have description`
    )
    t.truthy(
      rival.personality.greeting,
      `${rival.personality.name} should have greeting`
    )
    t.truthy(
      rival.personality.victory,
      `${rival.personality.name} should have victory message`
    )
    t.truthy(
      rival.personality.defeat,
      `${rival.personality.name} should have defeat message`
    )

    t.true(
      rival.activeLocations.length > 0,
      `${rival.personality.name} should have active locations`
    )

    t.true(
      Array.isArray(rival.encounterHistory),
      `${rival.personality.name} should have encounter history array`
    )
    t.is(
      rival.encounterHistory.length,
      0,
      `${rival.personality.name} should start with empty encounter history`
    )
  }
})

test.serial('RivalDataLoader rival type distribution', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()

  loader.loadRivals()

  const allRivals = manager.getAllRivals()
  const typeCount = {
    aggressive: 0,
    cunning: 0,
    merchant: 0,
    saboteur: 0,
  }

  for (const rival of allRivals) {
    typeCount[rival.type]++
  }

  t.true(typeCount.aggressive > 0, 'Should have aggressive rivals')
  t.true(typeCount.cunning > 0, 'Should have cunning rivals')
  t.true(typeCount.merchant > 0, 'Should have merchant rivals')
  t.true(typeCount.saboteur > 0, 'Should have saboteur rivals')
})

test.serial('RivalDataLoader location coverage', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()

  loader.loadRivals()

  const allRivals = manager.getAllRivals()
  const locationCoverage = new Set<string>()

  for (const rival of allRivals) {
    for (const location of rival.activeLocations) {
      locationCoverage.add(location)
    }
  }

  const expectedLocations = [
    "Alchemist's Quarter",
    'Royal Castle',
    "Merchant's District",
    'Enchanted Forest',
  ]
  for (const location of expectedLocations) {
    t.true(locationCoverage.has(location), `Should have rivals in ${location}`)
  }
})

test.serial('RivalDataLoader getRivalsInLocation', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()

  loader.loadRivals()

  const alchemistQuarterRivals = loader.getRivalsInLocation(
    "Alchemist's Quarter"
  )
  t.true(
    alchemistQuarterRivals.length > 0,
    "Should find rivals in Alchemist's Quarter"
  )

  for (const rival of alchemistQuarterRivals) {
    t.true(
      rival.activeLocations.includes("Alchemist's Quarter"),
      "All returned rivals should be active in Alchemist's Quarter"
    )
  }

  const emptyLocationRivals = loader.getRivalsInLocation('Nonexistent Location')
  t.is(
    emptyLocationRivals.length,
    0,
    'Should return empty array for location with no rivals'
  )
})

test.serial('RivalDataLoader addCustomRival', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()

  loader.loadRivals()

  const customRival = {
    id: 'custom_test_rival',
    type: 'aggressive' as const,
    personality: {
      name: 'Custom Test Rival',
      description: 'A custom rival for testing',
      greeting: 'Custom greeting',
      victory: 'Custom victory',
      defeat: 'Custom defeat',
      threat: 'Custom threat',
      bribe: 'Custom bribe',
    },
    strength: 8,
    cunning: 6,
    wealth: 5,
    reputation: 25,
    activeLocations: ['Test Location'],
    encounterHistory: [],
  }

  loader.addCustomRival(customRival)

  const retrievedRival = manager.getRival('custom_test_rival')
  t.deepEqual(
    retrievedRival,
    customRival,
    'Should add and retrieve custom rival'
  )
})


test.serial('RivalDataLoader rival personality completeness', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()

  loader.loadRivals()

  const allRivals = manager.getAllRivals()

  for (const rival of allRivals) {
    const { personality } = rival

    t.true(
      personality.greeting.length > 0,
      `${rival.personality.name} should have non-empty greeting`
    )
    t.true(
      personality.victory.length > 0,
      `${rival.personality.name} should have non-empty victory message`
    )
    t.true(
      personality.defeat.length > 0,
      `${rival.personality.name} should have non-empty defeat message`
    )
    t.true(
      personality.threat.length > 0,
      `${rival.personality.name} should have non-empty threat message`
    )
    t.true(
      personality.bribe.length > 0,
      `${rival.personality.name} should have non-empty bribe message`
    )

    const messages = [
      personality.greeting,
      personality.victory,
      personality.defeat,
      personality.threat,
      personality.bribe,
    ]
    const uniqueMessages = new Set(messages)
    t.is(
      uniqueMessages.size,
      messages.length,
      `${rival.personality.name} should have unique personality messages`
    )
  }
})

test.serial('RivalDataLoader rival balance validation', (t) => {
  resetSingletons()
  const loader = RivalDataLoader.getInstance()
  const manager = RivalAlchemistManager.getInstance()

  loader.loadRivals()

  const allRivals = manager.getAllRivals()

  for (const rival of allRivals) {
    const totalStats = rival.strength + rival.cunning + rival.wealth
    const maxStat = Math.max(rival.strength, rival.cunning, rival.wealth)

    t.true(
      totalStats < 30,
      `${rival.personality.name} should not have maximum stats in all areas`
    )

    t.true(
      maxStat >= 6,
      `${rival.personality.name} should have at least one strong stat`
    )

    t.true(
      rival.reputation >= 0 && rival.reputation <= 100,
      `${rival.personality.name} reputation should be 0-100`
    )
  }
})
