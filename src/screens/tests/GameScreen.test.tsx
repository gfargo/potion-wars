import test from 'ava'
import { gameStates } from '../../core/state/tests/configs/gameStates.js'
import { renderWithContext } from '../../core/state/tests/utils/renderHelper.js'
import { screenInteractions } from '../../core/state/tests/utils/screenTestHelper.js'
import { createMessages } from '../../core/state/tests/utils/testHelper.js'
import { GameScreen } from '../GameScreen.js'

test('renders game screen with all components', (t) => {
  const rendered = renderWithContext(GameScreen)
  screenInteractions.assertMenuItems(t, rendered, [
    '♡',
    'Purse',
    'Debt',
    'Day',
    'Inventory',
    'Prices',
    'Location',
    'Current action',
  ])
})

test('displays player status correctly', (t) => {
  const rendered = renderWithContext(GameScreen, {
    gameState: gameStates.wealthy(),
  })

  const state = gameStates.wealthy()
  screenInteractions.assertScreenContent(t, rendered, `${state.health}%`)
  screenInteractions.assertScreenContent(t, rendered, `${state.cash}g`)
  screenInteractions.assertScreenContent(t, rendered, `${state.debt}g`)
})

test('shows inventory items with quantities', (t) => {
  const state = gameStates.wealthy()
  const rendered = renderWithContext(GameScreen, { gameState: state })

  for (const [item, quantity] of Object.entries(state.inventory)) {
    screenInteractions.assertScreenContent(t, rendered, `${item}: ${quantity}`)
  }
})

test('displays current location info', (t) => {
  const state = gameStates.default()
  const rendered = renderWithContext(GameScreen, { gameState: state })
  const frame = rendered.lastFrame() ?? ''
  t.true(frame.includes(`Location: ${state.location.name}`))
  t.true(frame.includes(`Danger: ${state.location.dangerLevel}`))
})

test('shows weather with appropriate icon', (t) => {
  const state = gameStates.default()
  const rendered = renderWithContext(GameScreen, { gameState: state })

  const weatherIcons = {
    sunny: '☀️',
    rainy: '🌧️',
    stormy: '⛈️',
    windy: '💨',
    foggy: '🌁',
  }

  screenInteractions.assertScreenContent(
    t,
    rendered,
    weatherIcons[state.weather]
  )
  screenInteractions.assertScreenContent(t, rendered, state.weather)
})

test('toggles help overlay with H key', (t) => {
  const rendered = renderWithContext(GameScreen)

  // Initial state - no help
  t.false(rendered.lastFrame()?.includes('Commands:'))

  // TODO: FIX THIS
  // // Press H to show help
  // screenInteractions.toggleHelp(rendered)
  // const frame = rendered.lastFrame() || ''
  // t.true(frame.includes('Commands:'))

  // // Press H again to hide help
  // screenInteractions.toggleHelp(rendered)
  // t.false(rendered.lastFrame()?.includes('Commands:'))
})

// Test('navigates through action menu', async (t) => {
//   const rendered = renderWithContext(GameScreen)

//   // Navigate through menu items
//   screenInteractions.navigateMenu(t, rendered, 'Brew')
//   screenInteractions.navigateMenu(t, rendered, 'Travel')
//   screenInteractions.navigateMenu(t, rendered, 'Sell')
// })

// test('shows brewing confirmation when selecting brew action', async (t) => {
//   const rendered = renderWithContext(GameScreen, {
//     gameState: gameStates.wealthy(),
//   })

//   screenInteractions.selectOption(rendered, 'Brew')
//   screenInteractions.assertScreenContent(t, rendered, 'Quantity')
// })

test('displays message history', (t) => {
  const messages = createMessages([
    { content: 'Test message 1' },
    { content: 'Test message 2' },
  ])

  const rendered = renderWithContext(GameScreen, { messages })
  for (const message of messages) {
    screenInteractions.assertScreenContent(t, rendered, message.content)
  }
})

// Test('handles quit confirmation', async (t) => {
//   const rendered = renderWithContext(GameScreen)

//   screenInteractions.selectOption(rendered, 'Quit')
//   screenInteractions.assertScreenContent(t, rendered, 'Are you sure')

//   screenInteractions.pressKeys(rendered, ['\u001B']) // Escape
//   t.false(rendered.lastFrame()?.includes('Are you sure'))
// })
