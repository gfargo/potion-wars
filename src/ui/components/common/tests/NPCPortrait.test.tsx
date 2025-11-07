import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { NPCPortrait } from '../NPCPortrait.js'
import type { NPC } from '../../../../types/npc.types.js'

// Mock NPC for testing
const mockNPC: NPC = {
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A test merchant',
  personality: {
    greeting: 'Hello!',
    farewell: 'Goodbye!',
    tradeAccept: 'Deal!',
    tradeDecline: 'No deal',
    lowReputation: 'Hmm...',
    highReputation: 'Welcome back!',
  },
  location: 'Test Location',
  availability: {
    probability: 1,
  },
  reputation: {
    minimum: 0,
  },
  dialogue: {
    rootNode: 'greeting',
    nodes: {
      greeting: {
        id: 'greeting',
        text: 'Hello there!',
        choices: [],
      },
    },
  },
}

test('NPCPortrait renders with default idle animation', async (t) => {
  const { lastFrame } = render(<NPCPortrait npc={mockNPC} autoStart={false} />)

  // Wait a moment for the animation to load
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Should render some content (either loading or actual animation)
  const frame = lastFrame()
  t.true((frame?.length ?? 0) > 0)
})

test('NPCPortrait renders with talking animation type', async (t) => {
  const { lastFrame } = render(
    <NPCPortrait npc={mockNPC} animationType="talking" autoStart={false} />
  )

  // Wait a moment for the animation to load
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Should render some content
  const frame = lastFrame()
  t.true((frame?.length ?? 0) > 0)
})

test('NPCPortrait renders with trading animation type', async (t) => {
  const { lastFrame } = render(
    <NPCPortrait npc={mockNPC} animationType="trading" autoStart={false} />
  )

  // Wait a moment for the animation to load
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Should render some content
  const frame = lastFrame()
  t.true((frame?.length ?? 0) > 0)
})

test('NPCPortrait shows loading animation initially', (t) => {
  const { lastFrame } = render(<NPCPortrait npc={mockNPC} autoStart={false} />)

  // Should show loading animation immediately
  const frame = lastFrame()
  t.true(frame?.includes('...') || frame?.includes('.') || false)
})

test('NPCPortrait accepts onAnimationComplete callback', async (t) => {
  let callbackCalled = false

  render(
    <NPCPortrait
      npc={mockNPC}
      animationType="trading"
      autoStart={false}
      onAnimationComplete={() => {
        callbackCalled = true
      }}
    />
  )

  // Wait for component to load
  await new Promise((resolve) => setTimeout(resolve, 50))

  // The callback should be passed through (we can't easily test if it's called without starting the animation)
  t.false(callbackCalled) // Should not be called yet since autoStart is false
})

test('NPCPortrait handles different NPC types', async (t) => {
  const guardNPC: NPC = {
    ...mockNPC,
    id: 'test_guard',
    name: 'Test Guard',
    type: 'guard',
  }

  const { lastFrame } = render(<NPCPortrait npc={guardNPC} autoStart={false} />)

  // Wait a moment for the animation to load
  await new Promise((resolve) => setTimeout(resolve, 50))

  // Should render some content
  const frame = lastFrame()
  t.true((frame?.length ?? 0) > 0)
})

test('NPCPortrait handles autoStart prop', async (t) => {
  const { lastFrame: frame1 } = render(<NPCPortrait autoStart npc={mockNPC} />)

  const { lastFrame: frame2 } = render(
    <NPCPortrait npc={mockNPC} autoStart={false} />
  )

  // Both should render content, but autoStart affects the underlying animation
  t.true((frame1()?.length ?? 0) > 0)
  t.true((frame2()?.length ?? 0) > 0)
})

test('NPCPortrait gracefully handles animation loading errors', async (t) => {
  // Create an NPC with an ID that might cause loading issues
  const problematicNPC: NPC = {
    ...mockNPC,
    id: 'nonexistent_npc_with_very_long_id_that_might_cause_issues',
  }

  const { lastFrame } = render(
    <NPCPortrait npc={problematicNPC} autoStart={false} />
  )

  // Wait for fallback animation to load
  await new Promise((resolve) => setTimeout(resolve, 100))

  // Should still render something (fallback animation)
  const frame = lastFrame()
  t.true((frame?.length ?? 0) > 0)
  // Should contain fallback content
  t.true(
    frame?.includes('???') ||
      frame?.includes('o.o') ||
      frame?.includes('.') ||
      false
  )
})
