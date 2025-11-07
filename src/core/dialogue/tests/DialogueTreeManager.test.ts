import test from 'ava'
import { DialogueTreeManager } from '../DialogueTreeManager.js'
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
  location: {
    name: 'Market Square',
    description: 'A bustling marketplace',
    dangerLevel: 2,
  },
  inventory: { 'Health Potion': 3, 'Mana Potion': 1 },
  prices: {},
  weather: 'sunny',
  reputation: {
    global: 10,
    locations: { 'Market Square': 25, Forest: -5 },
    npcRelationships: {},
  },
  marketData: {},
  tradeHistory: [],
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
    lowReputation: "I don't trust you",
    highReputation: 'My valued customer!',
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
            nextNode: 'trade',
          },
          {
            text: 'Tell me about the market',
            nextNode: 'info',
            conditions: [{ type: 'reputation', operator: 'gte', value: 20 }],
          },
          {
            text: 'Goodbye',
            nextNode: undefined,
          },
        ],
      },
      trade: {
        id: 'trade',
        text: 'I have some fine wares for sale.',
        choices: [
          {
            text: 'Show me your goods',
            nextNode: undefined,
            effects: [{ type: 'reputation', value: 1 }],
          },
          {
            text: 'Not interested',
            nextNode: 'greeting',
          },
        ],
      },
      info: {
        id: 'info',
        text: 'The market has been quite active lately.',
        conditions: [{ type: 'reputation', operator: 'gte', value: 20 }],
        choices: [
          {
            text: 'Thanks for the information',
            nextNode: undefined,
            effects: [
              { type: 'cash', value: -10 },
              { type: 'reputation', value: 2 },
            ],
          },
        ],
      },
    },
  },
}

// Helper function to get a fresh manager
const getFreshManager = () => {
  const manager = DialogueTreeManager.getInstance()
  manager.reset()
  return manager
}

test('DialogueTreeManager is a singleton', (t) => {
  const manager1 = DialogueTreeManager.getInstance()
  const manager2 = DialogueTreeManager.getInstance()

  t.is(manager1, manager2)
})

test('startDialogue initializes dialogue state correctly', (t) => {
  const manager = getFreshManager()

  const initialNode = manager.startDialogue(mockNPC, mockGameState)

  t.is(initialNode.id, 'greeting')
  t.is(initialNode.text, 'Hello there! What can I do for you?')
  t.true(manager.isDialogueActive())

  const state = manager.getDialogueState()
  t.truthy(state)
  t.is(state!.npcId, 'test_merchant')
  t.is(state!.currentNodeId, 'greeting')
  t.true(state!.visitedNodes.has('greeting'))
  t.is(state!.conversationHistory.length, 1)
})

test('startDialogue validates dialogue tree', (t) => {
  const manager = getFreshManager()
  const badNPC = {
    ...mockNPC,
    dialogue: {
      rootNode: 'nonexistent',
      nodes: mockNPC.dialogue.nodes,
    },
  }

  t.throws(() => manager.startDialogue(badNPC, mockGameState), {
    message: /Invalid dialogue tree/,
  })
})

test('processChoice advances dialogue correctly', (t) => {
  const manager = getFreshManager()

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)

  // Make a choice
  const choice: DialogueChoice = {
    text: 'I want to trade',
    nextNode: 'trade',
  }

  const result = manager.processChoice(mockNPC, choice, mockGameState)

  t.false(result.isDialogueComplete)
  t.truthy(result.nextNode)
  t.is(result.nextNode!.id, 'trade')
  t.is(result.nextNode!.text, 'I have some fine wares for sale.')

  const state = manager.getDialogueState()
  t.is(state!.currentNodeId, 'trade')
  t.true(state!.visitedNodes.has('trade'))
  t.is(state!.conversationHistory.length, 3) // Greeting + choice + trade
})

test('processChoice ends dialogue when choice has no next node', (t) => {
  const manager = getFreshManager()

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)

  // Make a choice that ends dialogue
  const choice: DialogueChoice = {
    text: 'Goodbye',
    nextNode: undefined,
  }

  const result = manager.processChoice(mockNPC, choice, mockGameState)

  t.true(result.isDialogueComplete)
  t.is(result.nextNode, undefined)
  t.false(manager.isDialogueActive())
})

test('processChoice applies effects to game state', (t) => {
  const manager = getFreshManager()

  // Start dialogue and navigate to trade node
  manager.startDialogue(mockNPC, mockGameState)
  manager.processChoice(
    mockNPC,
    { text: 'I want to trade', nextNode: 'trade' },
    mockGameState
  )

  // Make a choice with effects
  const choice: DialogueChoice = {
    text: 'Show me your goods',
    nextNode: undefined,
    effects: [{ type: 'reputation', value: 1 }],
  }

  const result = manager.processChoice(mockNPC, choice, mockGameState)

  t.is(result.newGameState.reputation.locations['Market Square'], 26) // 25 + 1
  t.true(result.isDialogueComplete)
})

test('processChoice throws error when no active dialogue', (t) => {
  const manager = getFreshManager()

  const choice: DialogueChoice = {
    text: 'Test',
    nextNode: undefined,
  }

  t.throws(() => manager.processChoice(mockNPC, choice, mockGameState), {
    message: /No active dialogue session/,
  })
})

test('processChoice throws error for wrong NPC', (t) => {
  const manager = getFreshManager()
  const otherNPC = { ...mockNPC, id: 'other_npc' }

  // Start dialogue with one NPC
  manager.startDialogue(mockNPC, mockGameState)

  // Try to process choice for different NPC
  const choice: DialogueChoice = {
    text: 'Test',
    nextNode: undefined,
  }

  t.throws(() => manager.processChoice(otherNPC, choice, mockGameState), {
    message: /Active dialogue is with different NPC/,
  })
})

test('processChoice validates choice belongs to current node', (t) => {
  const manager = getFreshManager()

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)

  // Try invalid choice
  const invalidChoice: DialogueChoice = {
    text: 'Invalid choice',
    nextNode: 'nonexistent',
  }

  t.throws(() => manager.processChoice(mockNPC, invalidChoice, mockGameState), {
    message: /Invalid choice for current dialogue node/,
  })
})

test('getCurrentNode returns correct node', (t) => {
  const manager = getFreshManager()

  // No active dialogue
  t.is(manager.getCurrentNode(mockNPC), undefined)

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)

  const currentNode = manager.getCurrentNode(mockNPC)
  t.truthy(currentNode)
  t.is(currentNode!.id, 'greeting')
})

test('hasVisitedNode tracks visited nodes', (t) => {
  const manager = getFreshManager()

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)

  t.true(manager.hasVisitedNode('greeting'))
  t.false(manager.hasVisitedNode('trade'))

  // Navigate to trade node
  manager.processChoice(
    mockNPC,
    { text: 'I want to trade', nextNode: 'trade' },
    mockGameState
  )

  t.true(manager.hasVisitedNode('trade'))
})

test('getConversationHistory returns conversation history', (t) => {
  const manager = getFreshManager()

  // No active dialogue
  t.deepEqual(manager.getConversationHistory(), [])

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)

  let history = manager.getConversationHistory()
  t.is(history.length, 1)
  t.is(history[0]!.nodeId, 'greeting')
  t.is(history[0]!.choiceText, undefined)

  // Make a choice
  manager.processChoice(
    mockNPC,
    { text: 'I want to trade', nextNode: 'trade' },
    mockGameState
  )

  history = manager.getConversationHistory()
  t.is(history.length, 3)
  t.is(history[1]!.choiceText, 'I want to trade')
  t.is(history[2]!.nodeId, 'trade')
})

test('validateChoice validates choices correctly', (t) => {
  const manager = getFreshManager()

  // No active dialogue
  let validation = manager.validateChoice(
    mockNPC,
    { text: 'Test', nextNode: undefined },
    mockGameState
  )
  t.false(validation.isValid)
  t.is(validation.reason, 'No active dialogue session')

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)

  // Valid choice
  validation = manager.validateChoice(
    mockNPC,
    { text: 'I want to trade', nextNode: 'trade' },
    mockGameState
  )
  t.true(validation.isValid)

  // Invalid choice
  validation = manager.validateChoice(
    mockNPC,
    { text: 'Invalid', nextNode: 'nonexistent' },
    mockGameState
  )
  t.false(validation.isValid)
  t.is(validation.reason, 'Choice not available in current node')
})

test('validateChoice checks choice conditions', (t) => {
  const manager = getFreshManager()
  const lowRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { 'Market Square': 10 }, // Below the 20 required for info choice
    },
  }

  // Start dialogue
  manager.startDialogue(mockNPC, lowRepState)

  // Choice with unmet conditions
  const validation = manager.validateChoice(
    mockNPC,
    {
      text: 'Tell me about the market',
      nextNode: 'info',
      conditions: [{ type: 'reputation', operator: 'gte', value: 20 }],
    },
    lowRepState
  )

  t.false(validation.isValid)
  t.is(validation.reason, 'Choice conditions not met')
})

test('getAvailableChoices filters choices by conditions', (t) => {
  const manager = getFreshManager()

  // High reputation state
  manager.startDialogue(mockNPC, mockGameState)
  let choices = manager.getAvailableChoices(mockNPC, mockGameState)
  t.is(choices.length, 3) // All choices available

  // Reset and try with low reputation
  manager.reset()
  const lowRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { 'Market Square': 10 },
    },
  }

  manager.startDialogue(mockNPC, lowRepState)
  choices = manager.getAvailableChoices(mockNPC, lowRepState)
  t.is(choices.length, 2) // Info choice should be filtered out
  t.false(choices.some((choice) => choice.nextNode === 'info'))
})

test('endDialogue ends active dialogue', (t) => {
  const manager = getFreshManager()

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)
  t.true(manager.isDialogueActive())

  // End dialogue
  manager.endDialogue()
  t.false(manager.isDialogueActive())
  t.is(manager.getDialogueState(), undefined)
})

test('getDialogueStats returns correct statistics', (t) => {
  const manager = getFreshManager()

  // No active dialogue
  t.is(manager.getDialogueStats(), undefined)

  // Start dialogue
  const startTime = Date.now()
  manager.startDialogue(mockNPC, mockGameState)

  // Make a choice
  manager.processChoice(
    mockNPC,
    { text: 'I want to trade', nextNode: 'trade' },
    mockGameState
  )

  const stats = manager.getDialogueStats()
  t.truthy(stats)
  t.is(stats!.visitedNodes, 2) // Greeting + trade
  t.is(stats!.conversationLength, 3) // Greeting + choice + trade
  t.true(stats!.startTime >= startTime)
  t.true(stats!.duration >= 0)
})

test('reset clears dialogue state', (t) => {
  const manager = getFreshManager()

  // Start dialogue
  manager.startDialogue(mockNPC, mockGameState)
  t.true(manager.isDialogueActive())

  // Reset
  manager.reset()
  t.false(manager.isDialogueActive())
  t.is(manager.getDialogueState(), undefined)
})
