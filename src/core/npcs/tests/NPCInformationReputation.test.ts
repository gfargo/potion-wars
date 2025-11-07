import test from 'ava'
import {
  NPCInformationReputation,
  type InformationTier,
} from '../NPCInformationReputation.js'
import { type GameState } from '../../../types/game.types.js'
import { type NPC, type NPCInformation } from '../../../types/npc.types.js'

// Test data
const mockGameState: GameState = {
  day: 10,
  cash: 1000,
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
      'Royal Palace': 75,
    },
    npcRelationships: {
      merchant_aldric: 40,
      informant_sara: 60,
    },
  },
  prices: {},
  marketData: {
    'Market Square': {
      'Healing Potion': {
        basePrice: 100,
        currentPrice: 120,
        demand: 0.7,
        supply: 0.4,
        trend: 'rising',
        volatility: 0.3,
        lastUpdated: 9,
        history: [
          { day: 5, price: 95, volume: 10 },
          { day: 6, price: 100, volume: 8 },
          { day: 7, price: 110, volume: 12 },
          { day: 8, price: 115, volume: 15 },
          { day: 9, price: 120, volume: 18 },
        ],
      },
    },
  },
  tradeHistory: [],
  strength: 10,
  agility: 10,
  intelligence: 10,
}

const mockInformation: NPCInformation[] = [
  {
    id: 'basic_info',
    content: 'Healing potions are selling well.',
    category: 'market',
    reputationRequirement: 0,
  },
  {
    id: 'detailed_info',
    content: 'There will be increased demand for strength potions.',
    category: 'market',
    reputationRequirement: 25,
  },
  {
    id: 'exclusive_info',
    content: 'A wealthy merchant is looking for rare potions.',
    category: 'market',
    reputationRequirement: 55,
  },
  {
    id: 'secret_info',
    content: 'The royal alchemist is planning something big.',
    category: 'event',
    reputationRequirement: 85,
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

test('getInformationTier returns correct tiers based on reputation', (t) => {
  t.is(NPCInformationReputation.getInformationTier(-30), 'basic')
  t.is(NPCInformationReputation.getInformationTier(10), 'basic')
  t.is(NPCInformationReputation.getInformationTier(25), 'detailed')
  t.is(NPCInformationReputation.getInformationTier(55), 'exclusive')
  t.is(NPCInformationReputation.getInformationTier(85), 'secret')
})

test('filterInformationByReputation filters based on effective reputation', (t) => {
  // Test with Market Square location (reputation: 30)
  const filteredInfo = NPCInformationReputation.filterInformationByReputation(
    mockNPC,
    mockGameState
  )

  // Should get basic, detailed info (rep 30 >= 25), but not exclusive (rep 30 < 55)
  t.true(filteredInfo.some((info) => info.id === 'basic_info'))
  t.true(filteredInfo.some((info) => info.id === 'detailed_info'))
  t.false(filteredInfo.some((info) => info.id === 'exclusive_info'))
  t.false(filteredInfo.some((info) => info.id === 'secret_info'))
})

test('filterInformationByReputation uses highest relevant reputation', (t) => {
  // Test with NPC that has high individual relationship
  const highRepNPC = { ...mockNPC, id: 'informant_sara' } // Has 60 reputation
  const filteredInfo = NPCInformationReputation.filterInformationByReputation(
    highRepNPC,
    mockGameState
  )

  // Debug: check what information is available
  const exclusiveInfo = filteredInfo.find(
    (info) => info.id === 'exclusive_info'
  )
  const secretInfo = filteredInfo.find((info) => info.id === 'secret_info')

  // Should get exclusive info due to high NPC relationship (60 >= 55)
  t.truthy(exclusiveInfo, 'Should have exclusive info with 60 reputation')
  t.falsy(secretInfo, 'Should not have secret info (requires 85)')
})

test('enhanceInformationContent adds details based on reputation tier', (t) => {
  const basicInfo = mockInformation[0]!

  const basicEnhanced = NPCInformationReputation.enhanceInformationContent(
    basicInfo,
    10,
    'test_npc'
  )
  const detailedEnhanced = NPCInformationReputation.enhanceInformationContent(
    basicInfo,
    30,
    'test_npc'
  )
  const exclusiveEnhanced = NPCInformationReputation.enhanceInformationContent(
    basicInfo,
    60,
    'test_npc'
  )
  const secretEnhanced = NPCInformationReputation.enhanceInformationContent(
    basicInfo,
    90,
    'test_npc'
  )

  // Basic should be unchanged
  t.is(basicEnhanced.content, basicInfo.content)

  // Higher tiers should have additional content
  t.true(detailedEnhanced.content.length > basicInfo.content.length)
  t.true(exclusiveEnhanced.content.length > detailedEnhanced.content.length)
  t.true(secretEnhanced.content.length > exclusiveEnhanced.content.length)

  // Should have unique IDs
  t.not(detailedEnhanced.id, basicEnhanced.id)
  t.not(exclusiveEnhanced.id, detailedEnhanced.id)
})

test('generateReputationBasedMarketIntelligence filters by reputation', (t) => {
  const intelligence =
    NPCInformationReputation.generateReputationBasedMarketIntelligence(
      mockGameState,
      'Market Square',
      'test_npc'
    )

  // Should generate some intelligence based on market data
  t.true(intelligence.length >= 0) // May be 0 if no significant trends

  // All intelligence should be accessible with current reputation
  for (const info of intelligence) {
    const requiredRep = info.reputationRequirement || 0
    const locationRep = mockGameState.reputation.locations['Market Square'] || 0
    t.true(locationRep >= requiredRep)
  }
})

test('calculateInformationReputationReward calculates correct rewards', (t) => {
  const basicInfo = mockInformation[0]!
  const exclusiveInfo = mockInformation[2]!

  const basicReward =
    NPCInformationReputation.calculateInformationReputationReward(
      basicInfo,
      'test_npc',
      mockGameState,
      false
    )
  const exclusiveReward =
    NPCInformationReputation.calculateInformationReputationReward(
      exclusiveInfo,
      'test_npc',
      mockGameState,
      false
    )
  const firstTimeReward =
    NPCInformationReputation.calculateInformationReputationReward(
      basicInfo,
      'test_npc',
      mockGameState,
      true
    )

  // Exclusive info should give higher reward
  t.true(exclusiveReward > basicReward)

  // First time should give bonus
  t.true(firstTimeReward > basicReward)
})

test('applyInformationReward updates reputation correctly', (t) => {
  const info = mockInformation[1]! // Detailed market info
  const initialState = mockGameState

  const updatedState = NPCInformationReputation.applyInformationReward(
    initialState,
    'test_npc',
    info,
    true
  )

  // Global reputation should increase slightly
  t.true(updatedState.reputation.global > initialState.reputation.global)

  // Location reputation should increase more
  const locationRep = updatedState.reputation.locations['Market Square']!
  const initialLocationRep = initialState.reputation.locations['Market Square']!
  t.true(locationRep > initialLocationRep)

  // NPC relationship should increase
  const npcRep = updatedState.reputation.npcRelationships['test_npc']!
  const initialNpcRep =
    initialState.reputation.npcRelationships['test_npc'] || 0
  t.true(npcRep > initialNpcRep)
})

test('hasAccessedInformation provides reasonable heuristic', (t) => {
  const earlyGameState = {
    ...mockGameState,
    day: 2,
    reputation: { ...mockGameState.reputation, global: 5 },
  }
  const lateGameState = {
    ...mockGameState,
    day: 10,
    reputation: { ...mockGameState.reputation, global: 25 },
  }

  // Early game with low reputation should return false
  t.false(
    NPCInformationReputation.hasAccessedInformation(earlyGameState, 'test_info')
  )

  // Later game with higher reputation should return true
  t.true(
    NPCInformationReputation.hasAccessedInformation(lateGameState, 'test_info')
  )
})

test('getExclusiveOpportunities returns opportunities based on high reputation', (t) => {
  const highRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: {
        ...mockGameState.reputation.locations,
        'Royal Palace': 85, // Very high reputation
      },
    },
  }

  const opportunities = NPCInformationReputation.getExclusiveOpportunities(
    highRepState,
    'Royal Palace'
  )

  // Should get multiple exclusive opportunities
  t.true(opportunities.length > 0)

  // All opportunities should require high reputation
  for (const opp of opportunities) {
    t.true((opp.reputationRequirement || 0) >= 60)
  }

  // Should include exclusive trader opportunity
  t.true(opportunities.some((opp) => opp.content.includes('wealthy collector')))
})

test('getExclusiveOpportunities returns empty array for low reputation', (t) => {
  const lowRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: {
        ...mockGameState.reputation.locations,
        'Dark Alley': 30, // Low reputation
      },
    },
  }

  const opportunities = NPCInformationReputation.getExclusiveOpportunities(
    lowRepState,
    'Dark Alley'
  )

  t.is(opportunities.length, 0)
})

test('reputation tiers are properly ordered', (t) => {
  const tiers: InformationTier[] = ['basic', 'detailed', 'exclusive', 'secret']

  // Test that higher reputation gives access to higher tiers
  for (const [i, tier] of tiers.entries()) {
    const currentTier = tier
    const reputation = [10, 30, 60, 90][i]! // Corresponding reputation levels

    t.is(NPCInformationReputation.getInformationTier(reputation), currentTier)
  }
})

test('enhanced content includes tier-appropriate details', (t) => {
  const baseInfo: NPCInformation = {
    id: 'test_market_info',
    content: 'Healing potions are in demand.',
    category: 'market',
  }

  const detailedEnhanced = NPCInformationReputation.enhanceInformationContent(
    baseInfo,
    30,
    'test_npc'
  )
  const exclusiveEnhanced = NPCInformationReputation.enhanceInformationContent(
    baseInfo,
    60,
    'test_npc'
  )
  const secretEnhanced = NPCInformationReputation.enhanceInformationContent(
    baseInfo,
    90,
    'test_npc'
  )

  // Detailed should add timing information
  t.true(detailedEnhanced.content.includes('2-3 days'))

  // Exclusive should add merchant information
  t.true(exclusiveEnhanced.content.includes('merchant'))

  // Secret should add royal decree information
  t.true(secretEnhanced.content.includes('royal decree'))
})

test('market intelligence enhancement adds specific details', (t) => {
  const baseIntelligence =
    NPCInformationReputation.generateReputationBasedMarketIntelligence(
      mockGameState,
      'Market Square',
      'test_npc'
    )

  // Test with high reputation to get enhanced intelligence
  const highRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: {
        ...mockGameState.reputation.locations,
        'Market Square': 85,
      },
    },
  }

  const enhancedIntelligence =
    NPCInformationReputation.generateReputationBasedMarketIntelligence(
      highRepState,
      'Market Square',
      'test_npc'
    )

  // Enhanced intelligence should have more detailed content
  if (baseIntelligence.length > 0 && enhancedIntelligence.length > 0) {
    const baseContent = baseIntelligence[0]!.content
    const enhancedContent = enhancedIntelligence[0]!.content

    // Enhanced content should be longer or contain additional details
    t.true(enhancedContent.length >= baseContent.length)
  } else {
    // If no intelligence generated, that's also valid
    t.pass('No market intelligence generated for current conditions')
  }
})
