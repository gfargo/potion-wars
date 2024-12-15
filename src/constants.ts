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
