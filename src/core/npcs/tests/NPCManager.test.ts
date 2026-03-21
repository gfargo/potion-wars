import test from 'ava'
import { NPCManager, NPCError } from '../NPCManager.js'
import { type NPC } from '../../../types/npc.types.js'
import { type GameState } from '../../../types/game.types.js'

// Test data
const mockNPC: NPC = {
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A test merchant for unit testing',
  personality: {
    greeting: 'Hello there!',
    farewell: 'Goodbye!',
    tradeAccept: 'Deal!',
    tradeDecline: 'No deal.',
    lowReputation: "I don't trust you.",
    highReputation: 'My valued customer!',
  },
  location: "Merchant's District",
  availability: {
    probability: 0.5,
    timeRestriction: [1, 20],
    reputationGate: 0,
  },
  reputation: {
    minimum: 0,
  },
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Hello!',
        choices: [],
      },
    },
  },
}

const mockGameState: GameState = {
  day: 10,
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: {
    name: "Merchant's District",
    description: 'A busy marketplace',
    dangerLevel: 3,
  },
  inventory: {},
  prices: {},
  weather: 'sunny',
  reputation: {
    global: 10,
    locations: { "Merchant's District": 5 },
    npcRelationships: {},
  },
  marketData: {},
  tradeHistory: [],
}

// Helper to clean up NPCs and caches
const cleanup = () => {
  const manager = NPCManager.getInstance()
  manager.clearNPCs()
  manager.clearCaches()
}

test.beforeEach(cleanup)
test.afterEach(cleanup)

test.serial('NPCManager is a singleton', (t) => {
  const instance1 = NPCManager.getInstance()
  const instance2 = NPCManager.getInstance()

  t.is(instance1, instance2)
})

test.serial('registerNPC adds NPC to the system', (t) => {
  const manager = NPCManager.getInstance()

  manager.registerNPC(mockNPC)

  t.is(manager.getNPCCount(), 1)
  t.deepEqual(manager.getNPC('test_merchant'), mockNPC)
})

test.serial('registerNPC throws error for invalid NPC data', (t) => {
  const manager = NPCManager.getInstance()
  const invalidNPC = { ...mockNPC, id: '' }

  const error = t.throws(
    () => {
      manager.registerNPC(invalidNPC as NPC)
    },
    { instanceOf: NPCError }
  )

  t.is(error?.code, 'INVALID_NPC_DATA')
})

test.serial('getNPC returns undefined for non-existent NPC', (t) => {
  const manager = NPCManager.getInstance()

  t.is(manager.getNPC('non_existent'), undefined)
})

test.serial(
  'getNPCsForLocation returns NPCs in the specified location',
  (t) => {
    const manager = NPCManager.getInstance()
    const npc1 = { ...mockNPC, id: 'npc1', location: "Merchant's District" }
    const npc2 = { ...mockNPC, id: 'npc2', location: 'Enchanted Forest' }
    const npc3 = { ...mockNPC, id: 'npc3', location: "Merchant's District" }

    manager.registerNPC(npc1)
    manager.registerNPC(npc2)
    manager.registerNPC(npc3)

    const marketNPCs = manager.getNPCsForLocation(
      "Merchant's District",
      mockGameState
    )

    t.is(marketNPCs.length, 2)
    t.true(marketNPCs.some((npc) => npc.id === 'npc1'))
    t.true(marketNPCs.some((npc) => npc.id === 'npc3'))
    t.false(marketNPCs.some((npc) => npc.id === 'npc2'))
  }
)

test.serial('isNPCAvailable checks time restrictions', (t) => {
  const manager = NPCManager.getInstance()
  const npcWithTimeRestriction = {
    ...mockNPC,
    availability: {
      ...mockNPC.availability,
      timeRestriction: [5, 15] as [number, number],
    },
  }

  // Day 10 should be available (within range)
  t.true(manager.isNPCAvailable(npcWithTimeRestriction, mockGameState))

  // Day 3 should not be available (before range)
  const earlyGameState = { ...mockGameState, day: 3 }
  t.false(manager.isNPCAvailable(npcWithTimeRestriction, earlyGameState))

  // Day 20 should not be available (after range)
  const lateGameState = { ...mockGameState, day: 20 }
  t.false(manager.isNPCAvailable(npcWithTimeRestriction, lateGameState))
})

test.serial('isNPCAvailable checks weather restrictions', (t) => {
  const manager = NPCManager.getInstance()
  const npcWithWeatherRestriction: NPC = {
    ...mockNPC,
    availability: {
      ...mockNPC.availability,
      weatherRestriction: ['sunny', 'windy'],
    },
  }

  // Sunny weather should be available
  t.true(manager.isNPCAvailable(npcWithWeatherRestriction, mockGameState))

  // Rainy weather should not be available
  const rainyGameState = { ...mockGameState, weather: 'rainy' as const }
  t.false(manager.isNPCAvailable(npcWithWeatherRestriction, rainyGameState))
})

test.serial('isNPCAvailable checks reputation gate', (t) => {
  const manager = NPCManager.getInstance()
  const npcWithReputationGate = {
    ...mockNPC,
    availability: {
      ...mockNPC.availability,
      reputationGate: 10,
    },
  }

  // Current reputation (5) should not meet gate (10)
  t.false(manager.isNPCAvailable(npcWithReputationGate, mockGameState))

  // Higher reputation should meet gate
  const highRepGameState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { "Merchant's District": 15 },
    },
  }
  t.true(manager.isNPCAvailable(npcWithReputationGate, highRepGameState))
})

test.serial(
  'isNPCAvailable checks NPC-specific reputation requirements',
  (t) => {
    const manager = NPCManager.getInstance()
    const npcWithRepRequirement = {
      ...mockNPC,
      reputation: {
        minimum: 20,
        location: "Merchant's District",
      },
    }

    // Current location reputation (5) should not meet requirement (20)
    t.false(manager.isNPCAvailable(npcWithRepRequirement, mockGameState))

    // Higher reputation should meet requirement
    const highRepGameState = {
      ...mockGameState,
      reputation: {
        ...mockGameState.reputation,
        locations: { "Merchant's District": 25 },
      },
    }
    t.true(manager.isNPCAvailable(npcWithRepRequirement, highRepGameState))
  }
)

test.serial(
  'isNPCAvailable uses global reputation when no location specified',
  (t) => {
    const manager = NPCManager.getInstance()
    const npcWithGlobalRepRequirement = {
      ...mockNPC,
      reputation: {
        minimum: 5,
      },
    }

    // Global reputation (10) should meet requirement (5)
    t.true(manager.isNPCAvailable(npcWithGlobalRepRequirement, mockGameState))

    // Lower global reputation should not meet requirement
    const lowRepGameState = {
      ...mockGameState,
      reputation: {
        ...mockGameState.reputation,
        global: 3,
      },
    }
    t.false(
      manager.isNPCAvailable(npcWithGlobalRepRequirement, lowRepGameState)
    )
  }
)

test.serial('rollForEncounter returns null when no NPCs available', (t) => {
  const manager = NPCManager.getInstance()

  const result = manager.rollForEncounter('Empty Location', mockGameState)

  t.is(result, undefined)
})

test.serial('rollForEncounter returns NPC when available', (t) => {
  const manager = NPCManager.getInstance()
  const npcWithHighProbability = {
    ...mockNPC,
    availability: {
      ...mockNPC.availability,
      probability: 1, // 100% chance
    },
  }

  manager.registerNPC(npcWithHighProbability)

  const result = manager.rollForEncounter("Merchant's District", mockGameState)

  t.not(result, undefined)
  t.is(result?.id, 'test_merchant')
})

test.serial('rollForEncounter respects probability weights', (t) => {
  const manager = NPCManager.getInstance()

  // Create NPCs with different probabilities
  const npc1 = {
    ...mockNPC,
    id: 'npc1',
    availability: { ...mockNPC.availability, probability: 0.1 },
  }
  const npc2 = {
    ...mockNPC,
    id: 'npc2',
    availability: { ...mockNPC.availability, probability: 0.9 },
  }

  manager.registerNPC(npc1)
  manager.registerNPC(npc2)

  // Run multiple encounters to test probability distribution
  const encounters: Record<string, number> = {}
  const iterations = 1000

  for (let i = 0; i < iterations; i++) {
    const result = manager.rollForEncounter(
      "Merchant's District",
      mockGameState
    )
    if (result) {
      encounters[result.id] = (encounters[result.id] || 0) + 1
    }
  }

  // Npc2 should have significantly more encounters than npc1
  t.true((encounters['npc2'] || 0) > (encounters['npc1'] || 0))
  t.true((encounters['npc2'] || 0) > iterations * 0.7) // Should be around 90% of encounters
})

test.serial('getNPCsByType filters NPCs by type', (t) => {
  const manager = NPCManager.getInstance()
  const merchant = { ...mockNPC, id: 'merchant1', type: 'merchant' as const }
  const guard = { ...mockNPC, id: 'guard1', type: 'guard' as const }
  const informant = { ...mockNPC, id: 'informant1', type: 'informant' as const }

  manager.registerNPC(merchant)
  manager.registerNPC(guard)
  manager.registerNPC(informant)

  const merchants = manager.getNPCsByType('merchant')
  const guards = manager.getNPCsByType('guard')

  t.is(merchants.length, 1)
  t.is(merchants[0]?.id, 'merchant1')
  t.is(guards.length, 1)
  t.is(guards[0]?.id, 'guard1')
})

test.serial('clearNPCs removes all NPCs', (t) => {
  const manager = NPCManager.getInstance()

  manager.registerNPC(mockNPC)
  t.is(manager.getNPCCount(), 1)

  manager.clearNPCs()
  t.is(manager.getNPCCount(), 0)
})

test.serial('getAllNPCs returns all registered NPCs', (t) => {
  const manager = NPCManager.getInstance()
  const npc1 = { ...mockNPC, id: 'npc1' }
  const npc2 = { ...mockNPC, id: 'npc2' }

  manager.registerNPC(npc1)
  manager.registerNPC(npc2)

  const allNPCs = manager.getAllNPCs()

  t.is(allNPCs.length, 2)
  t.true(allNPCs.some((npc) => npc.id === 'npc1'))
  t.true(allNPCs.some((npc) => npc.id === 'npc2'))
})
