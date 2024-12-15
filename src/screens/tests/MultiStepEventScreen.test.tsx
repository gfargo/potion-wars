import test from 'ava'
import { screenStates } from '../../core/state/tests/configs/screenStates.js'
import { renderWithContext } from '../../core/state/tests/utils/renderHelper.js'
import { screenInteractions } from '../../core/state/tests/utils/screenTestHelper.js'
import { MultiStepEventScreen } from '../MultiStepEventScreen.js'

test('renders event name and description', (t) => {
  const rendered = renderWithContext(MultiStepEventScreen, {
    ...screenStates.event.simple(),
    screen: 'event',
  })

  screenInteractions.assertScreenContent(t, rendered, 'Market Crash')
  screenInteractions.assertScreenContent(t, rendered, 'The market has crashed!')
})

test('shows all choice options', (t) => {
  const rendered = renderWithContext(MultiStepEventScreen, {
    ...screenStates.event.multiStep(),
    screen: 'event',
  })

  screenInteractions.assertMenuItems(t, rendered, ['Accept', 'Decline'])
})

// Test('allows navigating between choices', async (t) => {
//   const rendered = renderWithContext(MultiStepEventScreen, {
//     ...screenStates.event.multiStep(),
//     screen: 'event',
//   })

//   await screenInteractions.navigateMenu(t, rendered, 'Accept')
//   await screenInteractions.navigateMenu(t, rendered, 'Decline')
// })

// test('handles choice selection', async (t) => {
//   const rendered = renderWithContext(MultiStepEventScreen, {
//     ...screenStates.event.multiStep(),
//     screen: 'event',
//   })

//   await screenInteractions.selectOption(rendered, 'Accept')
//   // Event should be processed and screen should update
//   t.pass()
// })

// test('handles multi-step events', async (t) => {
//   const rendered = renderWithContext(MultiStepEventScreen, {
//     ...screenStates.event.multiStep(),
//     screen: 'event',
//   })

//   // First step
//   screenInteractions.assertScreenContent(t, rendered, 'What do you do?')
//   await screenInteractions.selectOption(rendered, 'Accept')
// })

test('handles events with no choices gracefully', (t) => {
  const rendered = renderWithContext(MultiStepEventScreen, {
    gameState: {
      ...screenStates.event.multiStep().gameState,
      currentEvent: {
        name: 'Invalid Event',
        description: 'An event with no choices',
        steps: [{ description: 'No choices here', choices: [] }],
        probability: 0.1,
        type: 'neutral',
      },
    },
    screen: 'event',
  })

  screenInteractions.assertScreenContent(t, rendered, 'No choices here')
  t.false(rendered.lastFrame()?.includes('❯'))
})
