import test from 'ava'
import { gameStates } from '../../core/state/tests/configs/gameStates.js'
import { renderWithContext } from '../../core/state/tests/utils/renderHelper.js'
import { screenInteractions } from '../../core/state/tests/utils/screenTestHelper.js'
import { useStore } from '../../store/appStore.js'
import { TitleScreen } from '../TitleScreen/index.js'

test('renders title screen with default menu items', (t) => {
  const rendered = renderWithContext(TitleScreen, { screen: 'title' })
  screenInteractions.assertMenuItems(t, rendered, [
    'New Game',
    'Load Game',
    'Help',
    'Quit',
  ])
  rendered.unmount()
})

test('shows continue option when active save exists', (t) => {
  const rendered = renderWithContext(TitleScreen, {
    gameState: gameStates.default(),
    screen: 'title',
  })

  // Set activeSlot > 0 after render — component re-renders via Zustand subscription
  useStore.setState((state) => {
    state.persistence.activeSlot = 1
  })

  screenInteractions.assertScreenContent(t, rendered, 'Continue')
  rendered.unmount()
})
