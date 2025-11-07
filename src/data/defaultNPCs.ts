import type { NPC } from '../types/npc.types.js'

/**
 * Default NPCs that are available in the game
 */
export const DEFAULT_NPCS: NPC[] = [
  {
    id: 'merchant_aldric',
    name: 'Aldric the Merchant',
    type: 'merchant',
    description:
      'A wealthy merchant with connections to rare potion ingredients',
    personality: {
      greeting: 'Greetings, alchemist! I have some interesting wares today.',
      farewell: 'Safe travels, and may your potions brew true!',
      tradeAccept: 'Excellent! A fair deal for both of us.',
      tradeDecline: 'Perhaps another time, then.',
      lowReputation: "I don't deal with those of ill repute.",
      highReputation:
        'Ah, my most valued customer! Let me show you my finest goods.',
    },
    location: "Merchant's District",
    availability: {
      probability: 0.6,
      timeRestriction: [1, 30],
      reputationGate: 0,
    },
    reputation: {
      minimum: -20,
      maximum: 100,
    },
    dialogue: {
      rootNode: 'greeting',
      nodes: {
        greeting: {
          id: 'greeting',
          text: 'Welcome! I have rare ingredients and finished potions for sale.',
          choices: [
            {
              text: 'Show me your wares',
              nextNode: 'trade_menu',
              effects: [],
            },
            {
              text: 'Tell me about the market',
              nextNode: 'market_info',
              effects: [],
            },
            {
              text: 'Just browsing, thanks',
              nextNode: undefined,
              effects: [],
            },
          ],
        },
        trade_menu: {
          id: 'trade_menu',
          text: 'I have several special offers today. What interests you?',
          choices: [
            {
              text: 'Let me think about it',
              nextNode: 'greeting',
              effects: [],
            },
          ],
        },
        market_info: {
          id: 'market_info',
          text: 'The potion market has been quite volatile lately. The Royal Castle always pays top gold for quality healing potions.',
          choices: [
            {
              text: 'Tell me more',
              nextNode: 'market_detail',
              effects: [
                {
                  type: 'reputation',
                  value: 5,
                  location: "Merchant's District",
                },
              ],
            },
            {
              text: 'Thanks for the tip',
              nextNode: undefined,
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
        market_detail: {
          id: 'market_detail',
          text: "Between you and me, I've heard the Enchanted Forest is running low on mana potions. Could be a good opportunity for a savvy alchemist.",
          choices: [
            {
              text: 'I appreciate the information',
              nextNode: undefined,
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
      },
    },
  },
  {
    id: 'informant_sara',
    name: 'Sara the Informant',
    type: 'informant',
    description:
      "A well-connected information broker who knows the city's secrets",
    personality: {
      greeting: "Looking for information? You've come to the right place.",
      farewell: 'Remember, knowledge is power... and profit.',
      tradeAccept: 'This information will serve you well.',
      tradeDecline: 'Your loss. Others will pay for what I know.',
      lowReputation: "I don't share secrets with those who can't be trusted.",
      highReputation: 'For you, my friend, I have some truly valuable intel.',
    },
    location: "Alchemist's Quarter",
    availability: {
      probability: 0.4,
      timeRestriction: [5, 30],
      reputationGate: 10,
    },
    reputation: {
      minimum: 10,
      maximum: 100,
    },
    dialogue: {
      rootNode: 'greeting',
      nodes: {
        greeting: {
          id: 'greeting',
          text: 'I hear things. I know things. What do you want to know?',
          choices: [
            {
              text: 'Any tips on potion prices?',
              nextNode: 'price_intel',
              effects: [],
            },
            {
              text: 'Tell me about other alchemists',
              nextNode: 'rival_info',
              effects: [],
            },
            {
              text: 'Not today',
              nextNode: undefined,
              effects: [],
            },
          ],
        },
        price_intel: {
          id: 'price_intel',
          text: 'Healing potions are in high demand at the Royal Castle. Strength potions fetch good prices in the Peasant Village.',
          choices: [
            {
              text: 'Thanks for the tip',
              nextNode: undefined,
              effects: [
                {
                  type: 'reputation',
                  value: 3,
                  location: "Alchemist's Quarter",
                },
              ],
            },
          ],
        },
        rival_info: {
          id: 'rival_info',
          text: "Your competition is tough, but they make mistakes. Watch the market trends, and you'll find their weak spots.",
          choices: [
            {
              text: 'Good to know',
              nextNode: undefined,
              effects: [
                {
                  type: 'reputation',
                  value: 5,
                  location: "Alchemist's Quarter",
                },
              ],
            },
          ],
        },
      },
    },
  },
  {
    id: 'guard_marcus',
    name: 'Marcus the Guard',
    type: 'guard',
    description: 'A stern but fair royal guard who patrols the city',
    personality: {
      greeting: 'State your business.',
      farewell: 'Move along.',
      tradeAccept: 'This will do.',
      tradeDecline: 'Not good enough.',
      lowReputation: "I've got my eye on you, troublemaker.",
      highReputation: "You're alright in my book. Stay out of trouble.",
    },
    location: 'Royal Castle',
    availability: {
      probability: 0.7,
      timeRestriction: [1, 30],
      reputationGate: -50,
    },
    reputation: {
      minimum: -50,
      maximum: 100,
    },
    dialogue: {
      rootNode: 'greeting',
      nodes: {
        greeting: {
          id: 'greeting',
          text: "Keep your nose clean, alchemist. We don't want any trouble here.",
          choices: [
            {
              text: "Of course, I'm just here to trade",
              nextNode: 'respectful',
              effects: [
                { type: 'reputation', value: 2, location: 'Royal Castle' },
              ],
            },
            {
              text: "I'll be on my way",
              nextNode: undefined,
              effects: [],
            },
          ],
        },
        respectful: {
          id: 'respectful',
          text: 'Good. We need more law-abiding merchants like you.',
          choices: [
            {
              text: 'Thank you, officer',
              nextNode: undefined,
              effects: [
                { type: 'reputation', value: 3, location: 'Royal Castle' },
              ],
            },
          ],
        },
      },
    },
  },
]
