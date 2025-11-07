import test from 'ava'
import {
  NPCInformationManager,
  NPCInformationError,
} from '../NPCInformationManager.js'
import { type GameState } from '../../../types/game.types.js'
import { type NPC, type NPCInformation } from '../../../types/npc.types.js'

// Test data
const mockGameState: GameState = {
  day: 10,
  cash: 500,
  health: 100,
  debt: 0,
  location: {
    name: 'Market Square',
    description: 'A bustling marketplace',
    dangerLevel: 1,
  },
  weather: 'sunny',
  inventory: {
    'Healing Potion': 5,
    'Strength Potion': 2,
  },
  reputation: {
    global: 25,
    locations: {
      'Market Square': 30,
      'Dark Alley': -10,
      'Royal Palace': 50,
    },
    npcRelationships: {},
  },
  prices: {},
  marketData: {},
  tradeHistory: [],
  strength: 10,
  agility: 10,
  intelligence: 10,
}

const mockInformation: NPCInformation[] = [
  {
    id: 'basic_market_info',
    content: 'Healing potions are selling well in the Royal Palace.',
    category: 'market',
    reputationRequirement: 0,
  },
  {
    id: 'exclusive_market_info',
    content:
      'A wealthy merchant is looking for rare potions. He pays triple the normal price.',
    category: 'market',
    reputationRequirement: 40,
  },
  {
    id: 'event_warning',
    content: 'I heard guards are patrolling the Dark Alley more frequently.',
    category: 'event',
    reputationRequirement: 20,
    conditions: [
      {
        type: 'day',
        operator: 'gte',
        value: 5,
      },
    ],
  },
  {
    id: 'inventory_dependent',
    content: 'You have quite a collection of healing potions there!',
    category: 'general',
    conditions: [
      {
        type: 'inventory',
        operator: 'gte',
        value: 3,
        item: 'Healing Potion',
      },
    ],
  },
]

const mockNPC: NPC = {
  id: 'test_informant',
  name: 'Test Informant',
  type: 'informant',
  description: 'A knowledgeable informant',
  personality: {
    greeting: 'Hello there!',
    farewell: 'Goodbye!',
    tradeAccept: 'Deal!',
    tradeDecline: 'No deal.',
    lowReputation: "I don't trust you.",
    highReputation: "You're a valued friend!",
  },
  location: 'Market Square',
  availability: {
    probability: 0.5,
  },
  reputation: {},
  information: mockInformation,
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'What would you like to know?',
        choices: [],
      },
    },
  },
}

test('getAvailableInformation returns all accessible information', (t) => {
  const available = NPCInformationManager.getAvailableInformation(
    mockNPC,
    mockGameState
  )

  // Should get basic market info, event warning, and inventory dependent info
  // Exclusive market info should be filtered out (requires 40 reputation, player has 30)
  t.is(available.length, 3)
  t.true(available.some((info) => info.id === 'basic_market_info'))
  t.true(available.some((info) => info.id === 'event_warning'))
  t.true(available.some((info) => info.id === 'inventory_dependent'))
  t.false(available.some((info) => info.id === 'exclusive_market_info'))
})

test('getAvailableInformation returns empty array for NPC without information', (t) => {
  const npcWithoutInfo = { ...mockNPC, information: undefined }
  const available = NPCInformationManager.getAvailableInformation(
    npcWithoutInfo,
    mockGameState
  )

  t.is(available.length, 0)
})

test('getInformationByCategory filters by category correctly', (t) => {
  const marketInfo = NPCInformationManager.getInformationByCategory(
    mockNPC,
    'market',
    mockGameState
  )
  const eventInfo = NPCInformationManager.getInformationByCategory(
    mockNPC,
    'event',
    mockGameState
  )

  t.is(marketInfo.length, 1)
  t.is(marketInfo[0]!.id, 'basic_market_info')

  t.is(eventInfo.length, 1)
  t.is(eventInfo[0]!.id, 'event_warning')
})

test('isInformationAvailable checks reputation requirements', (t) => {
  const basicInfo = mockInformation[0]! // Requires 0 reputation
  const exclusiveInfo = mockInformation[1]! // Requires 40 reputation

  t.true(
    NPCInformationManager.isInformationAvailable(
      basicInfo,
      mockGameState,
      'Market Square'
    )
  )
  t.false(
    NPCInformationManager.isInformationAvailable(
      exclusiveInfo,
      mockGameState,
      'Market Square'
    )
  )
})

test('isInformationAvailable evaluates conditions correctly', (t) => {
  const eventInfo = mockInformation[2]! // Requires day >= 5
  const inventoryInfo = mockInformation[3]! // Requires Healing Potion in inventory

  t.true(
    NPCInformationManager.isInformationAvailable(
      eventInfo,
      mockGameState,
      'Market Square'
    )
  )
  t.true(
    NPCInformationManager.isInformationAvailable(
      inventoryInfo,
      mockGameState,
      'Market Square'
    )
  )

  // Test with early day
  const earlyGameState = { ...mockGameState, day: 3 }
  t.false(
    NPCInformationManager.isInformationAvailable(
      eventInfo,
      earlyGameState,
      'Market Square'
    )
  )

  // Test without required item
  const noItemGameState = { ...mockGameState, inventory: {} }
  t.false(
    NPCInformationManager.isInformationAvailable(
      inventoryInfo,
      noItemGameState,
      'Market Square'
    )
  )
})

test('evaluateInformationConditions handles all condition types', (t) => {
  const conditions = [
    { type: 'reputation' as const, operator: 'gte' as const, value: 20 },
    { type: 'cash' as const, operator: 'gt' as const, value: 400 },
    { type: 'day' as const, operator: 'lte' as const, value: 15 },
    {
      type: 'location' as const,
      operator: 'eq' as const,
      value: 'Market Square',
    },
  ]

  t.true(
    NPCInformationManager.evaluateInformationConditions(
      conditions,
      mockGameState,
      'Market Square'
    )
  )

  // Test failing condition
  const failingConditions = [
    { type: 'cash' as const, operator: 'gt' as const, value: 1000 },
  ]

  t.false(
    NPCInformationManager.evaluateInformationConditions(
      failingConditions,
      mockGameState,
      'Market Square'
    )
  )
})

test('evaluateInformationCondition throws error for invalid inventory condition', (t) => {
  const invalidCondition = {
    type: 'inventory' as const,
    operator: 'gte' as const,
    value: 123, // Missing item property
  }

  const error = t.throws(
    () => {
      NPCInformationManager.evaluateInformationConditions(
        [invalidCondition],
        mockGameState,
        'Market Square'
      )
    },
    { instanceOf: NPCInformationError }
  )

  t.is(error?.code, 'INVALID_CONDITION')
})

test('evaluateInformationCondition throws error for unknown condition type', (t) => {
  const invalidCondition = {
    type: 'unknown' as any,
    operator: 'eq' as const,
    value: 'test',
  }

  const error = t.throws(
    () => {
      NPCInformationManager.evaluateInformationConditions(
        [invalidCondition],
        mockGameState,
        'Market Square'
      )
    },
    { instanceOf: NPCInformationError }
  )

  t.is(error?.code, 'INVALID_CONDITION')
})

test('getInformationQuality returns correct quality levels', (t) => {
  t.is(NPCInformationManager.getInformationQuality(-10), 'basic')
  t.is(NPCInformationManager.getInformationQuality(10), 'basic')
  t.is(NPCInformationManager.getInformationQuality(25), 'detailed')
  t.is(NPCInformationManager.getInformationQuality(60), 'exclusive')
})

test('filterInformationByQuality returns content', (t) => {
  const info = mockInformation[0]!

  t.is(
    NPCInformationManager.filterInformationByQuality(info, 'basic'),
    info.content
  )
  t.is(
    NPCInformationManager.filterInformationByQuality(info, 'detailed'),
    info.content
  )
  t.is(
    NPCInformationManager.filterInformationByQuality(info, 'exclusive'),
    info.content
  )
})

test('calculateInformationReward calculates correct rewards', (t) => {
  const marketInfo = mockInformation[0]! // Market category, no reputation requirement
  const exclusiveInfo = mockInformation[1]! // Market category, 40 reputation requirement
  const eventInfo = mockInformation[2]! // Event category, 20 reputation requirement

  t.is(NPCInformationManager.calculateInformationReward(marketInfo), 2)
  t.is(NPCInformationManager.calculateInformationReward(exclusiveInfo), 4) // 2 * (40/20)
  t.is(NPCInformationManager.calculateInformationReward(eventInfo), 1) // 1 * (20/20)
})

test('validateInformation catches invalid data', (t) => {
  const validInfo: NPCInformation = {
    id: 'valid_info',
    content: 'Valid information content',
    category: 'market',
  }

  t.is(NPCInformationManager.validateInformation(validInfo).length, 0)

  // Test invalid ID
  const invalidIdInfo = { ...validInfo, id: '' }
  const idErrors = NPCInformationManager.validateInformation(invalidIdInfo)
  t.true(idErrors.some((error) => error.includes('valid ID')))

  // Test invalid content
  const invalidContentInfo = { ...validInfo, content: '' }
  const contentErrors =
    NPCInformationManager.validateInformation(invalidContentInfo)
  t.true(contentErrors.some((error) => error.includes('content')))

  // Test invalid category
  const invalidCategoryInfo = { ...validInfo, category: 'invalid' as any }
  const categoryErrors =
    NPCInformationManager.validateInformation(invalidCategoryInfo)
  t.true(categoryErrors.some((error) => error.includes('valid category')))

  // Test invalid reputation requirement
  const invalidReputationInfo = { ...validInfo, reputationRequirement: -150 }
  const reputationErrors = NPCInformationManager.validateInformation(
    invalidReputationInfo
  )
  t.true(
    reputationErrors.some((error) => error.includes('Reputation requirement'))
  )
})

test('validateInformation validates conditions', (t) => {
  const infoWithInvalidConditions: NPCInformation = {
    id: 'test_info',
    content: 'Test content',
    category: 'general',
    conditions: [
      {
        type: 'invalid' as any,
        operator: 'eq',
        value: 'test',
      },
      {
        type: 'cash',
        operator: 'invalid' as any,
        value: 100,
      },
      {
        type: 'day',
        operator: 'eq',
        value: undefined as any,
      },
    ],
  }

  const errors = NPCInformationManager.validateInformation(
    infoWithInvalidConditions
  )

  t.true(errors.some((error) => error.includes('Invalid condition type')))
  t.true(errors.some((error) => error.includes('Invalid condition operator')))
  t.true(errors.some((error) => error.includes('Condition must have a value')))
})

test('compareValues handles all operators correctly', (t) => {
  // Test numeric comparisons
  // @ts-expect-error - Testing private method
  t.true(NPCInformationManager.compareValues(10, 'gt', 5))
  // @ts-expect-error - Testing private method
  t.false(NPCInformationManager.compareValues(5, 'gt', 10))

  // @ts-expect-error - Testing private method
  t.true(NPCInformationManager.compareValues(5, 'lt', 10))
  // @ts-expect-error - Testing private method
  t.false(NPCInformationManager.compareValues(10, 'lt', 5))

  // @ts-expect-error - Testing private method
  t.true(NPCInformationManager.compareValues(10, 'eq', 10))
  // @ts-expect-error - Testing private method
  t.false(NPCInformationManager.compareValues(10, 'eq', 5))

  // @ts-expect-error - Testing private method
  t.true(NPCInformationManager.compareValues(10, 'gte', 10))
  // @ts-expect-error - Testing private method
  t.true(NPCInformationManager.compareValues(10, 'gte', 5))
  // @ts-expect-error - Testing private method
  t.false(NPCInformationManager.compareValues(5, 'gte', 10))

  // @ts-expect-error - Testing private method
  t.true(NPCInformationManager.compareValues(10, 'lte', 10))
  // @ts-expect-error - Testing private method
  t.true(NPCInformationManager.compareValues(5, 'lte', 10))
  // @ts-expect-error - Testing private method
  t.false(NPCInformationManager.compareValues(10, 'lte', 5))

  // Test string comparisons
  t.true(
    // @ts-expect-error - Testing private method
    NPCInformationManager.compareValues('Market Square', 'eq', 'Market Square')
  )
  t.false(
    // @ts-expect-error - Testing private method
    NPCInformationManager.compareValues('Market Square', 'eq', 'Dark Alley')
  )
})

test('compareValues throws error for unknown operator', (t) => {
  const error = t.throws(
    () => {
      // @ts-expect-error - Testing private method
      NPCInformationManager.compareValues(10, 'unknown', 5)
    },
    { instanceOf: NPCInformationError }
  )

  t.is(error?.code, 'INVALID_CONDITION')
})
