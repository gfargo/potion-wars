import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { TravelingScreen } from '../TravelingScreen.js'
import { TestWrapper } from '../../core/state/tests/utils/TestWrapper.js'
import { useStore } from '../../store/appStore.js'

/**
 * Helper to pre-seed store and render TravelingScreen
 */
function renderTravelScreen(fromLocation?: string) {
  const onFinish = () => {}

  // Pre-seed store before render
  useStore.getState().resetGame()
  useStore.setState((state) => {
    state.ui.activeScreen = 'traveling'
  })

  return render(
    <TestWrapper screen="traveling">
      <TravelingScreen fromLocation={fromLocation} onFinish={onFinish} />
    </TestWrapper>
  )
}

test('Updated TravelingScreen shows travel animation', (t) => {
  const { lastFrame, unmount } = renderTravelScreen('Market Square')

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Traveling to'))
  t.true(output!.includes('From Market Square'))
  unmount()
})

test('Updated TravelingScreen shows progress indicator', (t) => {
  const { lastFrame, unmount } = renderTravelScreen()

  const output = lastFrame()
  t.truthy(output)
  // Should show progress bar with blocks
  t.true(
    output!.includes('█') || output!.includes('░') || output!.includes('%')
  )
  unmount()
})

test('Updated TravelingScreen shows flavor text', (t) => {
  const { lastFrame, unmount } = renderTravelScreen('Market Square')

  const output = lastFrame()
  t.truthy(output)
  // Should show some descriptive text about the journey
  t.true(output!.length > 100) // Flavor text should make output longer
  unmount()
})

test('Updated TravelingScreen maintains skip functionality', (t) => {
  const { lastFrame, unmount } = renderTravelScreen()

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Press Enter to skip'))
  unmount()
})

test('Updated TravelingScreen shows day information', (t) => {
  const { lastFrame, unmount } = renderTravelScreen()

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Day'))
  unmount()
})
