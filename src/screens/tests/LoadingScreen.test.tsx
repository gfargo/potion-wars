import test from 'ava'
import { renderWithContext } from '../../core/state/tests/utils/renderHelper.js'
import { screenInteractions } from '../../core/state/tests/utils/screenTestHelper.js'
import { LoadingScreen } from '../LoadingScreen.js'

test('shows loading message', (t) => {
  const rendered = renderWithContext(LoadingScreen)
  screenInteractions.assertScreenContent(t, rendered, 'Day')
})

test('shows skip confirmation text', (t) => {
  const rendered = renderWithContext(LoadingScreen)
  const frame = rendered.lastFrame()
  t.true(frame?.includes('Press Enter to skip'))
})

test('shows different animation frames', async (t) => {
  const rendered = renderWithContext(LoadingScreen)

  const frames = new Set<string>()

  // Capture frames over time — animation runs at 280ms intervals
  for (let i = 0; i < 6; i++) {
    frames.add(rendered.lastFrame() ?? '')
    await new Promise((resolve) => {
      setTimeout(resolve, 300)
    })
  }

  // Cleanup to prevent timer leaks
  rendered.unmount()

  // Should have captured at least 2 different frames
  t.true(frames.size >= 2, `Expected >= 2 unique frames, got ${frames.size}`)
})

test('handles unmount during loading', (t) => {
  const rendered = renderWithContext(LoadingScreen)

  // Unmount while loading
  rendered.unmount()
  t.pass()
})
