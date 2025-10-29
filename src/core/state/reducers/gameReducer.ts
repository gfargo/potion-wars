import { locations } from '../../../constants.js'
import { type GameState } from '../../../types/game.types.js'
import { handleCombat } from '../../combat/index.js'
import {
    handleMultiStepEventChoice,
    triggerRandomEvent,
} from '../../events/index.js'
import { generatePrices, initializeGameMarkets } from '../../game/economy.js'
import { brewPotion, sellPotion, travel } from '../../game/index.js'
import { type GameAction } from '../actions/types.js'
import { ReputationManager } from '../../reputation/ReputationManager.js'
import { EnhancedEconomyManager } from '../../game/enhancedEconomy.js'
import { loadGame as loadPersistedGame } from '../../persistence/saveLoad.js'

export const gameReducer = (
  state: GameState,
  action: GameAction
): GameState => {
  switch (action.type) {
    case 'game/brewPotion': {
      const [newState, actionResponseMessage] = brewPotion(
        state,
        action.payload.potionName,
        action.payload.quantity
      )
      console.log(actionResponseMessage)
      return newState
    }

    case 'game/sellPotion': {
      const [newState, actionResponseMessage] = sellPotion(
        state,
        action.payload.potionName,
        action.payload.quantity
      )
      console.log(actionResponseMessage)

      return newState
    }

    case 'game/travel': {
      const [travelState, actionResponseMessage] = travel(
        state,
        action.payload.location
      )
      console.log(actionResponseMessage)

      // Check for combat
      if (Math.random() < travelState.location.dangerLevel / 20) {
        const combatResult = handleCombat(travelState)
        return {
          ...travelState,
          health: combatResult.health,
          cash: combatResult.cash,
          inventory: combatResult.inventory,
        }
      }

      return travelState
    }

    case 'game/repayDebt': {
      // Validate amount is a valid number
      const amount = action.payload.amount
      if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
        console.error('Invalid repay amount:', amount)
        return state
      }

      // Validate player has enough cash
      if (amount > state.cash) {
        console.warn('Not enough cash to repay', amount)
        return state
      }

      // Validate amount doesn't exceed debt
      if (amount > state.debt) {
        console.warn('Repay amount exceeds debt', amount)
        return state
      }

      return {
        ...state,
        cash: state.cash - amount,
        debt: state.debt - amount,
      }
    }

    case 'game/advanceDay': {
      let newState = { ...state, day: state.day + 1 }
      let message = `Day ${newState.day}`
      let eventResult = null

      if (action.payload.triggerEvent) {
        eventResult = triggerRandomEvent(newState)
        newState = {
          ...(newState as GameState),
          ...(eventResult as GameState),
        }
      }

      if (action.payload.triggerDebt) {
        // Apply daily interest to debt
        const newDebt = Math.floor(newState.debt * 1.1) // 10% daily interest
        newState.debt = newDebt
        message += ` Your debt has increased to ${newDebt}g due to interest.`
      }

      return {
        ...newState,
        _result: {
          message,
          eventResult,
        },
      }
    }

    case 'game/updateWeather': {
      return {
        ...state,
        weather: action.payload.weather,
      }
    }

    case 'game/handleEventChoice': {
      const eventResult = handleMultiStepEventChoice(
        state,
        action.payload.choiceIndex
      )
      return { ...state, ...(eventResult as GameState) }
    }

    case 'save/initializeGame': {
      const initialLocation =
        locations[Math.floor(Math.random() * locations.length)]
      const { marketData, tradeHistory } = initializeGameMarkets()

      // Return a completely fresh game state, explicitly clearing all optional fields
      // to prevent artifacts from previous games
      return {
        day: 0,
        cash: 2000,
        debt: 5000,
        health: 100,
        strength: Math.floor(Math.random() * 5) + 5,
        agility: Math.floor(Math.random() * 5) + 5,
        intelligence: Math.floor(Math.random() * 5) + 5,
        location: initialLocation!,
        inventory: {},
        prices: generatePrices(),
        weather: 'sunny',
        // New features with initialized values
        reputation: ReputationManager.initializeReputation(),
        marketData,
        tradeHistory,
        // Explicitly clear all transient state to prevent artifacts
        currentEvent: undefined,
        currentStep: undefined,
        currentNPCInteraction: undefined,
        currentAnimation: undefined,
        lastSave: undefined,
        playerName: undefined
      }
    }

    case 'reputation/updateReputation': {
      return ReputationManager.applyReputationChange(state, action.payload)
    }

    case 'reputation/resetReputation': {
      return {
        ...state,
        reputation: ReputationManager.initializeReputation()
      }
    }

    case 'market/updateMarketData': {
      return {
        ...state,
        marketData: action.payload.marketData
      }
    }

    case 'market/recordTransaction': {
      const { location, potionType, quantity, pricePerUnit, day } = action.payload
      const locationMarket = state.marketData[location]
      
      if (!locationMarket || !locationMarket[potionType]) {
        return state
      }

      const updatedMarketData = EnhancedEconomyManager.recordTransaction(
        locationMarket[potionType],
        quantity,
        day,
        true // Player transaction
      )

      const tradeRecord = {
        day,
        location,
        potionType,
        quantity: Math.abs(quantity),
        pricePerUnit,
        totalValue: Math.abs(quantity) * pricePerUnit,
        type: quantity > 0 ? 'buy' as const : 'sell' as const
      }

      return {
        ...state,
        marketData: {
          ...state.marketData,
          [location]: {
            ...locationMarket,
            [potionType]: updatedMarketData
          }
        },
        tradeHistory: [...state.tradeHistory, tradeRecord]
      }
    }

    case 'market/updateDailyMarkets': {
      return EnhancedEconomyManager.updateMarketDynamics(state)
    }

    case 'market/applySupplyDemandFactors': {
      return EnhancedEconomyManager.applySupplyDemandFactors(state, action.payload.factors)
    }

    case 'npc/startInteraction': {
      // Store the current NPC interaction state
      return {
        ...state,
        currentNPCInteraction: {
          npcId: action.payload.npcId,
          type: action.payload.interactionType,
          active: true
        }
      }
    }

    case 'npc/endInteraction': {
      // Clear the NPC interaction state
      return {
        ...state,
        currentNPCInteraction: undefined
      }
    }

    case 'npc/processDialogue': {
      // This will be handled by the dialogue system
      // For now, just pass through the state
      return state
    }

    case 'animation/trigger': {
      // Store animation state for UI components to react to
      return {
        ...state,
        currentAnimation: {
          type: action.payload.animationType,
          data: action.payload.animationData,
          active: true
        }
      }
    }

    case 'animation/complete': {
      // Clear animation state
      return {
        ...state,
        currentAnimation: undefined
      }
    }

    case 'save/loadGame': {
      // Load game from persistence
      const loadedState = loadPersistedGame(action.payload.slot)
      if (loadedState) {
        console.log(`Loaded game from slot ${action.payload.slot}:`, {
          day: loadedState.day,
          cash: loadedState.cash,
          debt: loadedState.debt,
          location: loadedState.location.name,
          inventory: Object.keys(loadedState.inventory).length
        })
        return loadedState
      }
      console.warn(`Failed to load game from slot ${action.payload.slot}, keeping current state`)
      return state
    }

    default: {
      return state
    }
  }
}
