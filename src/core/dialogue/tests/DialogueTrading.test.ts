import test from 'ava'
import { DialogueTrading } from '../DialogueTrading.js'
import { type NPC, type NPCTrade } from '../../../types/npc.types.js'
import { type GameState } from '../../../types/game.types.js'
import { ReputationManager } from '../../reputation/ReputationManager.js'

// Test helper to create a merchant NPC with trades
const createMerchantNPC = (trades: NPCTrade[] = []): NPC => ({
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A test merchant',
  personality: {
    greeting: 'Welcome to my shop!',
    farewell: 'Come back soon!',
    tradeAccept: 'Excellent choice!',
    tradeDecline: 'Perhaps another time.',
    lowReputation: 'I don\'t trust you.',
    highReputation: 'My valued customer!'
  },
  location: 'Test Market',
  availability: {
    probability: 1.0
  },
  reputation: {},
  trades,
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Welcome to my shop! How can I help you?',
        choices: [
          {
            text: 'Just browsing',
            nextNode: undefined
          }
        ]
      }
    }
  }
})

// Test helper to create a basic game state
const createTestGameState = (overrides: Partial<GameState> = {}): GameState => ({
  day: 1,
  cash: 1000,
  debt: 0,
  health: 100,
  strength: 10,
  agility: 10,
  intelligence: 10,
  location: { name: 'Test Market', description: 'A test market', dangerLevel: 1 },
  inventory: { 'Health Potion': 5, 'Mana Potion': 3 },
  prices: {},
  weather: 'sunny',
  reputation: ReputationManager.initializeReputation(),
  marketData: {},
  tradeHistory: [],
  ...overrides
})

test('generateTradeMenuNode creates menu with available trades', t => {
  const trades: NPCTrade[] = [
    { offer: 'Sword', price: 500, quantity: 1, reputationRequirement: 0 },
    { offer: 'Shield', price: 300, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState()

  const menuNode = DialogueTrading.generateTradeMenuNode(npc, gameState)

  t.is(menuNode.id, 'trade_menu')
  t.true(menuNode.text.includes('available'))
  
  // Should have 2 trade choices + 1 back option
  t.is(menuNode.choices.length, 3)
  
  // Check trade choices
  const tradeChoices = menuNode.choices.filter(choice => choice.nextNode?.startsWith('trade_confirm_'))
  t.is(tradeChoices.length, 2)
  
  // Check back option
  const backChoice = menuNode.choices.find(choice => choice.text.includes('Never mind'))
  t.truthy(backChoice)
  t.is(backChoice?.nextNode, 'greeting')
})

test('generateTradeMenuNode handles unavailable trades', t => {
  const trades: NPCTrade[] = [
    { offer: 'Expensive Item', price: 2000, quantity: 1, reputationRequirement: 0 },
    { offer: 'Cheap Item', price: 100, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState({ cash: 500 }) // Can't afford expensive item

  const menuNode = DialogueTrading.generateTradeMenuNode(npc, gameState)

  t.is(menuNode.choices.length, 3) // 1 available + 1 unavailable + 1 back
  
  const availableChoices = menuNode.choices.filter(choice => 
    choice.nextNode?.startsWith('trade_confirm_')
  )
  const unavailableChoices = menuNode.choices.filter(choice => 
    choice.nextNode?.startsWith('trade_unavailable_')
  )
  
  t.is(availableChoices.length, 1)
  t.is(unavailableChoices.length, 1)
  
  // Unavailable choice should be marked
  t.true(unavailableChoices[0]?.text.includes('[Unavailable]'))
})

test('generateTradeConfirmationNode creates proper confirmation', t => {
  const offer = {
    id: 'test_offer',
    npcId: 'test_merchant',
    npcName: 'Test Merchant',
    type: 'buy' as const,
    itemName: 'Magic Sword',
    quantity: 1,
    pricePerUnit: 500,
    totalPrice: 500,
    reputationRequired: 0,
    available: true
  }
  const confirmNode = DialogueTrading.generateTradeConfirmationNode(offer)

  t.is(confirmNode.id, 'trade_confirm_test_offer')
  t.true(confirmNode.text.includes('buy'))
  t.true(confirmNode.text.includes('Magic Sword'))
  t.true(confirmNode.text.includes('500 gold'))
  
  t.is(confirmNode.choices.length, 2)
  
  const yesChoice = confirmNode.choices.find(choice => choice.text.includes('Yes'))
  const noChoice = confirmNode.choices.find(choice => choice.text.includes('No'))
  
  t.truthy(yesChoice)
  t.truthy(noChoice)
  t.is(yesChoice?.nextNode, 'trade_execute_test_offer')
  t.is(noChoice?.nextNode, 'trade_menu')
})

test('generateTradeExecutionNode handles successful trade', t => {
  const offer = {
    id: 'test_offer',
    npcId: 'test_merchant',
    npcName: 'Test Merchant',
    type: 'buy' as const,
    itemName: 'Magic Sword',
    quantity: 1,
    pricePerUnit: 500,
    totalPrice: 500,
    reputationRequired: 0,
    available: true
  }
  const npc = createMerchantNPC()
  const result = {
    success: true,
    reputationChange: 5,
    message: 'Trade completed successfully!',
    newGameState: createTestGameState()
  }

  const execNode = DialogueTrading.generateTradeExecutionNode(offer, npc, result)

  t.is(execNode.id, 'trade_execute_test_offer')
  t.true(execNode.text.includes('Excellent choice!')) // tradeAccept personality
  t.true(execNode.text.includes('Trade completed successfully!'))
  
  t.is(execNode.choices.length, 2)
  
  const continueChoice = execNode.choices.find(choice => choice.nextNode === 'trade_menu')
  const endChoice = execNode.choices.find(choice => choice.nextNode === undefined)
  
  t.truthy(continueChoice)
  t.truthy(endChoice)
})

test('generateTradeExecutionNode handles failed trade', t => {
  const offer = {
    id: 'test_offer',
    npcId: 'test_merchant',
    npcName: 'Test Merchant',
    type: 'buy' as const,
    itemName: 'Magic Sword',
    quantity: 1,
    pricePerUnit: 500,
    totalPrice: 500,
    reputationRequired: 0,
    available: true
  }
  const npc = createMerchantNPC()
  const result = {
    success: false,
    reputationChange: 0,
    message: 'Insufficient funds',
    newGameState: createTestGameState()
  }

  const execNode = DialogueTrading.generateTradeExecutionNode(offer, npc, result)

  t.true(execNode.text.includes('Perhaps another time.')) // tradeDecline personality
  t.true(execNode.text.includes('Insufficient funds'))
})

test('generateUnavailableTradeNode explains why trade is unavailable', t => {
  const offer = {
    id: 'test_offer',
    npcId: 'test_merchant',
    npcName: 'Test Merchant',
    type: 'buy' as const,
    itemName: 'Expensive Item',
    quantity: 1,
    pricePerUnit: 2000,
    totalPrice: 2000,
    reputationRequired: 0,
    available: false,
    reason: 'Insufficient funds (need 2000, have 500)'
  }
  const unavailableNode = DialogueTrading.generateUnavailableTradeNode(offer)

  t.is(unavailableNode.id, 'trade_unavailable_test_offer')
  t.true(unavailableNode.text.includes('Insufficient funds'))
  
  t.is(unavailableNode.choices.length, 2)
  
  const backChoice = unavailableNode.choices.find(choice => choice.nextNode === 'trade_menu')
  const endChoice = unavailableNode.choices.find(choice => choice.nextNode === undefined)
  
  t.truthy(backChoice)
  t.truthy(endChoice)
})

test('processTradeExecution successfully executes trade', t => {
  const trades: NPCTrade[] = [
    { offer: 'Test Item', price: 200, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState({ cash: 500 })

  const result = DialogueTrading.processTradeExecution('test_merchant_trade_0', npc, gameState)

  t.true(result.success)
  t.truthy(result.tradeResult)
  t.is(result.newGameState.cash, 300) // 500 - 200
  t.is(result.newGameState.inventory['Test Item'], 1)
})

test('processTradeExecution handles non-existent trade', t => {
  const npc = createMerchantNPC()
  const gameState = createTestGameState()

  const result = DialogueTrading.processTradeExecution('non_existent_trade', npc, gameState)

  t.false(result.success)
  t.is(result.message, 'Trade offer not found')
  t.is(result.newGameState, gameState) // No changes
})

test('generateTradingDialogueTree creates complete dialogue tree', t => {
  const trades: NPCTrade[] = [
    { offer: 'Sword', price: 500, quantity: 1, reputationRequirement: 0 },
    { offer: 'Expensive Item', price: 2000, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState({ cash: 600 })

  const dialogueTree = DialogueTrading.generateTradingDialogueTree(npc, gameState)

  // Should have trade menu
  t.truthy(dialogueTree['trade_menu'])
  
  // Should have nodes for available trade (Sword)
  t.truthy(dialogueTree['trade_confirm_test_merchant_trade_0'])
  t.truthy(dialogueTree['trade_execute_test_merchant_trade_0'])
  
  // Should have node for unavailable trade (Expensive Item)
  t.truthy(dialogueTree['trade_unavailable_test_merchant_trade_1'])
})

test('addTradingToDialogue integrates trading into existing dialogue', t => {
  const trades: NPCTrade[] = [
    { offer: 'Test Item', price: 100, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState()

  const updatedNPC = DialogueTrading.addTradingToDialogue(npc, gameState)

  // Should have original dialogue nodes
  t.truthy(updatedNPC.dialogue.nodes['greeting'])
  
  // Should have new trading nodes
  t.truthy(updatedNPC.dialogue.nodes['trade_menu'])
  
  // Root node should have trade option
  const rootNode = updatedNPC.dialogue.nodes['greeting']
  const tradeChoice = rootNode?.choices.find(choice => choice.nextNode === 'trade_menu')
  t.truthy(tradeChoice)
  t.true(tradeChoice?.text.includes('wares'))
})

test('addTradingToDialogue does not duplicate trade choices', t => {
  const trades: NPCTrade[] = [
    { offer: 'Test Item', price: 100, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState()

  // Add trading dialogue twice
  const updatedNPC1 = DialogueTrading.addTradingToDialogue(npc, gameState)
  const updatedNPC2 = DialogueTrading.addTradingToDialogue(updatedNPC1, gameState)

  const rootNode = updatedNPC2.dialogue.nodes['greeting']
  const tradeChoices = rootNode?.choices.filter(choice => choice.nextNode === 'trade_menu') || []
  
  // Should only have one trade choice
  t.is(tradeChoices.length, 1)
})

test('shouldHaveTradingDialogue correctly identifies merchant NPCs with trades', t => {
  const merchantWithTrades = createMerchantNPC([
    { offer: 'Item', price: 100, quantity: 1, reputationRequirement: 0 }
  ])
  const merchantWithoutTrades = createMerchantNPC([])
  const nonMerchant = { ...createMerchantNPC(), type: 'informant' as const }

  t.true(DialogueTrading.shouldHaveTradingDialogue(merchantWithTrades))
  t.false(DialogueTrading.shouldHaveTradingDialogue(merchantWithoutTrades))
  t.false(DialogueTrading.shouldHaveTradingDialogue(nonMerchant))
})

test('getTradeChoices returns trade choices for merchants with available trades', t => {
  const trades: NPCTrade[] = [
    { offer: 'Affordable Item', price: 100, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState()

  const choices = DialogueTrading.getTradeChoices(npc, gameState)

  t.is(choices.length, 1)
  t.true(choices[0]?.text.includes('wares'))
  t.is(choices[0]?.nextNode, 'trade_menu')
})

test('getTradeChoices returns empty array for NPCs without available trades', t => {
  const trades: NPCTrade[] = [
    { offer: 'Expensive Item', price: 2000, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState({ cash: 100 }) // Can't afford anything

  const choices = DialogueTrading.getTradeChoices(npc, gameState)

  t.is(choices.length, 0)
})

test('validateTradingDialogue identifies missing nodes', t => {
  const trades: NPCTrade[] = [
    { offer: 'Test Item', price: 100, quantity: 1, reputationRequirement: 0 }
  ]
  const npc = createMerchantNPC(trades)
  const gameState = createTestGameState()

  // This should pass validation
  const errors = DialogueTrading.validateTradingDialogue(npc, gameState)
  t.is(errors.length, 0)
})

test('formatTradeChoiceText formats buy and sell offers correctly', t => {
  const npc = createMerchantNPC()
  const gameState = createTestGameState()

  // Test through the menu generation which uses the private method
  const menuWithBuy = DialogueTrading.generateTradeMenuNode(
    { ...npc, trades: [{ offer: 'Magic Sword', price: 500, quantity: 1, reputationRequirement: 0 }] },
    gameState
  )
  
  const menuWithSell = DialogueTrading.generateTradeMenuNode(
    { ...npc, trades: [{ offer: 'Health Potion', price: -50, quantity: 3, reputationRequirement: 0 }] },
    gameState
  )

  const buyChoice = menuWithBuy.choices.find(choice => choice.text.includes('Buy'))
  const sellChoice = menuWithSell.choices.find(choice => choice.text.includes('Sell'))

  t.truthy(buyChoice)
  t.truthy(sellChoice)
  t.true(buyChoice?.text.includes('Buy'))
  t.true(buyChoice?.text.includes('Magic Sword'))
  t.true(buyChoice?.text.includes('500 gold'))
  
  t.true(sellChoice?.text.includes('Sell'))
  t.true(sellChoice?.text.includes('3 Health Potion'))
  t.true(sellChoice?.text.includes('150 gold'))
})