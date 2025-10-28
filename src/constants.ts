import { type Location } from './types/game.types.js'

export const GAME_SCREEN_HEIGHT = 28

export const TITLE_ART = ` ____       _   _             __        __
|  _ \\ ___ | |_(_) ___  _ __  \\ \\      / /_ _ _ __ ___
| |_) / _ \\| __| |/ _ \\| '_ \\  \\ \\ /\\ / / _\` | '__/ __|
|  __/ (_) | |_| | (_) | | | |  \\ V  V / (_| | |  \\__ \\
|_|   \\___/ \\__|_|\\___/|_| |_|   \\_/\\_/ \\__,_|_|  |___/
`

export const HELP_TEXT = `Commands:

Brew - Create potions
Sell - Sell potions from your inventory
Travel - Move to a new location in the kingdom
Repay - Repay your debt
Help - Display this help message
Quit - Exit the game

Goal: Make as much gold as possible in 30 days!
Use the arrow keys to navigate menus and adjust quantities.
Press Enter to confirm your selection.
`

export const HELP_SECTIONS = {
  basic: {
    title: 'Basic Commands',
    content: `Commands:

Brew - Create potions
Sell - Sell potions from your inventory
Travel - Move to a new location in the kingdom
Repay - Repay your debt
Help - Display this help message
Quit - Exit the game

Goal: Make as much gold as possible in 30 days!
Use the arrow keys to navigate menus and adjust quantities.
Press Enter to confirm your selection.`
  },
  
  npcs: {
    title: 'NPC Interactions',
    content: `NPC System:

When traveling, you may encounter NPCs (Non-Player Characters) in different locations.
Each NPC has unique dialogue, trades, and information to offer.

Types of NPCs:
• Merchants - Offer special trades and unique potions
• Informants - Provide market intelligence and tips
• Guards - May inspect your goods or offer protection
• Citizens - Share local gossip and rumors
• Rivals - Compete with you for business

Interacting with NPCs:
• Choose dialogue options carefully - they affect your reputation
• Some NPCs require good reputation to access their best offers
• Build relationships over time for better deals and exclusive information
• NPCs remember your past interactions and choices`
  },
  
  reputation: {
    title: 'Reputation System',
    content: `Reputation System:

Your reputation affects how NPCs treat you and the prices you receive.

Reputation Levels:
• Despised (-50 or lower) - NPCs refuse to deal with you
• Disliked (-50 to -20) - Poor prices and limited options
• Neutral (-20 to 20) - Standard interactions
• Liked (20 to 50) - Better prices and more opportunities
• Respected (50 to 80) - Exclusive trades and valuable information
• Revered (80+) - The best deals and rarest opportunities

Building Reputation:
• Complete successful trades with NPCs
• Make honest dialogue choices
• Help NPCs with their problems
• Avoid aggressive or dishonest behavior

Reputation is tracked both globally and per location.
Your actions in one area may not affect your standing elsewhere.`
  },
  
  market: {
    title: 'Enhanced Market System',
    content: `Market Dynamics:

The market now responds to supply and demand, creating strategic opportunities.

Market Features:
• Dynamic Pricing - Prices change based on trading activity
• Price History - Track trends to identify good buying/selling times
• Supply & Demand - Large trades affect future prices
• Market Trends - Rising, falling, or stable price patterns
• Reputation Bonuses - Better reputation = better base prices

Market Intelligence:
• Talk to Informant NPCs for market tips
• Watch for price trend indicators
• Buy low when supply is high, sell high when demand peaks
• Different locations have different market conditions
• Weather and events can affect potion demand

Reading Market Data:
• ↗ Rising prices - good time to sell
• ↘ Falling prices - good time to buy
• → Stable prices - normal market conditions
• Your reputation modifier is shown next to base prices`
  },
  
  animations: {
    title: 'Visual Features',
    content: `Animation System:

The game includes ASCII art animations to enhance the experience.

Animation Features:
• NPC Portraits - Animated character representations during encounters
• Travel Animations - Visual journey between locations
• Encounter Effects - Special animations for events and interactions
• Market Displays - Enhanced visual presentation of trading data

NPC Animations:
• Idle - NPCs have subtle movement when not interacting
• Talking - Animated expressions during dialogue
• Trading - Special animations during trade negotiations

Travel System:
• Random travel animations show your journey
• Different animations for different types of travel
• Location-specific visual elements
• Smooth transitions between areas

The animations are designed to enhance immersion while maintaining
the classic text-based game feel.`
  },
  
  advanced: {
    title: 'Advanced Strategies',
    content: `Advanced Tips:

Reputation Management:
• Focus on building reputation in 1-2 key locations first
• High reputation NPCs offer the most valuable information
• Don't neglect global reputation - it affects all interactions

Market Strategy:
• Monitor multiple locations for price arbitrage opportunities
• Use NPC information to predict market changes
• Time your large trades to maximize market impact
• Build relationships with Merchant NPCs for exclusive deals

NPC Relationships:
• Remember NPC personalities and preferences
• Some NPCs only appear under certain conditions
• Rival encounters can be turned into opportunities with skill
• Information from NPCs can be more valuable than gold

Risk vs Reward:
• Higher reputation areas offer better opportunities but more competition
• Rival alchemists can disrupt your plans but also provide challenges
• Balance relationship building with profit maximization
• Use market intelligence to stay ahead of competitors`
  }
}

export const locations: Location[] = [
  {
    name: "Alchemist's Quarter",
    description:
      'A bustling area filled with potion shops and ingredient markets. Great for brewing and selling, but watch out for rival alchemists.',
    dangerLevel: 7,
  },
  {
    name: 'Royal Castle',
    description:
      'The seat of power in the kingdom. High-end clientele and steep prices, but also increased royal guard presence.',
    dangerLevel: 5,
  },
  {
    name: "Merchant's District",
    description:
      'A diverse area with a mix of wealthy traders and common folk. Good for mid-level operations.',
    dangerLevel: 6,
  },
  {
    name: 'Enchanted Forest',
    description:
      'A magical woodland area rich in rare ingredients. Good for establishing new connections with magical creatures.',
    dangerLevel: 4,
  },
  {
    name: 'Peasant Village',
    description:
      'A quiet rural area. Lower demand but also lower risk of royal guard encounters.',
    dangerLevel: 2,
  },
]

export const potions = [
  { name: 'Elixir of Immortality', minPrice: 15_000, maxPrice: 29_000 },
  { name: "Dragon's Breath Potion", minPrice: 5000, maxPrice: 13_000 },
  { name: 'Invisibility Brew', minPrice: 1000, maxPrice: 4400 },
  { name: 'Love Potion', minPrice: 300, maxPrice: 900 },
  { name: 'Strength Tonic', minPrice: 70, maxPrice: 250 },
  { name: 'Wisdom Draught', minPrice: 10, maxPrice: 60 },
]

export const phrases = {
  newDayClosers: [
    'What will today bring?',
    'Another day, another opportunity.',
    'The sun rises on a new day.',
    'The kingdom awaits your next move.',
    'The alchemist rises from slumber.',
    'Make it a great one!',
    'Time to get brewing!',
    'Those potions won’t peddle themselves!',
  ],
}

export const ASCII_PORTRAITS = {
  wizard: `
    /\\
   /  \\
  /    \\
 /______\\
  |    |
  |    |
 (o  o)
  \\__/
   ||
  /_\\`,
  warrior: `
   ,^.
  / \\ \\
 /___\\ \\
(  o  ) |
 \\ = /  |
  )==(  /
 /    \\/
/      \\`,
  rogue: `
   _____
  /     \\
 /       \\
|  (o)(o) |
|    <>   |
 \\  ___  /
  \\_____/
    | |
    | |
   /   \\`,
  elf: `
    ^
   / \\
  /   \\
 /     \\
|  o o  |
 \\ --- /
  \\___/
   | |
  /   \\
 /     \\`,
  dwarf: `
   ___
  /   \\
 | o o |
 |  ^  |
 | --- |
  \\_-_/
   | |
  /   \\
 /     \\`,
  dragon: `
    /\\    /\\
   /  \\__/  \\
  /  ^    ^  \\
 /  (o)  (o)  \\
/  ____\\/____  \\
\\    \\/\\/\\/    /
 \\__________  /
     ||  ||`,
  goblin: `
   ,---,
  /     \\
 | ^   ^ |
 |   <   |
 |  ___  |
  \\_____/
    | |
   / | \\
  /  |  \\`,
  troll: `
    ____
   /    \\
  | o  o |
  |   >  |
  |  --  |
   \\____/
    |  |
   /|  |\\
  / |  | \\`,
  fairy: `
     *
    / \\
   /   \\
  |  o  |
   \\ - /
    | |
   / | \\
  *  |  *
     |`,
  centaur: `
    ____
   /    \\
  | o  o |
  |  --  |
   \\____/
   /    \\
  |      |
 /|      |\\
/ |      | \\`,
}
