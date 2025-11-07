import {
  type NPC,
  type NPCType,
  type NPCPersonality,
  type NPCAvailability,
  type NPCDialogue,
} from '../../types/npc.types.js'
import { NPCError } from './NPCManager.js'

export type NPCDataValidationError = {
  field: string
  message: string
  value?: any
}

export const NPCDataLoader = {
  /**
   * Validate NPC data structure
   */
  validateNPCData(data: any): NPCDataValidationError[] {
    const errors: NPCDataValidationError[] = []

    // Required fields
    if (!data.id || typeof data.id !== 'string') {
      errors.push({
        field: 'id',
        message: 'ID is required and must be a string',
        value: data.id,
      })
    }

    if (!data.name || typeof data.name !== 'string') {
      errors.push({
        field: 'name',
        message: 'Name is required and must be a string',
        value: data.name,
      })
    }

    if (
      !data.type ||
      !['merchant', 'informant', 'guard', 'rival', 'citizen'].includes(
        data.type
      )
    ) {
      errors.push({
        field: 'type',
        message:
          'Type must be one of: merchant, informant, guard, rival, citizen',
        value: data.type,
      })
    }

    if (!data.description || typeof data.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description is required and must be a string',
        value: data.description,
      })
    }

    if (!data.location || typeof data.location !== 'string') {
      errors.push({
        field: 'location',
        message: 'Location is required and must be a string',
        value: data.location,
      })
    }

    // Validate personality
    if (!data.personality || typeof data.personality !== 'object') {
      errors.push({
        field: 'personality',
        message: 'Personality is required and must be an object',
        value: data.personality,
      })
    } else {
      const requiredPersonalityFields = [
        'greeting',
        'farewell',
        'tradeAccept',
        'tradeDecline',
        'lowReputation',
        'highReputation',
      ]
      for (const field of requiredPersonalityFields) {
        if (
          !data.personality[field] ||
          typeof data.personality[field] !== 'string'
        ) {
          errors.push({
            field: `personality.${field}`,
            message: `${field} is required and must be a string`,
            value: data.personality[field],
          })
        }
      }
    }

    // Validate availability
    if (!data.availability || typeof data.availability !== 'object') {
      errors.push({
        field: 'availability',
        message: 'Availability is required and must be an object',
        value: data.availability,
      })
    } else {
      if (
        typeof data.availability.probability !== 'number' ||
        data.availability.probability < 0 ||
        data.availability.probability > 1
      ) {
        errors.push({
          field: 'availability.probability',
          message: 'Probability must be a number between 0 and 1',
          value: data.availability.probability,
        })
      }

      if (
        data.availability.timeRestriction &&
        (!Array.isArray(data.availability.timeRestriction) ||
          data.availability.timeRestriction.length !== 2)
      ) {
        errors.push({
          field: 'availability.timeRestriction',
          message:
            'Time restriction must be an array of two numbers [min, max]',
          value: data.availability.timeRestriction,
        })
      }

      if (
        data.availability.weatherRestriction &&
        !Array.isArray(data.availability.weatherRestriction)
      ) {
        errors.push({
          field: 'availability.weatherRestriction',
          message: 'Weather restriction must be an array',
          value: data.availability.weatherRestriction,
        })
      }

      if (
        data.availability.reputationGate !== undefined &&
        typeof data.availability.reputationGate !== 'number'
      ) {
        errors.push({
          field: 'availability.reputationGate',
          message: 'Reputation gate must be a number',
          value: data.availability.reputationGate,
        })
      }
    }

    // Validate reputation requirements
    if (!data.reputation || typeof data.reputation !== 'object') {
      errors.push({
        field: 'reputation',
        message: 'Reputation is required and must be an object',
        value: data.reputation,
      })
    } else {
      if (
        data.reputation.minimum !== undefined &&
        typeof data.reputation.minimum !== 'number'
      ) {
        errors.push({
          field: 'reputation.minimum',
          message: 'Reputation minimum must be a number',
          value: data.reputation.minimum,
        })
      }

      if (
        data.reputation.maximum !== undefined &&
        typeof data.reputation.maximum !== 'number'
      ) {
        errors.push({
          field: 'reputation.maximum',
          message: 'Reputation maximum must be a number',
          value: data.reputation.maximum,
        })
      }

      if (
        data.reputation.location !== undefined &&
        typeof data.reputation.location !== 'string'
      ) {
        errors.push({
          field: 'reputation.location',
          message: 'Reputation location must be a string',
          value: data.reputation.location,
        })
      }
    }

    // Validate dialogue
    if (!data.dialogue || typeof data.dialogue !== 'object') {
      errors.push({
        field: 'dialogue',
        message: 'Dialogue is required and must be an object',
        value: data.dialogue,
      })
    } else {
      if (
        !data.dialogue.rootNode ||
        typeof data.dialogue.rootNode !== 'string'
      ) {
        errors.push({
          field: 'dialogue.rootNode',
          message: 'Root node is required and must be a string',
          value: data.dialogue.rootNode,
        })
      }

      if (!data.dialogue.nodes || typeof data.dialogue.nodes !== 'object') {
        errors.push({
          field: 'dialogue.nodes',
          message: 'Dialogue nodes are required and must be an object',
          value: data.dialogue.nodes,
        })
      } else {
        // Validate that root node exists in nodes
        if (
          data.dialogue.rootNode &&
          !data.dialogue.nodes[data.dialogue.rootNode]
        ) {
          errors.push({
            field: 'dialogue.nodes',
            message: `Root node '${data.dialogue.rootNode}' not found in dialogue nodes`,
            value: data.dialogue.rootNode,
          })
        }

        // Validate each dialogue node
        for (const [nodeId, node] of Object.entries(data.dialogue.nodes)) {
          if (!node || typeof node !== 'object') {
            errors.push({
              field: `dialogue.nodes.${nodeId}`,
              message: 'Dialogue node must be an object',
              value: node,
            })
            continue
          }

          const nodeData = node as any
          if (!nodeData.id || typeof nodeData.id !== 'string') {
            errors.push({
              field: `dialogue.nodes.${nodeId}.id`,
              message: 'Node ID is required and must be a string',
              value: nodeData.id,
            })
          }

          if (!nodeData.text || typeof nodeData.text !== 'string') {
            errors.push({
              field: `dialogue.nodes.${nodeId}.text`,
              message: 'Node text is required and must be a string',
              value: nodeData.text,
            })
          }

          if (!Array.isArray(nodeData.choices)) {
            errors.push({
              field: `dialogue.nodes.${nodeId}.choices`,
              message: 'Node choices must be an array',
              value: nodeData.choices,
            })
          }
        }
      }
    }

    return errors
  },

  /**
   * Load and validate NPC data from JSON
   */
  loadNPCFromData(data: any): NPC {
    const errors = this.validateNPCData(data)

    if (errors.length > 0) {
      const errorMessages = errors
        .map((e) => `${e.field}: ${e.message}`)
        .join(', ')
      throw new NPCError(
        `Invalid NPC data: ${errorMessages}`,
        'INVALID_NPC_DATA',
        data.id
      )
    }

    return {
      id: data.id,
      name: data.name,
      type: data.type as NPCType,
      description: data.description,
      personality: data.personality as NPCPersonality,
      location: data.location,
      availability: data.availability as NPCAvailability,
      reputation: data.reputation,
      trades: data.trades || [],
      information: data.information || [],
      dialogue: data.dialogue as NPCDialogue,
    }
  },

  /**
   * Load multiple NPCs from an array of data
   */
  loadNPCsFromData(dataArray: any[]): NPC[] {
    if (!Array.isArray(dataArray)) {
      throw new NPCError('NPC data must be an array', 'INVALID_NPC_DATA')
    }

    const npcs: NPC[] = []
    const errors: string[] = []

    for (const [i, element] of dataArray.entries()) {
      try {
        const npc = this.loadNPCFromData(element)
        npcs.push(npc)
      } catch (error) {
        if (error instanceof NPCError) {
          errors.push(`NPC ${i}: ${error.message}`)
        } else {
          errors.push(`NPC ${i}: Unknown error`)
        }
      }
    }

    if (errors.length > 0) {
      throw new NPCError(
        `Failed to load NPCs: ${errors.join('; ')}`,
        'INVALID_NPC_DATA'
      )
    }

    return npcs
  },

  /**
   * Get default NPC definitions for all locations
   */
  getDefaultNPCs(): NPC[] {
    return [
      // Market Square NPCs
      {
        id: 'merchant_aldric',
        name: 'Aldric the Merchant',
        type: 'merchant',
        description: 'A weathered trader with keen eyes for quality potions',
        personality: {
          greeting:
            'Welcome, traveler! I have the finest potions in the realm.',
          farewell: 'Safe travels, and may your potions serve you well!',
          tradeAccept: 'A fine deal! Pleasure doing business.',
          tradeDecline: 'Perhaps another time when you have more coin.',
          lowReputation: "I've heard troubling things about you...",
          highReputation: 'Ah, my most valued customer returns!',
        },
        location: "Merchant's District",
        availability: {
          probability: 0.7,
          timeRestriction: [1, 25],
          reputationGate: -10,
        },
        reputation: {
          minimum: -10,
        },
        trades: [
          {
            offer: 'Rare Healing Potion',
            price: 800,
            quantity: 1,
            reputationRequirement: 50,
          },
        ],
        information: [
          {
            id: 'market_trends',
            content:
              'I hear healing potions are in high demand in the Forest lately.',
            category: 'market',
            reputationRequirement: 20,
          },
        ],
        dialogue: {
          rootNode: 'greeting',
          nodes: {
            greeting: {
              id: 'greeting',
              text: 'What brings you to my shop today?',
              choices: [
                {
                  text: "I'd like to see your wares",
                  nextNode: 'trade',
                },
                {
                  text: 'Any news from the road?',
                  nextNode: 'information',
                },
                {
                  text: 'Just browsing, thanks',
                  nextNode: 'farewell',
                },
              ],
            },
            trade: {
              id: 'trade',
              text: 'Here are my finest wares. What catches your eye?',
              choices: [
                {
                  text: 'Show me your rare potions',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 50 },
                  ],
                },
                {
                  text: "I'll look elsewhere",
                  nextNode: 'farewell',
                },
              ],
            },
            information: {
              id: 'information',
              text: 'Ah, you want to know the latest gossip? I hear many things...',
              choices: [
                {
                  text: 'Tell me about market trends',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 20 },
                  ],
                },
                {
                  text: 'Never mind',
                  nextNode: 'farewell',
                },
              ],
            },
            farewell: {
              id: 'farewell',
              text: 'Safe travels, friend!',
              choices: [],
            },
          },
        },
      },

      // Forest NPCs
      {
        id: 'ranger_elena',
        name: 'Elena the Ranger',
        type: 'informant',
        description: 'A skilled forest ranger who knows the woodland paths',
        personality: {
          greeting: 'Greetings, traveler. The forest can be dangerous.',
          farewell: 'May the forest spirits guide your path.',
          tradeAccept: 'This will serve you well in the wilderness.',
          tradeDecline: 'I understand. The forest provides what we need.',
          lowReputation: 'The forest whispers of your misdeeds...',
          highReputation: 'The trees speak well of you, friend.',
        },
        location: 'Enchanted Forest',
        availability: {
          probability: 0.5,
          weatherRestriction: ['sunny', 'windy'],
          reputationGate: 0,
        },
        reputation: {
          minimum: 0,
        },
        information: [
          {
            id: 'forest_dangers',
            content:
              'Beware the eastern paths - rival alchemists have been spotted there.',
            category: 'location',
            reputationRequirement: 10,
          },
          {
            id: 'herb_locations',
            content: 'The best herbs grow near the old oak, but only at dawn.',
            category: 'general',
            reputationRequirement: 30,
          },
        ],
        dialogue: {
          rootNode: 'greeting',
          nodes: {
            greeting: {
              id: 'greeting',
              text: 'What brings you to these woods?',
              choices: [
                {
                  text: 'I seek information about the forest',
                  nextNode: 'information',
                },
                {
                  text: 'Just passing through',
                  nextNode: 'farewell',
                },
              ],
            },
            information: {
              id: 'information',
              text: 'The forest holds many secrets. What would you know?',
              choices: [
                {
                  text: 'Tell me about dangers here',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 10 },
                  ],
                },
                {
                  text: 'Where can I find rare herbs?',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 30 },
                  ],
                },
                {
                  text: 'Nothing, thank you',
                  nextNode: 'farewell',
                },
              ],
            },
            farewell: {
              id: 'farewell',
              text: 'Travel safely, and respect the forest.',
              choices: [],
            },
          },
        },
      },

      // Castle NPCs
      {
        id: 'guard_captain_marcus',
        name: 'Captain Marcus',
        type: 'guard',
        description: 'A stern castle guard captain with years of experience',
        personality: {
          greeting: 'State your business at the castle.',
          farewell: 'Move along, citizen.',
          tradeAccept: 'This transaction is acceptable.',
          tradeDecline: 'The crown has no need for such things.',
          lowReputation: 'You are not welcome here, troublemaker.',
          highReputation: 'Ah, a citizen of good standing. Welcome.',
        },
        location: 'Royal Castle',
        availability: {
          probability: 0.8,
          reputationGate: 20,
        },
        reputation: {
          minimum: 20,
        },
        information: [
          {
            id: 'royal_decree',
            content: 'The King has issued new regulations on potion trading.',
            category: 'general',
            reputationRequirement: 40,
          },
          {
            id: 'castle_security',
            content:
              "We've increased patrols due to recent alchemist conflicts.",
            category: 'location',
            reputationRequirement: 60,
          },
        ],
        dialogue: {
          rootNode: 'greeting',
          nodes: {
            greeting: {
              id: 'greeting',
              text: 'What is your business at the royal castle?',
              choices: [
                {
                  text: 'I seek an audience with officials',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 40 },
                  ],
                  nextNode: 'official_business',
                },
                {
                  text: 'I have information to share',
                  nextNode: 'information',
                },
                {
                  text: 'I was just leaving',
                  nextNode: 'farewell',
                },
              ],
            },
            official_business: {
              id: 'official_business',
              text: 'Your reputation precedes you. What news do you bring?',
              choices: [
                {
                  text: 'Tell me about recent royal decrees',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 40 },
                  ],
                },
                {
                  text: 'What about castle security?',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 60 },
                  ],
                },
                {
                  text: 'Nothing urgent',
                  nextNode: 'farewell',
                },
              ],
            },
            information: {
              id: 'information',
              text: 'Speak quickly. What do you know?',
              choices: [
                {
                  text: 'I have nothing to report',
                  nextNode: 'farewell',
                },
              ],
            },
            farewell: {
              id: 'farewell',
              text: 'Keep your nose clean, citizen.',
              choices: [],
            },
          },
        },
      },
    ]
  },
}
