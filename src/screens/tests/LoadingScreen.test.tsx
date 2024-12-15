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
  // Check for loading spinner characters
  const frame = rendered.lastFrame()
  t.true(frame?.includes('Press Enter to skip'))
})

test('shows different animation frames', async (t) => {
  const rendered = renderWithContext(LoadingScreen)

  const frames = new Set<string>()

  // Capture frames for a short period
  await Promise.all(
    Array.from(
      { length: 5 },
      async (_, i) =>
        new Promise<void>((resolve) => {
          frames.add(rendered.lastFrame() ?? '')
          setTimeout(resolve, 200 * i)
        })
    )
  )

  // Should have captured different frames
  t.true(frames.size > 1)
})

test('handles unmount during loading', (t) => {
  const rendered = renderWithContext(LoadingScreen)

  // Unmount while loading
  rendered.unmount()
  t.pass()
})
