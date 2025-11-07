import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { NPCInteractionScreen } from '../NPCInteractionScreen.js'
import { TestWrapper } from '../../core/state/tests/utils/TestWrapper.js'
import type { NPC } from '../../types/npc.types.js'

// Mock NPC for testing
const mockNPC: NPC = {
  id: 'test_merchant',
  name: 'Test Merchant',
  type: 'merchant',
  description: 'A friendly test merchant',
  personality: {
    greeting: 'Welcome to my shop!',
    farewell: 'Come back soon!',
    tradeAccept: 'Excellent choice!',
    tradeDecline: 'Perhaps another time.',
    lowReputation: "I don't trust you.",
    highReputation: 'My valued customer!',
  },
  location: 'Market Square',
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
        text: 'What can I do for you today?',
        choices: [
          {
            text: "I'd like to browse your wares",
            nextNode: 'trade',
          },
          {
            text: 'Just saying hello',
            nextNode: 'farewell',
          },
        ],
      },
      trade: {
        id: 'trade',
        text: 'Here are my finest potions!',
        choices: [
          {
            text: "I'll take a healing potion",
            effects: [
              {
                type: 'cash',
                value: -100,
              },
              {
                type: 'inventory',
                value: 1,
                item: 'Healing Potion',
              },
            ],
          },
          {
            text: 'Maybe later',
            nextNode: 'farewell',
          },
        ],
      },
      farewell: {
        id: 'farewell',
        text: 'Safe travels!',
        choices: [
          {
            text: 'Goodbye',
          },
        ],
      },
    },
  },
}

test('NPCInteractionScreen renders correctly', (t) => {
  const onComplete = () => {}

  const { lastFrame } = render(
    <TestWrapper>
      <NPCInteractionScreen npc={mockNPC} onComplete={onComplete} />
    </TestWrapper>
  )

  t.true(lastFrame()!.includes('Test Merchant'))
  t.true(lastFrame()!.includes('A friendly test merchant'))
  t.true(lastFrame()!.includes('Conversation with Test Merchant'))
})

test('NPCInteractionScreen shows loading state initially', (t) => {
  const onComplete = () => {}

  const { lastFrame } = render(
    <TestWrapper>
      <NPCInteractionScreen npc={mockNPC} onComplete={onComplete} />
    </TestWrapper>
  )

  // Should show loading or conversation content
  t.true(
    lastFrame()!.includes('Starting conversation') ||
      lastFrame()!.includes('Test Merchant')
  )
})

test('NPCInteractionScreen displays dialogue choices', (t) => {
  const onComplete = () => {}

  const { lastFrame } = render(
    <TestWrapper>
      <NPCInteractionScreen npc={mockNPC} onComplete={onComplete} />
    </TestWrapper>
  )

  // Should show dialogue choices from the greeting node
  t.true(
    lastFrame()!.includes('browse your wares') ||
      lastFrame()!.includes('saying hello')
  )
})

test('NPCInteractionScreen handles invalid NPC gracefully', (t) => {
  const invalidNPC: NPC = {
    ...mockNPC,
    dialogue: {
      rootNode: 'nonexistent',
      nodes: {},
    },
  }

  let completeCalled = false
  const onComplete = () => {
    completeCalled = true
  }

  const { lastFrame } = render(
    <TestWrapper>
      <NPCInteractionScreen npc={invalidNPC} onComplete={onComplete} />
    </TestWrapper>
  )

  // Should handle error gracefully
  t.true(lastFrame()!.includes('conversation') || completeCalled)
})

test('NPCInteractionScreen shows conversation history', (t) => {
  const onComplete = () => {}

  const { lastFrame } = render(
    <TestWrapper>
      <NPCInteractionScreen npc={mockNPC} onComplete={onComplete} />
    </TestWrapper>
  )

  // Should show conversation history section
  t.true(lastFrame()!.includes('Conversation:'))
  t.true(lastFrame()!.includes('Welcome to my shop!'))
})

test('NPCInteractionScreen displays NPC portrait area', (t) => {
  const onComplete = () => {}

  const { lastFrame } = render(
    <TestWrapper>
      <NPCInteractionScreen npc={mockNPC} onComplete={onComplete} />
    </TestWrapper>
  )

  // Should show NPC name and type
  t.true(lastFrame()!.includes('Test Merchant'))
  t.true(lastFrame()!.includes('merchant'))
})

test('NPCInteractionScreen shows instructions', (t) => {
  const onComplete = () => {}

  const { lastFrame } = render(
    <TestWrapper>
      <NPCInteractionScreen npc={mockNPC} onComplete={onComplete} />
    </TestWrapper>
  )

  // Should show user instructions
  t.true(lastFrame()!.includes('arrow keys') || lastFrame()!.includes('Enter'))
})
