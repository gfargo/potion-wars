import { type GameState } from '../../types/game.types.js'
import { type NPC, type DialogueNode, type DialogueChoice } from '../../types/npc.types.js'
import { NPCTrading, type NPCTradeOffer, type NPCTradeResult } from '../npcs/NPCTrading.js'

export type TradeDialogueResult = {
  newGameState: GameState
  message: string
  success: boolean
  tradeResult?: NPCTradeResult
}

/**
 * DialogueTrading handles the integration between dialogue system and NPC trading
 * Generates trade-related dialogue nodes and processes trade confirmations
 */
export class DialogueTrading {
  /**
   * Generate a trade menu dialogue node for an NPC
   */
  static generateTradeMenuNode(npc: NPC, gameState: GameState): DialogueNode {
    const offers = NPCTrading.generateTradeOffers(npc, gameState)
    const availableOffers = offers.filter(offer => offer.available)
    const unavailableOffers = offers.filter(offer => !offer.available)

    const choices: DialogueChoice[] = []

    // Add choices for available trades
    for (const offer of availableOffers) {
      const choiceText = this.formatTradeChoiceText(offer)
      choices.push({
        text: choiceText,
        nextNode: `trade_confirm_${offer.id}`,
        conditions: []
      })
    }

    // Add choices for unavailable trades (to show why they're unavailable)
    for (const offer of unavailableOffers) {
      const choiceText = this.formatUnavailableTradeChoiceText(offer)
      choices.push({
        text: choiceText,
        nextNode: `trade_unavailable_${offer.id}`,
        conditions: []
      })
    }

    // Add back/exit option
    choices.push({
      text: 'Never mind, let\'s talk about something else',
      nextNode: npc.dialogue.rootNode
    })

    let menuText = 'Here\'s what I have available:'
    if (availableOffers.length === 0) {
      menuText = 'I don\'t have anything you can afford right now, but here\'s what I offer:'
    }

    return {
      id: 'trade_menu',
      text: menuText,
      choices
    }
  }

  /**
   * Generate a trade confirmation dialogue node
   */
  static generateTradeConfirmationNode(offer: NPCTradeOffer): DialogueNode {
    const action = offer.type === 'buy' ? 'buy' : 'sell'
    const preposition = offer.type === 'buy' ? 'for' : 'to me for'
    
    const confirmationText = `Are you sure you want to ${action} ${offer.quantity} ${offer.itemName} ${preposition} ${offer.totalPrice} gold?`

    return {
      id: `trade_confirm_${offer.id}`,
      text: confirmationText,
      choices: [
        {
          text: 'Yes, make the deal',
          nextNode: `trade_execute_${offer.id}`
        },
        {
          text: 'No, let me think about it',
          nextNode: 'trade_menu'
        }
      ]
    }
  }

  /**
   * Generate a trade execution result node
   */
  static generateTradeExecutionNode(
    offer: NPCTradeOffer, 
    npc: NPC, 
    result: NPCTradeResult
  ): DialogueNode {
    let responseText: string
    let choices: DialogueChoice[]

    if (result.success) {
      responseText = npc.personality.tradeAccept + ' ' + result.message
      choices = [
        {
          text: 'Thank you',
          nextNode: 'trade_menu'
        },
        {
          text: 'Pleasure doing business',
          nextNode: undefined // End dialogue
        }
      ]
    } else {
      responseText = npc.personality.tradeDecline + ' ' + result.message
      choices = [
        {
          text: 'I understand',
          nextNode: 'trade_menu'
        },
        {
          text: 'Maybe next time',
          nextNode: undefined // End dialogue
        }
      ]
    }

    return {
      id: `trade_execute_${offer.id}`,
      text: responseText,
      choices
    }
  }

  /**
   * Generate an unavailable trade explanation node
   */
  static generateUnavailableTradeNode(offer: NPCTradeOffer): DialogueNode {
    const explanationText = `I'd like to make that deal, but ${offer.reason || 'it\'s not possible right now'}.`

    return {
      id: `trade_unavailable_${offer.id}`,
      text: explanationText,
      choices: [
        {
          text: 'I see',
          nextNode: 'trade_menu'
        },
        {
          text: 'Maybe when I\'m better prepared',
          nextNode: undefined // End dialogue
        }
      ]
    }
  }

  /**
   * Process a trade execution through dialogue
   */
  static processTradeExecution(
    offerId: string,
    npc: NPC,
    gameState: GameState
  ): TradeDialogueResult {
    try {
      // Find the trade offer
      const offer = NPCTrading.findTradeOffer(npc, gameState, offerId)
      
      if (!offer) {
        return {
          newGameState: gameState,
          message: 'Trade offer not found',
          success: false
        }
      }

      // Execute the trade
      const tradeResult = NPCTrading.executeTrade(offer, npc, gameState)

      return {
        newGameState: tradeResult.newGameState,
        message: tradeResult.message,
        success: tradeResult.success,
        tradeResult
      }
    } catch (error) {
      return {
        newGameState: gameState,
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        success: false
      }
    }
  }

  /**
   * Generate a complete trading dialogue tree for an NPC
   */
  static generateTradingDialogueTree(npc: NPC, gameState: GameState): Record<string, DialogueNode> {
    const nodes: Record<string, DialogueNode> = {}
    const offers = NPCTrading.generateTradeOffers(npc, gameState)

    // Generate main trade menu
    nodes['trade_menu'] = this.generateTradeMenuNode(npc, gameState)

    // Generate nodes for each trade offer
    for (const offer of offers) {
      if (offer.available) {
        // Confirmation node
        nodes[`trade_confirm_${offer.id}`] = this.generateTradeConfirmationNode(offer)
        
        // Execution result node (will be updated when trade is executed)
        const mockResult: NPCTradeResult = {
          success: true,
          reputationChange: 0,
          message: 'Trade completed successfully',
          newGameState: gameState
        }
        nodes[`trade_execute_${offer.id}`] = this.generateTradeExecutionNode(offer, npc, mockResult)
      } else {
        // Unavailable trade explanation
        nodes[`trade_unavailable_${offer.id}`] = this.generateUnavailableTradeNode(offer)
      }
    }

    return nodes
  }

  /**
   * Update an NPC's dialogue tree to include trading options
   */
  static addTradingToDialogue(npc: NPC, gameState: GameState): NPC {
    const tradingNodes = this.generateTradingDialogueTree(npc, gameState)
    
    // Create updated dialogue with trading nodes
    const updatedDialogue = {
      ...npc.dialogue,
      nodes: {
        ...npc.dialogue.nodes,
        ...tradingNodes
      }
    }

    // Add trade option to root node if NPC has trades
    if (npc.trades && npc.trades.length > 0) {
      const rootNode = updatedDialogue.nodes[npc.dialogue.rootNode]
      if (rootNode) {
        const hasTradeChoice = rootNode.choices.some(choice => choice.nextNode === 'trade_menu')
        
        if (!hasTradeChoice) {
          const updatedRootNode = {
            ...rootNode,
            choices: [
              ...rootNode.choices,
              {
                text: 'I\'d like to see your wares',
                nextNode: 'trade_menu'
              }
            ]
          }
          updatedDialogue.nodes[npc.dialogue.rootNode] = updatedRootNode
        }
      }
    }

    return {
      ...npc,
      dialogue: updatedDialogue
    }
  }

  /**
   * Format trade choice text for display
   */
  private static formatTradeChoiceText(offer: NPCTradeOffer): string {
    const action = offer.type === 'buy' ? 'Buy' : 'Sell'
    const quantityText = offer.quantity > 1 ? `${offer.quantity} ` : ''
    return `${action} ${quantityText}${offer.itemName} (${offer.totalPrice} gold)`
  }

  /**
   * Format unavailable trade choice text for display
   */
  private static formatUnavailableTradeChoiceText(offer: NPCTradeOffer): string {
    const action = offer.type === 'buy' ? 'Buy' : 'Sell'
    const quantityText = offer.quantity > 1 ? `${offer.quantity} ` : ''
    return `${action} ${quantityText}${offer.itemName} (${offer.totalPrice} gold) [Unavailable]`
  }

  /**
   * Check if an NPC should have trading dialogue options
   */
  static shouldHaveTradingDialogue(npc: NPC): boolean {
    return npc.type === 'merchant' && npc.trades !== undefined && npc.trades.length > 0
  }

  /**
   * Get trade-related dialogue choices for current game state
   */
  static getTradeChoices(npc: NPC, gameState: GameState): DialogueChoice[] {
    if (!this.shouldHaveTradingDialogue(npc)) {
      return []
    }

    const offers = NPCTrading.getAvailableOffers(npc, gameState)
    
    if (offers.length === 0) {
      return []
    }

    return [{
      text: 'I\'d like to see your wares',
      nextNode: 'trade_menu'
    }]
  }

  /**
   * Validate that trade dialogue nodes are properly structured
   */
  static validateTradingDialogue(npc: NPC, gameState: GameState): string[] {
    const errors: string[] = []
    
    if (!this.shouldHaveTradingDialogue(npc)) {
      return errors
    }

    const tradingNodes = this.generateTradingDialogueTree(npc, gameState)
    
    // Check that trade menu exists
    if (!tradingNodes['trade_menu']) {
      errors.push('Missing trade_menu node')
    }

    // Check that all referenced nodes exist
    for (const [nodeId, node] of Object.entries(tradingNodes)) {
      for (const choice of node.choices) {
        if (choice.nextNode && !tradingNodes[choice.nextNode] && !npc.dialogue.nodes[choice.nextNode]) {
          errors.push(`Node '${nodeId}' references missing node '${choice.nextNode}'`)
        }
      }
    }

    return errors
  }
}