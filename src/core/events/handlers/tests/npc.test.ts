import test from 'ava'
import {
    createNPCEvent,
    startNPCDialogue,
    handleNPCDialogueChoice,
    createSimpleNPCEncounter,
    createNPCTradingEvent,
    validateNPCEvent,
    getAvailableNPCEvents
} from '../npc.js'
import { DialogueTreeManager } from '../../../dialogue/index.js'
import { type GameState } from '../../../../types/game.types.js'
import { type NPC, type DialogueChoice } from '../../../../types/npc.types.js'

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
    greeting: 'Welcome to my shop!',
    farewell: 'Goodbye!',
    tradeAccept: 'Excellent choice!',
    tradeDecline: 'Maybe another time',
    lowReputation: 'I don\'t trust you',
    highReputation: 'My valued customer!'
  },
  location: 'Market Square',
  availability: { 
    probability: 0.8,
    timeRestriction: [1, 30],
    weatherRestriction: ['sunny', 'cloudy'] as any[]
  },
  reputation: { minimum: 0 },
  trades: [
    {
      offer: 'Magic Sword',
      price: 50,
      quantity: 1,
      reputationRequirement: 20
    },
    {
      offer: 'Health Potion',
      price: 10,
      quantity: 5
    }
  ],
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
      }
    }
  }
}

test.beforeEach(() => {
  // Reset dialogue manager before each test
  DialogueTreeManager.getInstance().reset()
})

test('createNPCEvent creates basic event structure', t => {
  const event = createNPCEvent(mockNPC)
  
  t.is(event.id, 'npc_encounter_test_merchant')
  t.is(event.name, 'Encounter: Test Merchant')
  t.is(event.description, 'Welcome to my shop!')
  t.is(event.probability, 0.8)
  t.deepEqual(event.locationSpecific, ['Market Square'])
  t.deepEqual(event.weatherSpecific, ['sunny', 'cloudy'])
  t.deepEqual(event.timeSpecific, [1, 30])
  t.is(event.type, 'neutral')
  t.deepEqual(event.steps, [])
})

test('startNPCDialogue initializes dialogue event', t => {
  const result = startNPCDialogue(mockNPC, mockGameState)
  
  t.is(result.event.id, 'npc_dialogue_test_merchant')
  t.is(result.event.name, 'Talking to Test Merchant')
  t.is(result.event.steps.length, 1)
  
  const firstStep = result.event.steps[0]!
  t.is(firstStep.description, 'Test Merchant: "Hello there! What can I do for you?"')
  t.is(firstStep.choices.length, 3) // All choices should be available with high reputation
  
  t.truthy(result.newGameState.currentEvent)
  t.is(result.newGameState.currentStep, 0)
})

test('startNPCDialogue filters choices based on reputation', t => {
  const lowRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { 'Market Square': 10 } // Below the 20 required for info choice
    }
  }
  
  const result = startNPCDialogue(mockNPC, lowRepState)
  
  const firstStep = result.event.steps[0]!
  t.is(firstStep.choices.length, 2) // Info choice should be filtered out
  t.false(firstStep.choices.some(choice => choice.text.includes('market')))
})

test('handleNPCDialogueChoice processes choice and continues dialogue', t => {
  // Start dialogue first
  const dialogueResult = startNPCDialogue(mockNPC, mockGameState)
  let gameState = dialogueResult.newGameState
  
  // Make a choice that continues dialogue
  const choice: DialogueChoice = {
    text: 'I want to trade',
    nextNode: 'trade'
  }
  
  const result = handleNPCDialogueChoice(mockNPC, choice, gameState)
  
  t.truthy(result.currentEvent)
  t.is(result.currentStep, 1)
  
  const event = result.currentEvent as any
  t.is(event.steps.length, 2)
  t.is(event.steps[1]!.description, 'Test Merchant: "I have some fine wares for sale."')
})

test('handleNPCDialogueChoice ends dialogue when choice has no next node', t => {
  // Start dialogue first
  const dialogueResult = startNPCDialogue(mockNPC, mockGameState)
  let gameState = dialogueResult.newGameState
  
  // Make a choice that ends dialogue
  const choice: DialogueChoice = {
    text: 'Goodbye',
    nextNode: undefined
  }
  
  const result = handleNPCDialogueChoice(mockNPC, choice, gameState)
  
  t.is(result.currentEvent, undefined)
  t.is(result.currentStep, undefined)
})

test('handleNPCDialogueChoice applies effects', t => {
  // Start dialogue and navigate to trade node
  const dialogueResult = startNPCDialogue(mockNPC, mockGameState)
  let gameState = dialogueResult.newGameState
  
  // Navigate to trade node
  gameState = handleNPCDialogueChoice(mockNPC, { text: 'I want to trade', nextNode: 'trade' }, gameState)
  
  // Make a choice with effects
  const choice: DialogueChoice = {
    text: 'Show me your goods',
    nextNode: undefined,
    effects: [{ type: 'reputation', value: 1 }]
  }
  
  const result = handleNPCDialogueChoice(mockNPC, choice, gameState)
  
  t.is(result.reputation.locations['Market Square'], 26) // 25 + 1
  t.is(result.currentEvent, undefined) // Dialogue should end
})

test('handleNPCDialogueChoice throws error when no active dialogue', t => {
  const choice: DialogueChoice = {
    text: 'Test',
    nextNode: undefined
  }
  
  t.throws(() => handleNPCDialogueChoice(mockNPC, choice, mockGameState), {
    message: /No active dialogue to handle choice/
  })
})

test('createSimpleNPCEncounter creates encounter event', t => {
  const event = createSimpleNPCEncounter(mockNPC)
  
  t.is(event.id, 'npc_simple_test_merchant')
  t.is(event.name, 'You encounter Test Merchant')
  t.true(event.description.includes('A friendly merchant'))
  t.true(event.description.includes('Welcome to my shop!'))
  t.is(event.steps.length, 1)
  
  const step = event.steps[0]!
  t.is(step.choices.length, 2)
  t.is(step.choices[0]!.text, 'Talk to them')
  t.is(step.choices[1]!.text, 'Walk away')
})

test('createNPCTradingEvent creates trading event', t => {
  const event = createNPCTradingEvent(mockNPC)
  
  t.truthy(event)
  t.is(event!.id, 'npc_trade_test_merchant')
  t.is(event!.name, 'Trading with Test Merchant')
  t.is(event!.type, 'positive')
  t.is(event!.probability, 0.8 * 0.7) // Base probability * 0.7
  
  const step = event!.steps[0]!
  t.is(step.choices.length, 3) // 2 trades + "Not interested"
  t.true(step.description.includes('Magic Sword: 50 gold'))
  t.true(step.description.includes('Health Potion: 10 gold'))
})

test('createNPCTradingEvent returns null for NPC without trades', t => {
  const npcWithoutTrades = { ...mockNPC, trades: undefined }
  
  const event = createNPCTradingEvent(npcWithoutTrades)
  
  t.is(event, null)
})

test('validateNPCEvent validates location', t => {
  t.true(validateNPCEvent(mockNPC, mockGameState))
  
  const wrongLocationState = {
    ...mockGameState,
    location: { name: 'Forest', description: 'A dark forest', dangerLevel: 5 }
  }
  
  t.false(validateNPCEvent(mockNPC, wrongLocationState))
})

test('validateNPCEvent validates reputation requirements', t => {
  const npcWithRepReq = {
    ...mockNPC,
    reputation: { minimum: 50 }
  }
  
  t.false(validateNPCEvent(npcWithRepReq, mockGameState)) // Only has 25 reputation
  
  const highRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { 'Market Square': 60 }
    }
  }
  
  t.true(validateNPCEvent(npcWithRepReq, highRepState))
})

test('validateNPCEvent validates time restrictions', t => {
  const npcWithTimeRestriction = {
    ...mockNPC,
    availability: {
      ...mockNPC.availability,
      timeRestriction: [10, 20] as [number, number]
    }
  }
  
  t.false(validateNPCEvent(npcWithTimeRestriction, mockGameState)) // Day 5 is outside range
  
  const validTimeState = {
    ...mockGameState,
    day: 15
  }
  
  t.true(validateNPCEvent(npcWithTimeRestriction, validTimeState))
})

test('validateNPCEvent validates weather restrictions', t => {
  const npcWithWeatherRestriction = {
    ...mockNPC,
    availability: {
      ...mockNPC.availability,
      weatherRestriction: ['rainy'] as any[]
    }
  }
  
  t.false(validateNPCEvent(npcWithWeatherRestriction, mockGameState)) // Weather is sunny
  
  const rainyState = {
    ...mockGameState,
    weather: 'rainy' as any
  }
  
  t.true(validateNPCEvent(npcWithWeatherRestriction, rainyState))
})

test('validateNPCEvent validates reputation gate', t => {
  const npcWithRepGate = {
    ...mockNPC,
    availability: {
      ...mockNPC.availability,
      reputationGate: 50
    }
  }
  
  t.false(validateNPCEvent(npcWithRepGate, mockGameState)) // Only has 25 reputation
  
  const highRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { 'Market Square': 60 }
    }
  }
  
  t.true(validateNPCEvent(npcWithRepGate, highRepState))
})

test('getAvailableNPCEvents returns valid events', t => {
  const npcs = [mockNPC]
  const events = getAvailableNPCEvents(npcs, mockGameState)
  
  t.is(events.length, 3) // dialogue, trading, simple encounter
  
  const eventIds = events.map(e => e.id)
  t.true(eventIds.includes('npc_encounter_test_merchant'))
  t.true(eventIds.includes('npc_trade_test_merchant'))
  t.true(eventIds.includes('npc_simple_test_merchant'))
})

test('getAvailableNPCEvents filters invalid NPCs', t => {
  const invalidNPC = {
    ...mockNPC,
    location: 'Forest' // Wrong location
  }
  
  const npcs = [mockNPC, invalidNPC]
  const events = getAvailableNPCEvents(npcs, mockGameState)
  
  t.is(events.length, 3) // Only events for valid NPC
  
  const eventIds = events.map(e => e.id)
  t.false(eventIds.some(id => id?.includes('Forest')))
})

test('trading event choice executes trade successfully', t => {
  const event = createNPCTradingEvent(mockNPC)!
  const tradeChoice = event.steps[0]!.choices[1]! // Health Potion trade
  
  const result = tradeChoice.effect(mockGameState)
  
  t.is(result.cash, 90) // 100 - 10
  t.is(result.inventory['Health Potion'], 8) // 3 + 5
  t.is(result.reputation.locations['Market Square'], 26) // 25 + 1
  t.is(result.currentEvent, undefined) // Event should end
  t.truthy(result._result?.message)
})

test('trading event choice fails with insufficient cash', t => {
  const poorState = { ...mockGameState, cash: 5 }
  const event = createNPCTradingEvent(mockNPC)!
  const expensiveTradeChoice = event.steps[0]!.choices[0]! // Magic Sword for 50 gold
  
  const result = expensiveTradeChoice.effect(poorState)
  
  t.is(result.cash, 5) // Unchanged
  t.is(result.inventory['Magic Sword'], undefined) // No item added
  t.truthy(result._result?.message)
  t.true(result._result!.message!.includes("don't have enough gold"))
})

test('trading event choice fails with insufficient reputation', t => {
  const lowRepState = {
    ...mockGameState,
    reputation: {
      ...mockGameState.reputation,
      locations: { 'Market Square': 10 } // Below 20 required for Magic Sword
    }
  }
  
  const event = createNPCTradingEvent(mockNPC)!
  const restrictedTradeChoice = event.steps[0]!.choices[0]! // Magic Sword requires rep 20
  
  const result = restrictedTradeChoice.effect(lowRepState)
  
  t.is(result.cash, 100) // Unchanged
  t.is(result.inventory['Magic Sword'], undefined) // No item added
  t.truthy(result._result?.message)
  t.true(result._result!.message!.includes("don't meet the reputation requirements"))
})