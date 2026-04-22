import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { TravelingScreen } from '../TravelingScreen.js'
import { useStore } from '../../store/appStore.js'

/**
 * Seed the store with a travel-in-progress state and render TravelingScreen
 * directly. We intentionally avoid TestWrapper here because it calls
 * resetGame() during its own render pass, which would clobber the travel state
 * we need to seed.
 */
function renderTravelScreen({
  origin,
  destination,
}: {
  origin?: string
  destination?: string
} = {}) {
  useStore.getState().resetGame()
  useStore.setState((state) => {
    state.ui.activeScreen = 'traveling'
    state.travel = {
      phase: 'animating',
      origin,
      destination,
      animationStartTime: Date.now(),
    }
  })

  return render(<TravelingScreen />)
}

test('TravelingScreen renders the animation scene', (t) => {
  const { lastFrame, unmount } = renderTravelScreen({
    origin: 'Peasant Village',
    destination: 'Royal Castle',
  })

  const output = lastFrame()
  t.truthy(output)
  // The immersive scene is large — far more than a couple of header lines.
  t.true((output?.length ?? 0) > 200)
  unmount()
})

test('TravelingScreen shows the route arrow when origin and destination are set', (t) => {
  const { lastFrame, unmount } = renderTravelScreen({
    origin: 'Peasant Village',
    destination: 'Royal Castle',
  })

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Peasant Village'))
  t.true(output!.includes('Royal Castle'))
  t.true(output!.includes('→'))
  unmount()
})

test('TravelingScreen shows the percentage progress in the animation footer', (t) => {
  const { lastFrame, unmount } = renderTravelScreen({
    origin: 'Peasant Village',
    destination: 'Royal Castle',
  })

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('% complete'))
  unmount()
})

test('TravelingScreen shows control hints', (t) => {
  const { lastFrame, unmount } = renderTravelScreen({
    origin: 'Peasant Village',
    destination: 'Royal Castle',
  })

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Enter'))
  t.true(output!.includes('skip'))
  t.true(output!.includes('Space'))
  t.true(output!.includes('speed'))
  unmount()
})

test('TravelingScreen shows day information', (t) => {
  const { lastFrame, unmount } = renderTravelScreen({
    origin: 'Peasant Village',
    destination: 'Royal Castle',
  })

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Day'))
  unmount()
})
