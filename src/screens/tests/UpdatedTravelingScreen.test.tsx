import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { TravelingScreen } from '../TravelingScreen.js'
import { TestWrapper } from '../../core/state/tests/utils/TestWrapper.js'

test('Updated TravelingScreen shows travel animation', t => {
  const onFinish = () => {}
  
  const { lastFrame } = render(
    <TestWrapper>
      <TravelingScreen onFinish={onFinish} fromLocation="Market Square" />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Traveling to'))
  t.true(output!.includes('From Market Square'))
})

test('Updated TravelingScreen shows progress indicator', t => {
  const onFinish = () => {}
  
  const { lastFrame } = render(
    <TestWrapper>
      <TravelingScreen onFinish={onFinish} />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  // Should show progress bar with blocks
  t.true(output!.includes('█') || output!.includes('░') || output!.includes('%'))
})

test('Updated TravelingScreen shows flavor text', t => {
  const onFinish = () => {}
  
  const { lastFrame } = render(
    <TestWrapper>
      <TravelingScreen onFinish={onFinish} fromLocation="Market Square" />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  // Should show some descriptive text about the journey
  t.true(output!.length > 100) // Flavor text should make output longer
})

test('Updated TravelingScreen maintains skip functionality', t => {
  const onFinish = () => {}
  
  const { lastFrame } = render(
    <TestWrapper>
      <TravelingScreen onFinish={onFinish} />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Press Enter to skip'))
})

test('Updated TravelingScreen shows day information', t => {
  const onFinish = () => {}
  
  const { lastFrame } = render(
    <TestWrapper>
      <TravelingScreen onFinish={onFinish} />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Day'))
})