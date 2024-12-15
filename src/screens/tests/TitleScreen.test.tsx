import test from 'ava'
import { gameStates } from '../../core/state/tests/configs/gameStates.js'
import { renderWithContext } from '../../core/state/tests/utils/renderHelper.js'
import { screenInteractions } from '../../core/state/tests/utils/screenTestHelper.js'
import { TitleScreen } from '../TitleScreen/index.js'

test('renders title screen with default menu items', (t) => {
  const rendered = renderWithContext(TitleScreen, { screen: 'title' })
  screenInteractions.assertMenuItems(t, rendered, [
    'New Game',
    'Load Game',
    'Help',
    'Quit',
  ])
})

test('shows continue option when active save exists', (t) => {
  const rendered = renderWithContext(TitleScreen, {
    gameState: gameStates.default(),
    screen: 'title',
  })
  screenInteractions.assertScreenContent(t, rendered, 'Continue')
})

// Test('navigates through menu items with arrow keys', async (t) => {
//   const rendered = renderWithContext(TitleScreen, { screen: 'title' })

//   rendered.stdin.write('\u001B[B') // Down arrow

//   await screenInteractions.navigateMenu(t, rendered, 'New Game')
//   await screenInteractions.navigateMenu(t, rendered, 'Load Game')
//   await screenInteractions.navigateMenu(t, rendered, 'Help')
// })

// test('shows help screen when H is pressed', async (t) => {
//   const rendered = renderWithContext(TitleScreen, { screen: 'title' })

//   await screenInteractions.toggleHelp(rendered)
//   screenInteractions.assertScreenContent(t, rendered, 'Help')

//   await screenInteractions.toggleHelp(rendered)
//   t.false(rendered.lastFrame()?.includes('Help'))
// })

// test('shows save slots when Load Game is selected', async (t) => {
//   const rendered = renderWithContext(TitleScreen, { screen: 'title' })

//   await screenInteractions.selectOption(rendered, 'Load Game')
//   screenInteractions.assertScreenContent(t, rendered, 'Select a saved game')
// })

// test('handles escape key to return to main menu', async (t) => {
//   const rendered = renderWithContext(TitleScreen, { screen: 'title' })

//   // Go to Load Game screen
//   await screenInteractions.selectOption(rendered, 'Load Game')
//   screenInteractions.assertScreenContent(t, rendered, 'Select a saved game')

//   // Press escape
//   await screenInteractions.pressKeys(rendered, ['\u001B'])
//   screenInteractions.assertScreenContent(t, rendered, 'New Game')
// })

// test('shows overwrite confirmation when starting new game in used slot', async (t) => {
//   const rendered = renderWithContext(TitleScreen, { screen: 'title' })

//   // Navigate to New Game
//   await screenInteractions.selectOption(rendered, 'New Game')

//   // Select first slot (which has a save)
//   await screenInteractions.pressKeys(rendered, ['\r'])
//   screenInteractions.assertScreenContent(t, rendered, 'Are you sure')
// })

// test('transitions between screens correctly', async (t) => {
//   const rendered = renderWithContext(TitleScreen, { screen: 'title' })

//   // Title to Load Game
//   await assertScreenChange(
//     t,
//     rendered,
//     'New Game',
//     'Select a saved game',
//     async () => {
//       await screenInteractions.selectOption(rendered, 'Load Game')
//     }
//   )

//   // Load Game back to Title
//   await assertScreenChange(
//     t,
//     rendered,
//     'Select a saved game',
//     'New Game',
//     async () => {
//       await screenInteractions.pressKeys(rendered, ['\u001B'])
//     }
//   )
// })
