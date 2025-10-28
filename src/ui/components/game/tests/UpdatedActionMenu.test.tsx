import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import ActionMenu from '../ActionMenu.js'
import { TestWrapper } from '../../../../core/state/tests/utils/TestWrapper.js'
import { locations } from '../../../../constants.js'

const testPotions = ['Healing Potion', 'Strength Potion']

test('Updated ActionMenu includes NPC search option', t => {
  const { lastFrame } = render(
    <TestWrapper>
      <ActionMenu potions={testPotions} locations={locations} />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Look for NPCs'))
  t.true(output!.includes('(N)'))
})

test('Updated ActionMenu shows NPC icon when selected', t => {
  const { lastFrame } = render(
    <TestWrapper>
      <ActionMenu potions={testPotions} locations={locations} />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  // Should show the NPC icon or related indicator
  t.true(output!.includes('👥') || output!.includes('NPC'))
})

test('Updated ActionMenu maintains all original options', t => {
  const { lastFrame } = render(
    <TestWrapper>
      <ActionMenu potions={testPotions} locations={locations} />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Brew'))
  t.true(output!.includes('Sell'))
  t.true(output!.includes('Travel'))
  t.true(output!.includes('Repay Debt'))
  t.true(output!.includes('Quit'))
})

test('Updated ActionMenu shows current action', t => {
  const { lastFrame } = render(
    <TestWrapper>
      <ActionMenu potions={testPotions} locations={locations} />
    </TestWrapper>
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Current action:'))
  t.true(output!.includes('main'))
})