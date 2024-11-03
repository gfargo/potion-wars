
export const TITLE_ART = `
 ____                   __        __
|  _ \\ _ __ _   _  __ _ \\ \\      / /_ _ _ __ ___
| | | | '__| | | |/ _\` | \\ \\ /\\ / / _\` | '__/ __|
| |_| | |  | |_| | (_| |  \\ V  V / (_| | |  \\__ \\
|____/|_|   \\__,_|\\__, |   \\_/\\_/ \\__,_|_|  |___/
                  |___/
`;

export const HELP_TEXT = `
Commands:
(B)uy [drug] [quantity] - Buy drugs
(S)ell [drug] [quantity] - Sell drugs
(T)ravel [location] - Travel to a new location
(R)epay [amount] - Repay your debt
(H)elp - Display this help message
(Q)uit - Quit the game

Goal: Make as much money as possible in 30 days!
`;

export const locations = [
  'Bronx',
  'Ghetto',
  'Central Park',
  'Manhattan',
  'Coney Island',
  'Brooklyn',
];

export const drugs = [
  { name: 'Cocaine', minPrice: 15000, maxPrice: 29000 },
  { name: 'Heroin', minPrice: 5000, maxPrice: 13000 },
  { name: 'Acid', minPrice: 1000, maxPrice: 4400 },
  { name: 'Weed', minPrice: 300, maxPrice: 900 },
  { name: 'Speed', minPrice: 70, maxPrice: 250 },
  { name: 'Ludes', minPrice: 10, maxPrice: 60 },
]

