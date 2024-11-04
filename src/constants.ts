export const GAME_SCREEN_HEIGHT = 30

export const TITLE_ART = `
 ____                   __        __
|  _ \\ _ __ _   _  __ _ \\ \\      / /_ _ _ __ ___
| | | | '__| | | |/ _\` | \\ \\ /\\ / / _\` | '__/ __|
| |_| | |  | |_| | (_| |  \\ V  V / (_| | |  \\__ \\
|____/|_|   \\__,_|\\__, |   \\_/\\_/ \\__,_|_|  |___/
                  |___/
`

export const HELP_TEXT = `
Commands:
Buy - Purchase drugs
Sell - Sell drugs from your inventory
Travel - Move to a new location
Repay - Repay your debt
Help - Display this help message
Quit - Exit the game

Goal: Make as much money as possible in 30 days!
Use the arrow keys to navigate menus and adjust quantities.
Press Enter to confirm your selection.
Press Esc to return to the main menu.
`

export type Location = {
  name: string
  description: string
  dangerLevel: number // 1-10, affects probability of police encounters
}

export const locations: Location[] = [
  {
    name: 'Bronx',
    description:
      'A rough neighborhood with high crime rates but good opportunities for street-level deals.',
    dangerLevel: 7,
  },
  {
    name: 'Manhattan',
    description:
      'The heart of New York City. High-end clientele and steep prices, but also increased police presence.',
    dangerLevel: 5,
  },
  {
    name: 'Brooklyn',
    description:
      'A diverse borough with a mix of gentrified areas and rough neighborhoods. Good for mid-level operations.',
    dangerLevel: 6,
  },
  {
    name: 'Queens',
    description:
      'A large, diverse borough with many immigrant communities. Good for establishing new connections.',
    dangerLevel: 4,
  },
  {
    name: 'Staten Island',
    description:
      'The most suburban borough. Lower demand but also lower risk of police encounters.',
    dangerLevel: 2,
  },
]

export const drugs = [
  { name: 'Cocaine', minPrice: 15_000, maxPrice: 29_000 },
  { name: 'Heroin', minPrice: 5000, maxPrice: 13_000 },
  { name: 'Acid', minPrice: 1000, maxPrice: 4400 },
  { name: 'Weed', minPrice: 300, maxPrice: 900 },
  { name: 'Speed', minPrice: 70, maxPrice: 250 },
  { name: 'Ludes', minPrice: 10, maxPrice: 60 },
]
