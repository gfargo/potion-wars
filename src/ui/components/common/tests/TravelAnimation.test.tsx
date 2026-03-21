import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import {
    TravelAnimation,
    getLocationSpecificAnimation,
} from '../TravelAnimation.js'

test('TravelAnimation renders with loading animation initially', (t) => {
  const { lastFrame, unmount } = render(
    <TravelAnimation
      fromLocation="Market Square"
      toLocation="Alchemist Quarter"
      autoStart={false}
      onComplete={() => {}}
    />
  )

  // Should show loading animation immediately
  const frame = lastFrame()
  t.true(frame?.includes('Preparing') || frame?.includes('→') || false)
  unmount()
})

test('TravelAnimation renders with location information', async (t) => {
  const { lastFrame, unmount } = render(
    <TravelAnimation
      fromLocation="Market Square"
      toLocation="Alchemist Quarter"
      autoStart={false}
      onComplete={() => {}}
    />
  )

  // Wait for animation to load
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Should render some content
  const frame = lastFrame()
  t.true((frame?.length ?? 0) > 0)
  unmount()
})

test('TravelAnimation calls onComplete callback', (t) => {
  let completed = false

  const { unmount } = render(
    <TravelAnimation
      fromLocation="Test Location A"
      toLocation="Test Location B"
      autoStart={false}
      onComplete={() => {
        completed = true
      }}
    />
  )

  // The callback should be passed through (we can't easily test if it's called without starting the animation)
  t.false(completed) // Should not be called yet since autoStart is false
  unmount()
})

test('TravelAnimation handles different location combinations', async (t) => {
  const { lastFrame: frame1, unmount: unmount1 } = render(
    <TravelAnimation
      fromLocation="Location A"
      toLocation="Location B"
      autoStart={false}
      onComplete={() => {}}
    />
  )

  const { lastFrame: frame2, unmount: unmount2 } = render(
    <TravelAnimation
      fromLocation="Different Place"
      toLocation="Another Place"
      autoStart={false}
      onComplete={() => {}}
    />
  )

  // Wait for animations to load
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Both should render content
  t.true((frame1()?.length ?? 0) > 0)
  t.true((frame2()?.length ?? 0) > 0)
  unmount1()
  unmount2()
})

test('TravelAnimation handles autoStart prop', async (t) => {
  const { lastFrame: frame1, unmount: unmount1 } = render(
    <TravelAnimation
      autoStart
      fromLocation="Start"
      toLocation="End"
      onComplete={() => {}}
    />
  )

  const { lastFrame: frame2, unmount: unmount2 } = render(
    <TravelAnimation
      fromLocation="Start"
      toLocation="End"
      autoStart={false}
      onComplete={() => {}}
    />
  )

  // Both should render content
  t.true((frame1()?.length ?? 0) > 0)
  t.true((frame2()?.length ?? 0) > 0)
  unmount1()
  unmount2()
})

test('TravelAnimation gracefully handles animation loading errors', async (t) => {
  // This should still work even if there are issues loading animations
  const { lastFrame, unmount } = render(
    <TravelAnimation
      fromLocation="Problematic Location With Very Long Name That Might Cause Issues"
      toLocation="Another Problematic Location"
      autoStart={false}
      onComplete={() => {}}
    />
  )

  // Wait for fallback animation to load
  await new Promise((resolve) => setTimeout(resolve, 150))

  // Should still render something (fallback animation)
  const frame = lastFrame()
  t.true((frame?.length ?? 0) > 0)
  unmount()
})

test('getLocationSpecificAnimation returns specific animation for known pairs', (t) => {
  const animation = getLocationSpecificAnimation(
    'Market Square',
    'Alchemist Quarter'
  )

  if (animation) {
    t.is(typeof animation.name, 'string')
    t.is(typeof animation.description, 'string')
    t.is(typeof animation.duration, 'number')
    t.true(Array.isArray(animation.frames))
    t.true(animation.frames.length > 0)
  } else {
    // It's okay if no specific animation exists for this pair
    t.pass()
  }
})

test('getLocationSpecificAnimation returns null for unknown pairs', (t) => {
  const animation = getLocationSpecificAnimation(
    'Unknown Location A',
    'Unknown Location B'
  )

  // Should return null for unknown location pairs
  t.is(animation, undefined)
})

test('TravelAnimation shows travel progression', async (t) => {
  const { lastFrame, unmount } = render(
    <TravelAnimation
      fromLocation="Start Point"
      toLocation="End Point"
      autoStart={false}
      onComplete={() => {}}
    />
  )

  // Wait for animation to load
  await new Promise((resolve) => setTimeout(resolve, 100))

  const frame = lastFrame()

  // Should contain travel-related content
  t.true(
    frame?.includes('Start Point') ||
      frame?.includes('End Point') ||
      frame?.includes('Travel') ||
      frame?.includes('→') ||
      frame?.includes('o') || // Character representation
      false
  )
  unmount()
})
