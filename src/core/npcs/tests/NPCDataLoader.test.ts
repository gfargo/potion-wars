import test from 'ava'
import { NPCDataLoader } from '../NPCDataLoader.js'
import { NPCError } from '../NPCManager.js'

// Valid NPC data for testing
const validNPCData = {
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A test merchant for unit testing',
  personality: {
    greeting: 'Hello there!',
    farewell: 'Goodbye!',
    tradeAccept: 'Deal!',
    tradeDecline: 'No deal.',
    lowReputation: 'I don\'t trust you.',
    highReputation: 'My valued customer!'
  },
  location: "Merchant's District",
  availability: {
    probability: 0.5,
    timeRestriction: [1, 20],
    reputationGate: 0
  },
  reputation: {
    minimum: 0
  },
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Hello!',
        choices: []
      }
    }
  }
}

test.serial('validateNPCData returns no errors for valid data', t => {
  const errors = NPCDataLoader.validateNPCData(validNPCData)
  t.is(errors.length, 0)
})

test.serial('validateNPCData catches missing required fields', t => {
  const invalidData = { ...validNPCData } as any
  delete invalidData.id
  delete invalidData.name
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'id'))
  t.true(errors.some(e => e.field === 'name'))
})

test.serial('validateNPCData catches invalid type', t => {
  const invalidData = { ...validNPCData, type: 'invalid_type' }
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'type'))
})

test.serial('validateNPCData catches invalid personality structure', t => {
  const invalidData = { ...validNPCData, personality: 'not an object' }
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'personality'))
})

test.serial('validateNPCData catches missing personality fields', t => {
  const invalidData = {
    ...validNPCData,
    personality: {
      greeting: 'Hello'
      // Missing other required fields
    }
  }
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'personality.farewell'))
  t.true(errors.some(e => e.field === 'personality.tradeAccept'))
})

test.serial('validateNPCData catches invalid availability probability', t => {
  const invalidData = {
    ...validNPCData,
    availability: {
      ...validNPCData.availability,
      probability: 1.5 // Invalid: > 1
    }
  }
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'availability.probability'))
})

test.serial('validateNPCData catches invalid time restriction format', t => {
  const invalidData = {
    ...validNPCData,
    availability: {
      ...validNPCData.availability,
      timeRestriction: [1] // Invalid: should be [min, max]
    }
  }
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'availability.timeRestriction'))
})

test.serial('validateNPCData catches invalid dialogue structure', t => {
  const invalidData = {
    ...validNPCData,
    dialogue: {
      rootNode: 'greeting'
      // Missing nodes
    }
  }
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'dialogue.nodes'))
})

test.serial('validateNPCData catches missing root node in dialogue nodes', t => {
  const invalidData = {
    ...validNPCData,
    dialogue: {
      rootNode: 'missing_node',
      nodes: {
        greeting: {
          id: 'greeting',
          text: 'Hello!',
          choices: []
        }
      }
    }
  }
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'dialogue.nodes' && e.message.includes('Root node')))
})

test.serial('validateNPCData catches invalid dialogue node structure', t => {
  const invalidData = {
    ...validNPCData,
    dialogue: {
      rootNode: 'greeting',
      nodes: {
        greeting: {
          // Missing required fields
          choices: []
        }
      }
    }
  }
  
  const errors = NPCDataLoader.validateNPCData(invalidData)
  
  t.true(errors.some(e => e.field === 'dialogue.nodes.greeting.id'))
  t.true(errors.some(e => e.field === 'dialogue.nodes.greeting.text'))
})

test.serial('loadNPCFromData successfully loads valid data', t => {
  const npc = NPCDataLoader.loadNPCFromData(validNPCData)
  
  t.is(npc.id, 'test_merchant')
  t.is(npc.name, 'Test Merchant')
  t.is(npc.type, 'merchant')
  t.is(npc.location, "Merchant's District")
  t.is(npc.availability.probability, 0.5)
  t.deepEqual(npc.availability.timeRestriction, [1, 20])
})

test.serial('loadNPCFromData throws error for invalid data', t => {
  const invalidData = { ...validNPCData } as any
  delete invalidData.id
  
  const error = t.throws(() => {
    NPCDataLoader.loadNPCFromData(invalidData)
  }, { instanceOf: NPCError })
  
  t.is(error?.code, 'INVALID_NPC_DATA')
  t.true(error?.message.includes('Invalid NPC data'))
})

test.serial('loadNPCsFromData successfully loads array of valid NPCs', t => {
  const npcData1 = { ...validNPCData, id: 'npc1', name: 'NPC 1' }
  const npcData2 = { ...validNPCData, id: 'npc2', name: 'NPC 2' }
  
  const npcs = NPCDataLoader.loadNPCsFromData([npcData1, npcData2])
  
  t.is(npcs.length, 2)
  t.is(npcs[0]?.id, 'npc1')
  t.is(npcs[1]?.id, 'npc2')
})

test.serial('loadNPCsFromData throws error for non-array input', t => {
  const error = t.throws(() => {
    NPCDataLoader.loadNPCsFromData('not an array' as any)
  }, { instanceOf: NPCError })
  
  t.is(error?.code, 'INVALID_NPC_DATA')
  t.true(error?.message.includes('must be an array'))
})

test.serial('loadNPCsFromData throws error when any NPC is invalid', t => {
  const validNPC = { ...validNPCData, id: 'valid_npc' }
  const invalidNPC = { ...validNPCData } as any
  delete invalidNPC.id
  
  const error = t.throws(() => {
    NPCDataLoader.loadNPCsFromData([validNPC, invalidNPC])
  }, { instanceOf: NPCError })
  
  t.is(error?.code, 'INVALID_NPC_DATA')
  t.true(error?.message.includes('Failed to load NPCs'))
})

test.serial('getDefaultNPCs returns valid NPC array', t => {
  const defaultNPCs = NPCDataLoader.getDefaultNPCs()
  
  t.true(Array.isArray(defaultNPCs))
  t.true(defaultNPCs.length > 0)
  
  // Validate each default NPC
  for (const npc of defaultNPCs) {
    const errors = NPCDataLoader.validateNPCData(npc)
    t.is(errors.length, 0, `Default NPC ${npc.id} has validation errors: ${errors.map(e => e.message).join(', ')}`)
  }
})

test.serial('getDefaultNPCs includes NPCs for different locations', t => {
  const defaultNPCs = NPCDataLoader.getDefaultNPCs()
  
  const locations = new Set(defaultNPCs.map(npc => npc.location))
  
  t.true(locations.has("Merchant's District"))
  t.true(locations.has('Enchanted Forest'))
  t.true(locations.has('Royal Castle'))
})

test.serial('getDefaultNPCs includes different NPC types', t => {
  const defaultNPCs = NPCDataLoader.getDefaultNPCs()
  
  const types = new Set(defaultNPCs.map(npc => npc.type))
  
  t.true(types.has('merchant'))
  t.true(types.has('informant'))
  t.true(types.has('guard'))
})

test.serial('default NPCs have unique IDs', t => {
  const defaultNPCs = NPCDataLoader.getDefaultNPCs()
  
  const ids = defaultNPCs.map(npc => npc.id)
  const uniqueIds = new Set(ids)
  
  t.is(ids.length, uniqueIds.size, 'All NPC IDs should be unique')
})

test.serial('default NPCs have proper dialogue structure', t => {
  const defaultNPCs = NPCDataLoader.getDefaultNPCs()
  
  for (const npc of defaultNPCs) {
    t.truthy(npc.dialogue.rootNode, `NPC ${npc.id} should have a root node`)
    t.truthy(npc.dialogue.nodes[npc.dialogue.rootNode], `NPC ${npc.id} root node should exist in nodes`)
    
    // Check that all dialogue nodes have required structure
    for (const [nodeId, node] of Object.entries(npc.dialogue.nodes)) {
      t.is(node.id, nodeId, `Node ID should match key for ${npc.id}.${nodeId}`)
      t.truthy(node.text, `Node text should exist for ${npc.id}.${nodeId}`)
      t.true(Array.isArray(node.choices), `Node choices should be array for ${npc.id}.${nodeId}`)
    }
  }
})

test.serial('default merchant NPCs have trades', t => {
  const defaultNPCs = NPCDataLoader.getDefaultNPCs()
  const merchants = defaultNPCs.filter(npc => npc.type === 'merchant')
  
  t.true(merchants.length > 0, 'Should have at least one merchant')
  
  for (const merchant of merchants) {
    t.true(Array.isArray(merchant.trades), `Merchant ${merchant.id} should have trades array`)
    if (merchant.trades && merchant.trades.length > 0) {
      for (const trade of merchant.trades) {
        t.truthy(trade.offer, `Trade should have offer for ${merchant.id}`)
        t.is(typeof trade.price, 'number', `Trade price should be number for ${merchant.id}`)
        t.is(typeof trade.quantity, 'number', `Trade quantity should be number for ${merchant.id}`)
      }
    }
  }
})

test.serial('default informant NPCs have information', t => {
  const defaultNPCs = NPCDataLoader.getDefaultNPCs()
  const informants = defaultNPCs.filter(npc => npc.type === 'informant')
  
  t.true(informants.length > 0, 'Should have at least one informant')
  
  for (const informant of informants) {
    t.true(Array.isArray(informant.information), `Informant ${informant.id} should have information array`)
    if (informant.information && informant.information.length > 0) {
      for (const info of informant.information) {
        t.truthy(info.id, `Information should have ID for ${informant.id}`)
        t.truthy(info.content, `Information should have content for ${informant.id}`)
        t.truthy(info.category, `Information should have category for ${informant.id}`)
      }
    }
  }
})