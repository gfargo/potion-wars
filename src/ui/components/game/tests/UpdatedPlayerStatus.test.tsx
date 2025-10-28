import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import PlayerStatus from '../PlayerStatus.js'
import { TestWrapper } from '../../../../core/state/tests/utils/TestWrapper.js'

test('Updated PlayerStatus includes reputation display', t => {
  const { lastFrame } = render(
    <TestWrapper>
      <PlayerStatus />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('♡')) // Health
  t.true(output!.includes('Purse:')) // Cash
  t.true(output!.includes('Debt:')) // Debt
  t.true(output!.includes('Rep:')) // Reputation (compact mode)
})

test('Updated PlayerStatus shows reputation level', t => {
  const { lastFrame } = render(
    <TestWrapper>
      <PlayerStatus />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  // Should show some reputation level
  t.true(
    output!.includes('Neutral') || 
    output!.includes('Liked') || 
    output!.includes('Disliked') ||
    output!.includes('Respected') ||
    output!.includes('Despised') ||
    output!.includes('Revered')
  )
})

test('Updated PlayerStatus maintains original functionality', t => {
  const { lastFrame } = render(
    <TestWrapper>
      <PlayerStatus />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  // Should still show all original elements
  t.true(output!.includes('♡'))
  t.true(output!.includes('%'))
  t.true(output!.includes('Purse:'))
  t.true(output!.includes('g')) // Gold symbol
})