import test from 'ava'
import { DialogueEngine } from '../DialogueEngine.js'
import { type GameState } from '../../../types/game.types.js'
import { type NPC, type DialogueChoice } from '../../../types/npc.types.js'

// Test data
const mockGameState: GameState = {
  day: 5,
  cash: 100,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: { name: 'Market Square', description: 'A bustling marketplace', dangerLevel: 2 },
  inventory: { 'Health Potion': 3, 'Mana Potion': 1 },
  prices: {},
  weather: 'sunny',
  reputation: {
    global: 10,
    locations: { 'Market Square': 25, 'Forest': -5 },
    npcRelationships: {}
  },
  marketData: {},
  tradeHistory: []
}

const mockNPC: NPC = {
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A friendly merchant',
  personality: {
    greeting: 'Welcome!',
    farewell: 'Goodbye!',
    tradeAccept: 'Great!',
    tradeDecline: 'Maybe later',
    lowReputation: 'I don\'t trust you',
    highReputation: 'My valued customer!'
  },
  location: 'Market Square',
  availability: { probability: 0.8 },
  reputation: {},
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Hello there! What can I do for you?',
        choices: [
          {
            text: 'I want to trade',
            nextNode: 'trade'
          },
          {
            text: 'Tell me about the market',
            nextNode: 'info',
            conditions: [{ type: 'reputation', operator: 'gte', value: 20 }]
          },
          {
            text: 'Goodbye',
            nextNode: undefined
          }
        ]
      },
      trade: {
        id: 'trade',
        text: 'I have some fine wares for sale.',
        choices: [
          {
            text: 'Show me your goods',
            nextNode: undefined,
            effects: [{ type: 'reputation', value: 1 }]
          },
          {
            text: 'Not interested',
            nextNode: 'greeting'
          }
        ]
      },
      info: {
        id: 'info',
        text: 'The market has been quite active lately.',
        conditions: [{ type: 'reputation', operator: 'gte', value: 20 }],
        choices: [
          {
            text: 'Thanks for the information',
            nextNode: undefined,
            effects: [{ type: 'cash', value: -10 }, { type: 'reputation', value: 2 }]
          }
        ]
      },
      blocked: {
        id: 'blocked',
        text: 'You need more reputation to access this.',
        conditions: [{ type: 'reputation', operator: 'lt', value: 10 }],
        choices: [
          {
            text: 'I understand',
            nextNode: undefined
          }
        ]
      }
    }
  }
}

test('processDialogue returns root node with filtered choices', t => {
  const result = DialogueEngine.processDialogue(mockNPC, mockGameState)
  
  t.is(result.id, 'greeting')
  t.is(result.text, 'Hello there! What can I do for you?')
  t.is(result.choices.length, 3) // All choices should be available with reputation 25
})

test('processDialogue filters choices based on conditions', t => {
  const lowRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { 'Market Square': 10 } // Below the 20 required for info choice
    }
  }
  
  const result = DialogueEngine.processDialogue(mockNPC, lowRepState)
  
  t.is(result.choices.length, 2) // Should exclude the info choice
  t.false(result.choices.some(choice => choice.nextNode === 'info'))
})

test('processDialogue handles missing root node', t => {
  const badNPC = {
    ...mockNPC,
    dialogue: {
      rootNode: 'nonexistent',
      nodes: mockNPC.dialogue.nodes
    }
  }
  
  t.throws(() => DialogueEngine.processDialogue(badNPC, mockGameState), {
    message: /Root dialogue node 'nonexistent' not found/
  })
})

test('handleChoice applies effects correctly', t => {
  const choice: DialogueChoice = {
    text: 'Test choice',
    effects: [
      { type: 'cash', value: -50 },
      { type: 'reputation', value: 5 },
      { type: 'inventory', value: 2, item: 'Health Potion' },
      { type: 'health', value: -10 }
    ]
  }
  
  const result = DialogueEngine.handleChoice(choice, mockGameState, 'Market Square')
  
  t.is(result.cash, 50) // 100 - 50
  t.is(result.reputation.locations['Market Square'], 30) // 25 + 5
  t.is(result.reputation.global, 10.5) // 10 + (5 * 0.1)
  t.is(result.inventory['Health Potion'], 5) // 3 + 2
  t.is(result.health, 90) // 100 - 10
})

test('handleChoice applies reputation change', t => {
  const choice: DialogueChoice = {
    text: 'Test choice',
    reputationChange: 10
  }
  
  const result = DialogueEngine.handleChoice(choice, mockGameState, 'Market Square')
  
  t.is(result.reputation.locations['Market Square'], 35) // 25 + 10
  t.is(result.reputation.global, 11) // 10 + (10 * 0.1)
})

test('getNextNode returns correct node', t => {
  const choice: DialogueChoice = {
    text: 'I want to trade',
    nextNode: 'trade'
  }
  
  const result = DialogueEngine.getNextNode(mockNPC, choice, mockGameState)
  
  t.truthy(result)
  t.is(result!.id, 'trade')
  t.is(result!.text, 'I have some fine wares for sale.')
})

test('getNextNode returns null for end of dialogue', t => {
  const choice: DialogueChoice = {
    text: 'Goodbye',
    nextNode: undefined
  }
  
  const result = DialogueEngine.getNextNode(mockNPC, choice, mockGameState)
  
  t.is(result, null)
})

test('getNextNode handles missing node', t => {
  const choice: DialogueChoice = {
    text: 'Test',
    nextNode: 'nonexistent'
  }
  
  t.throws(() => DialogueEngine.getNextNode(mockNPC, choice, mockGameState), {
    message: /Dialogue node 'nonexistent' not found/
  })
})

test('getNextNode blocks access when conditions fail', t => {
  const lowRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { 'Market Square': 10 } // Below the 20 required
    }
  }
  
  const choice: DialogueChoice = {
    text: 'Tell me about the market',
    nextNode: 'info'
  }
  
  const result = DialogueEngine.getNextNode(mockNPC, choice, lowRepState)
  
  t.truthy(result)
  t.is(result!.id, 'blocked')
  t.is(result!.text, "I can't discuss that with you right now.")
})

test('evaluateConditions works with different condition types', t => {
  const conditions = [
    { type: 'reputation' as const, operator: 'gte' as const, value: 20 },
    { type: 'cash' as const, operator: 'gt' as const, value: 50 },
    { type: 'day' as const, operator: 'lte' as const, value: 10 },
    { type: 'location' as const, operator: 'eq' as const, value: 'Market Square' }
  ]
  
  const result = DialogueEngine.evaluateConditions(conditions, mockGameState, 'Market Square')
  
  t.true(result)
})

test('evaluateConditions works with inventory conditions', t => {
  const conditions = [
    { type: 'inventory' as const, operator: 'gte' as const, value: 2, item: 'Health Potion' }
  ]
  
  const result = DialogueEngine.evaluateConditions(conditions, mockGameState, 'Market Square')
  
  t.true(result) // Should pass because we have 3 Health Potions (3 >= 2)
})

test('evaluateConditions fails with insufficient inventory', t => {
  const conditions = [
    { type: 'inventory' as const, operator: 'gt' as const, value: 5, item: 'Health Potion' }
  ]
  
  const result = DialogueEngine.evaluateConditions(conditions, mockGameState, 'Market Square')
  
  t.false(result) // Should fail because we only have 3 Health Potions (3 > 5 is false)
})

test('evaluateConditions fails when any condition fails', t => {
  const conditions = [
    { type: 'reputation' as const, operator: 'gte' as const, value: 20 },
    { type: 'cash' as const, operator: 'gt' as const, value: 200 } // This will fail
  ]
  
  const result = DialogueEngine.evaluateConditions(conditions, mockGameState, 'Market Square')
  
  t.false(result)
})

test('applyEffects handles inventory changes correctly', t => {
  const effects = [
    { type: 'inventory' as const, value: 5, item: 'New Item' },
    { type: 'inventory' as const, value: -1, item: 'Health Potion' }
  ]
  
  const result = DialogueEngine.applyEffects(effects, mockGameState, 'Market Square')
  
  t.is(result.inventory['New Item'], 5)
  t.is(result.inventory['Health Potion'], 2) // 3 - 1
})

test('applyEffects prevents negative values', t => {
  const effects = [
    { type: 'cash' as const, value: -200 }, // Would make cash negative
    { type: 'inventory' as const, value: -10, item: 'Health Potion' }, // Would make inventory negative
    { type: 'health' as const, value: -200 } // Would make health negative
  ]
  
  const result = DialogueEngine.applyEffects(effects, mockGameState, 'Market Square')
  
  t.is(result.cash, 0) // Clamped to 0
  t.is(result.inventory['Health Potion'], 0) // Clamped to 0
  t.is(result.health, 0) // Clamped to 0
})

test('applyEffects clamps health to 100', t => {
  const effects = [
    { type: 'health' as const, value: 50 } // Would exceed 100
  ]
  
  const result = DialogueEngine.applyEffects(effects, mockGameState, 'Market Square')
  
  t.is(result.health, 100) // Clamped to 100
})

test('validateDialogueTree detects missing root node', t => {
  const badNPC = {
    ...mockNPC,
    dialogue: {
      rootNode: 'nonexistent',
      nodes: mockNPC.dialogue.nodes
    }
  }
  
  const errors = DialogueEngine.validateDialogueTree(badNPC)
  
  t.true(errors.length > 0)
  t.true(errors.some(error => error.includes('Root node')))
})

test('validateDialogueTree detects missing referenced nodes', t => {
  const badNPC = {
    ...mockNPC,
    dialogue: {
      rootNode: 'greeting',
      nodes: {
        greeting: {
          id: 'greeting',
          text: 'Hello',
          choices: [
            { text: 'Go to missing node', nextNode: 'missing' }
          ]
        }
      }
    }
  }
  
  const errors = DialogueEngine.validateDialogueTree(badNPC)
  
  t.true(errors.length > 0)
  t.true(errors.some(error => error.includes('missing')))
})

test('validateDialogueTree detects empty text', t => {
  const badNPC = {
    ...mockNPC,
    dialogue: {
      rootNode: 'greeting',
      nodes: {
        greeting: {
          id: 'greeting',
          text: '',
          choices: [
            { text: 'Test', nextNode: undefined }
          ]
        }
      }
    }
  }
  
  const errors = DialogueEngine.validateDialogueTree(badNPC)
  
  t.true(errors.length > 0)
  t.true(errors.some(error => error.includes('empty text')))
})

test('validateDialogueTree passes for valid dialogue tree', t => {
  const errors = DialogueEngine.validateDialogueTree(mockNPC)
  
  t.is(errors.length, 0)
})