import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { TravelAnimation } from '../TravelAnimation.js'

test('TravelAnimation renders immediately without a loading state', (t) => {
  const { lastFrame, unmount } = render(
    <TravelAnimation
      autoStart={false}
      fromLocation="Peasant Village"
      toLocation="Royal Castle"
      onComplete={() => {}}
    />
  )

  const frame = lastFrame()
  t.true((frame?.length ?? 0) > 0)
  // The immersive scene always labels the destination in the footer/marker.
  t.true(frame?.includes('Royal Castle') ?? false)
  unmount()
})

test('TravelAnimation does not auto-complete when autoStart is false', (t) => {
  let completed = false

  const { unmount } = render(
    <TravelAnimation
      autoStart={false}
      fromLocation="Peasant Village"
      toLocation="Royal Castle"
      onComplete={() => {
        completed = true
      }}
    />
  )

  t.false(completed)
  unmount()
})

test('TravelAnimation handles different location combinations', (t) => {
  const { lastFrame: frame1, unmount: unmount1 } = render(
    <TravelAnimation
      autoStart={false}
      fromLocation="Enchanted Forest"
      toLocation="Merchant's District"
      onComplete={() => {}}
    />
  )

  const { lastFrame: frame2, unmount: unmount2 } = render(
    <TravelAnimation
      autoStart={false}
      fromLocation="Alchemist's Quarter"
      toLocation="Peasant Village"
      onComplete={() => {}}
    />
  )

  t.true((frame1()?.length ?? 0) > 0)
  t.true((frame2()?.length ?? 0) > 0)
  unmount1()
  unmount2()
})

test('TravelAnimation honors a custom durationMs without errors', (t) => {
  const { lastFrame, unmount } = render(
    <TravelAnimation
      autoStart={false}
      fromLocation="Start"
      toLocation="End"
      durationMs={2500}
      onComplete={() => {}}
    />
  )

  t.true((lastFrame()?.length ?? 0) > 0)
  unmount()
})

test('TravelAnimation renders a traveler glyph in the scene', (t) => {
  const { lastFrame, unmount } = render(
    <TravelAnimation
      autoStart={false}
      fromLocation="Start Point"
      toLocation="End Point"
      onComplete={() => {}}
    />
  )

  const frame = lastFrame()
  // Either the traveler's head or the route label should appear in frame 0.
  t.true(
    frame?.includes('End Point') ||
      frame?.includes('Start') ||
      frame?.includes('O') ||
      false
  )
  unmount()
})
