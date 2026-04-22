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
              text: 'What brings you to my shop today, traveler?',
              choices: [
                { text: "I'd like to see your wares", nextNode: 'trade' },
                { text: 'Any news from the road?', nextNode: 'information' },
                {
                  text: 'Tell me about your rivals',
                  nextNode: 'rival_gossip',
                },
                { text: 'Just browsing, thanks', nextNode: 'farewell' },
              ],
            },
            trade: {
              id: 'trade',
              text: 'Here are my wares. Common stock over here — but I keep my truly special goods hidden for those I trust.',
              choices: [
                {
                  text: 'Show me the standard stock',
                  nextNode: 'standard_wares',
                },
                {
                  text: 'What makes your rare potions special?',
                  nextNode: 'rare_wares',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 50 },
                  ],
                },
                {
                  text: 'How might I earn your trust for the rare stock?',
                  nextNode: 'trust_advice',
                  conditions: [
                    { type: 'reputation', operator: 'lt', value: 50 },
                  ],
                },
                { text: "I'll look elsewhere", nextNode: 'farewell' },
              ],
            },
            standard_wares: {
              id: 'standard_wares',
              text: 'Wisdom Draughts and Strength Tonics move fastest here. Brew them cheap and sell at the Castle — the nobles pay triple.',
              choices: [
                {
                  text: "What's the trick to pricing?",
                  nextNode: 'pricing_tip',
                  effects: [
                    {
                      type: 'reputation',
                      value: 1,
                      location: "Merchant's District",
                    },
                  ],
                },
                { text: 'Back to the stock', nextNode: 'trade' },
                { text: 'Thanks, goodbye', nextNode: 'farewell' },
              ],
            },
            rare_wares: {
              id: 'rare_wares',
              text: "Only a handful of alchemists in the realm can even identify a Dragon's Breath Potion. They fetch prices that would make a king blush — but only in the right markets.",
              choices: [
                {
                  text: 'Where do the rare potions sell best?',
                  nextNode: 'rare_market_tip',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: "Merchant's District",
                    },
                  ],
                },
                { text: 'Back to the stock', nextNode: 'trade' },
                {
                  text: 'I appreciate the insight',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: "Merchant's District",
                    },
                  ],
                },
              ],
            },
            trust_advice: {
              id: 'trust_advice',
              text: 'Build your name, friend. Trade honestly, avoid the Royal Guard, and when the taverns start whispering your name with respect — come back and see me.',
              choices: [
                {
                  text: 'Fair enough',
                  nextNode: 'greeting',
                  effects: [
                    {
                      type: 'reputation',
                      value: 1,
                      location: "Merchant's District",
                    },
                  ],
                },
                { text: "I'll prove myself", nextNode: 'farewell' },
              ],
            },
            pricing_tip: {
              id: 'pricing_tip',
              text: "Buy low at the Village, sell high at the Castle. But watch the Forest — prices swing wildly when the weather turns.",
              choices: [
                {
                  text: 'Weather affects prices?',
                  nextNode: 'weather_tip',
                },
                { text: 'Useful to know, thanks', nextNode: 'farewell' },
              ],
            },
            weather_tip: {
              id: 'weather_tip',
              text: 'Storms scare off the common peddlers, so supply drops and prices climb. Brave the rain and you\'ll be the only one selling.',
              choices: [
                {
                  text: "I'll keep that in mind",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: "Merchant's District",
                    },
                  ],
                },
              ],
            },
            rare_market_tip: {
              id: 'rare_market_tip',
              text: "Only the Royal Castle — and only through the right intermediary. Captain Marcus keeps a list of approved traders. Get on it, and you'll never brew for coppers again.",
              choices: [
                {
                  text: 'Thank you, truly',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 5,
                      location: "Merchant's District",
                    },
                  ],
                },
              ],
            },
            information: {
              id: 'information',
              text: 'Ah, you want the latest? I hear things — but which things interest you?',
              choices: [
                {
                  text: 'Market prices around the kingdom',
                  nextNode: 'market_trends',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 20 },
                  ],
                },
                {
                  text: 'City gossip',
                  nextNode: 'city_gossip',
                },
                {
                  text: "What's the mood at the Castle?",
                  nextNode: 'castle_mood',
                },
                { text: 'Never mind', nextNode: 'farewell' },
              ],
            },
            market_trends: {
              id: 'market_trends',
              text: "Healing potions are scarce in the Forest — the rangers drained the local stock clearing out bandits. And the Village is hoarding Strength Tonics. Supply is low, prices are climbing.",
              choices: [
                {
                  text: 'Any other regions I should watch?',
                  nextNode: 'regional_tip',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: "Merchant's District",
                    },
                  ],
                },
                {
                  text: "I'll act on that",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: "Merchant's District",
                    },
                  ],
                },
              ],
            },
            regional_tip: {
              id: 'regional_tip',
              text: "The Enchanted Forest runs dry on mana potions every few weeks — stock up when you pass through the Castle and you'll clean up.",
              choices: [
                {
                  text: 'Noted. Thank you',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: "Merchant's District",
                    },
                  ],
                },
              ],
            },
            city_gossip: {
              id: 'city_gossip',
              text: "The Guild is rattled. Two of their inner circle were seen buying up every Invisibility Brew in town. They won't say why, and people are getting nervous.",
              choices: [
                {
                  text: 'Invisibility Brews? For what?',
                  nextNode: 'gossip_deep',
                },
                {
                  text: 'Not my problem — thanks for the chat',
                  nextNode: 'farewell',
                },
              ],
            },
            gossip_deep: {
              id: 'gossip_deep',
              text: "If I had to guess? Someone's planning to move something they'd rather no one saw. And in this city, that usually means trouble for alchemists like us.",
              choices: [
                {
                  text: "I'll be careful",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: "Merchant's District",
                    },
                  ],
                },
              ],
            },
            castle_mood: {
              id: 'castle_mood',
              text: 'Tense. Captain Marcus has doubled patrols, and the King is demanding a personal sampling of every healing potion that enters the grounds. Good for quality. Bad for speed.',
              choices: [
                {
                  text: 'Thanks for the warning',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 1,
                      location: "Merchant's District",
                    },
                  ],
                },
              ],
            },
            rival_gossip: {
              id: 'rival_gossip',
              text: "You want the dirt on the other alchemists? Careful who hears you asking. I'll tell you this much — there's one who's been undercutting half the market.",
              choices: [
                {
                  text: 'Who is it?',
                  nextNode: 'rival_identified',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 15 },
                  ],
                },
                {
                  text: "Let's change the subject",
                  nextNode: 'greeting',
                },
              ],
            },
            rival_identified: {
              id: 'rival_identified',
              text: "Calls himself Vex. Flashy robes, cheap Wisdom Draughts, and a face you'd forget twice. He works the Peasant Village. You'll know his stall by the crowd.",
              choices: [
                {
                  text: "I'll keep an eye out",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: "Merchant's District",
                    },
                  ],
                },
              ],
            },
            farewell: {
              id: 'farewell',
              text: 'Safe travels, friend. Come back when your purse is heavier!',
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
              text: 'The forest has been restless today. What brings you to these woods?',
              choices: [
                {
                  text: 'I seek information about the forest',
                  nextNode: 'information',
                },
                {
                  text: 'Have you seen rival alchemists here?',
                  nextNode: 'rivals_query',
                },
                {
                  text: 'Any travel advice for the paths?',
                  nextNode: 'travel_advice',
                },
                { text: 'Just passing through', nextNode: 'farewell' },
              ],
            },
            information: {
              id: 'information',
              text: 'The forest holds many secrets. Not all of them kind. What would you know?',
              choices: [
                {
                  text: 'Tell me about the dangers here',
                  nextNode: 'dangers',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 10 },
                  ],
                },
                {
                  text: "What's lurking in the eastern paths?",
                  nextNode: 'eastern_paths',
                },
                {
                  text: 'Where can I find rare herbs?',
                  nextNode: 'rare_herbs',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 30 },
                  ],
                },
                {
                  text: "I'm told the oaks speak. Is that true?",
                  nextNode: 'oak_lore',
                },
                { text: 'Nothing, thank you', nextNode: 'farewell' },
              ],
            },
            dangers: {
              id: 'dangers',
              text: "Wolves, yes, but worse — rival alchemists have been spotted gathering rare ingredients by force. Two peddlers this week alone have lost their entire inventories to them.",
              choices: [
                {
                  text: 'Where specifically have they been seen?',
                  nextNode: 'rival_location',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
                {
                  text: "I'll travel armed",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            eastern_paths: {
              id: 'eastern_paths',
              text: "Ambushes. Don't travel the eastern loop alone, and never at dusk. Take the northern bend — it adds a half-day but you'll arrive with your inventory intact.",
              choices: [
                {
                  text: 'Thank you for the warning',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
                { text: "I'll risk the east", nextNode: 'reckless' },
              ],
            },
            rival_location: {
              id: 'rival_location',
              text: "Near the old oak at dawn, they harvest herbs. Near the eastern ridge at dusk, they lay ambush. Never the same place twice — they're watching.",
              choices: [
                {
                  text: "I'll take care",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 4,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            rare_herbs: {
              id: 'rare_herbs',
              text: "Moonshadow blooms by the old oak, but only at dawn before the dew burns off. Glimmerweed grows where the river bends north — and yes, you have to wade. Both fetch a fortune at the Castle.",
              choices: [
                {
                  text: 'Any other rare ingredients?',
                  nextNode: 'rare_herbs_deep',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
                {
                  text: 'This is valuable — thank you',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 5,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            rare_herbs_deep: {
              id: 'rare_herbs_deep',
              text: "Silverleaf, but only in stormy weather. The lightning stirs the sap. Dangerous to gather — more than one peddler has been found near the lightning-struck trees, never woken up.",
              choices: [
                {
                  text: "I'll weigh the risk",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 4,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            rivals_query: {
              id: 'rivals_query',
              text: "Alchemists? Too many. They strip the land and leave nothing for honest traders. There's a pattern, though — they always work in threes. Two scouts and a buyer.",
              choices: [
                {
                  text: 'How can I avoid them?',
                  nextNode: 'avoid_rivals',
                },
                {
                  text: 'Can I turn the pattern on them?',
                  nextNode: 'turn_tables',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 20 },
                  ],
                },
                { text: 'Understood, thank you', nextNode: 'farewell' },
              ],
            },
            avoid_rivals: {
              id: 'avoid_rivals',
              text: "Travel at midday when the scouts are resting. Stay on the marked paths. And if you see three shadows in the treeline, don't run — turn around slowly and walk the way you came.",
              choices: [
                {
                  text: 'Sound advice',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            turn_tables: {
              id: 'turn_tables',
              text: "If you're bold, yes. The buyer always carries the full purse. Draw the scouts off, strike the buyer fast, and the gold is yours. But be warned — the Guild pays handsomely for alchemists who take that path.",
              choices: [
                {
                  text: 'Good to know',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 4,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
                {
                  text: "I don't play that way",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 6,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            travel_advice: {
              id: 'travel_advice',
              text: 'Always carry one healing potion — your own supply, not for sale. The forest does not forgive empty pockets. And move in daylight, always. The things that hunt at night are not interested in trade.',
              choices: [
                {
                  text: 'Wise words',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
                {
                  text: "What hunts at night here?",
                  nextNode: 'night_creatures',
                },
              ],
            },
            night_creatures: {
              id: 'night_creatures',
              text: "Nothing you want to meet carrying only potions. If the forest goes silent — not quiet, silent — climb a tree and stay until dawn. I've pulled three peddlers from their cloaks this month alone.",
              choices: [
                {
                  text: "I'll remember",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            oak_lore: {
              id: 'oak_lore',
              text: "The old oak? It hums, sometimes, when something's off. Rangers listen for it. You won't hear it on your first pass — it takes years. But when an oak stops humming… leave that part of the forest. Quickly.",
              choices: [
                {
                  text: 'Eerie. Thank you',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 1,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            reckless: {
              id: 'reckless',
              text: 'Your choice. But the forest remembers who it warned.',
              choices: [
                {
                  text: "I'll prove you wrong",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: -3,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
                {
                  text: "On second thought, I'll take the north path",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: 'Enchanted Forest',
                    },
                  ],
                },
              ],
            },
            farewell: {
              id: 'farewell',
              text: 'Travel safely, and respect the forest. It gives more to those who listen.',
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
              text: 'State your business at the royal castle, peddler.',
              choices: [
                {
                  text: 'I seek an audience with officials',
                  nextNode: 'official_business',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 40 },
                  ],
                },
                {
                  text: 'I have information to report',
                  nextNode: 'information',
                },
                {
                  text: "I'm here to trade — properly, with papers",
                  nextNode: 'licensed_trade',
                },
                {
                  text: 'Ask about the royal decree',
                  nextNode: 'royal_decrees',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 40 },
                  ],
                },
                { text: 'I was just leaving', nextNode: 'farewell' },
              ],
            },
            official_business: {
              id: 'official_business',
              text: 'Your reputation precedes you. What matter requires the court?',
              choices: [
                {
                  text: 'I wish to join the approved traders list',
                  nextNode: 'approved_list',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 60 },
                  ],
                },
                {
                  text: 'I have a complaint about rivals',
                  nextNode: 'rival_complaint',
                },
                {
                  text: 'What news of the Kingdom?',
                  nextNode: 'kingdom_news',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 40 },
                  ],
                },
                { text: 'Nothing urgent', nextNode: 'farewell' },
              ],
            },
            approved_list: {
              id: 'approved_list',
              text: "The approved list is reserved for those who've proved themselves in coin and conduct. You've done both, by my reading. I'll add your name to the ledger, but keep clean — one slip and it's stricken.",
              choices: [
                {
                  text: 'You have my word',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 8,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            rival_complaint: {
              id: 'rival_complaint',
              text: 'Rivals, you say? Name them. And be precise — false accusations against tradespeople carry their own fines.',
              choices: [
                {
                  text: 'Vex — works the Peasant Village',
                  nextNode: 'vex_response',
                },
                {
                  text: "I'd rather not name names",
                  nextNode: 'farewell',
                },
              ],
            },
            vex_response: {
              id: 'vex_response',
              text: "Vex. That name again. You're the third this month. The crown is aware, peddler. Stay out of his way and let us handle it.",
              choices: [
                {
                  text: "Understood, Captain",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            kingdom_news: {
              id: 'kingdom_news',
              text: "The King has requested extra healing potion stock in anticipation of the border campaign. Any alchemist who can deliver quality Healing Potions in volume will find the crown generous.",
              choices: [
                {
                  text: "How much volume?",
                  nextNode: 'kingdom_volume',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 60 },
                  ],
                },
                {
                  text: "I'll prepare a shipment",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            kingdom_volume: {
              id: 'kingdom_volume',
              text: 'Fifty or more, and the crown rounds up on price. Deliver through me personally — I handle the ledger.',
              choices: [
                {
                  text: "Consider it done",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 5,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            licensed_trade: {
              id: 'licensed_trade',
              text: 'Papers, good. Show me any forged seals and the cell awaits. Are you properly registered?',
              choices: [
                {
                  text: 'Yes, my papers are in order',
                  nextNode: 'papers_verified',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: 'Royal Castle',
                    },
                  ],
                },
                {
                  text: "I... don't have formal papers yet",
                  nextNode: 'papers_missing',
                },
              ],
            },
            papers_verified: {
              id: 'papers_verified',
              text: 'Good. Trade fair, tax in full, and the Castle is open to you. Cross any of those and you\'ll find the cells less welcoming than you\'d think.',
              choices: [
                {
                  text: 'Thank you, Captain',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 2,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            papers_missing: {
              id: 'papers_missing',
              text: "No papers? That's a problem, peddler. Get yourself registered at the Merchant's District clerk before you try to sell within these walls again. Consider this a warning — not a courtesy.",
              choices: [
                {
                  text: 'I understand. Thank you',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: -2,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            royal_decrees: {
              id: 'royal_decrees',
              text: 'The latest decree: all Invisibility Brews must be logged on sale. The King suspects smuggling. Trade them if you wish — but keep the ledger clean or the crown will find you.',
              choices: [
                {
                  text: 'What about castle security?',
                  nextNode: 'castle_security',
                  conditions: [
                    { type: 'reputation', operator: 'gte', value: 60 },
                  ],
                },
                {
                  text: 'I\'ll observe the decree',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            castle_security: {
              id: 'castle_security',
              text: "Patrols are doubled. Eastern and western gates have new inspectors. If you carry rare ingredients without paperwork, expect seizure. I can't override — don't even ask.",
              choices: [
                {
                  text: "I'll keep my papers in order",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 4,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            information: {
              id: 'information',
              text: "Speak quickly, peddler. What do you know?",
              choices: [
                {
                  text: "I've seen suspicious activity in the Forest",
                  nextNode: 'report_forest',
                },
                {
                  text: 'A rival was selling unlicensed potions',
                  nextNode: 'report_unlicensed',
                },
                {
                  text: 'Actually, nothing urgent',
                  nextNode: 'farewell',
                },
              ],
            },
            report_forest: {
              id: 'report_forest',
              text: "We\'re aware. Rangers are posted. But an extra pair of eyes is appreciated — if you see anything specific, return and tell Elena first. She coordinates with us.",
              choices: [
                {
                  text: "I'll do that",
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 4,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            report_unlicensed: {
              id: 'report_unlicensed',
              text: 'Noted. The crown takes unlicensed trade seriously. Your vigilance is remembered — for better or worse, depending on whether your report holds up.',
              choices: [
                {
                  text: 'It holds up',
                  nextNode: 'farewell',
                  effects: [
                    {
                      type: 'reputation',
                      value: 3,
                      location: 'Royal Castle',
                    },
                  ],
                },
              ],
            },
            farewell: {
              id: 'farewell',
              text: 'Move along, citizen. Keep your dealings clean.',
              choices: [],
            },
          },
        },
      },
    ]
  },
}
