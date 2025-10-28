import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { ReputationDisplay } from '../ReputationDisplay.js'
import type { ReputationState } from '../../../../types/reputation.types.js'

// Test reputation states
const neutralReputation: ReputationState = {
  global: 0,
  locations: {
    'Market Square': 0,
    'Alchemist Quarter': 10
  },
  npcRelationships: {
    'merchant_aldric': 5,
    'guard_captain': -10
  }
}

const highReputation: ReputationState = {
  global: 60,
  locations: {
    'Market Square': 75,
    'Alchemist Quarter': 50
  },
  npcRelationships: {
    'merchant_aldric': 80,
    'noble_lady': 90
  }
}

const lowReputation: ReputationState = {
  global: -40,
  locations: {
    'Market Square': -60,
    'Thieves Den': -30
  },
  npcRelationships: {
    'thief_boss': -70,
    'corrupt_guard': -20
  }
}

test('ReputationDisplay renders basic reputation info', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Reputation Status'))
  t.true(output!.includes('Global:'))
  t.true(output!.includes('Market Square:'))
  t.true(output!.includes('Access Level:'))
})

test('ReputationDisplay shows compact format', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
      compact={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Rep:'))
  t.true(output!.includes('Neutral'))
  // Should not include detailed sections in compact mode
  t.false(output!.includes('Reputation Status'))
  t.false(output!.includes('Access Level:'))
})

test('ReputationDisplay shows price effects for high reputation', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={highReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Price Effect:'))
  t.true(output!.includes('Discount'))
})

test('ReputationDisplay shows price effects for low reputation', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={lowReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Price Effect:'))
  t.true(output!.includes('Markup'))
})

test('ReputationDisplay shows detailed information when requested', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={highReputation} 
      currentLocation="Market Square" 
      showDetails={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Location Details:'))
  t.true(output!.includes('NPC Relations:'))
  t.true(output!.includes('Effects:'))
  t.true(output!.includes('Alchemist Quarter:'))
})

test('ReputationDisplay handles empty reputation state', t => {
  const emptyReputation: ReputationState = {
    global: 0,
    locations: {},
    npcRelationships: {}
  }

  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={emptyReputation} 
      currentLocation="Unknown Location" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Reputation Status'))
  t.true(output!.includes('Global:'))
  t.true(output!.includes('Unknown Location:'))
})

test('ReputationDisplay shows correct reputation levels', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={highReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  // High reputation should show as Respected
  t.true(output!.includes('Respected'))
})

test('ReputationDisplay shows access level correctly', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={highReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Access Level:'))
  t.true(output!.includes('/5'))
})

test('ReputationDisplay compact mode shows price indicators', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={highReputation} 
      currentLocation="Market Square" 
      compact={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  // Should show discount indicator for high reputation
  t.true(output!.includes('↓') || output!.includes('%'))
})

test('ReputationDisplay handles negative reputation values', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={lowReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Disliked') || output!.includes('Despised'))
  // Should show negative values with minus sign
  t.true(output!.includes('-'))
})

test('ReputationDisplay formats NPC names correctly', t => {
  const { lastFrame } = render(
    <ReputationDisplay 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
      showDetails={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  // Should format NPC IDs into readable names
  t.true(output!.includes('Merchant Aldric') || output!.includes('Guard Captain'))
})