import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import Help from '../Help.js'
import { HELP_SECTIONS } from '../../../../constants.js'
import { useStore } from '../../../../store/appStore.js'

// Reset store before each test
test.beforeEach(() => {
  useStore.getState().resetGame()
})

test('Help component renders basic help section by default', (t) => {
  const { lastFrame } = render(<Help />)

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Basic Commands'))
  t.true(output!.includes('Brew - Create potions'))
  t.true(output!.includes('Goal: Make as much gold as possible'))
})

test('Help component displays section navigation', (t) => {
  const { lastFrame } = render(<Help />)

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Help Sections:'))
  t.true(output!.includes('1 of 6'))
  t.true(output!.includes('1.Basic'))
  t.true(output!.includes('2.NPC'))
  t.true(output!.includes('Use ← → arrows or numbers 1-6 to navigate'))
})

test('Help component shows close instructions', (t) => {
  const { lastFrame } = render(
    
      <Help />
    
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Press "h" or "esc" to close'))
})

test('Help component handles right arrow navigation', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Navigate to next section
  stdin.write('\u001B[C') // Right arrow

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('NPC Interactions'))
  t.true(output!.includes('2 of 6'))
})

test('Help component handles left arrow navigation', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Navigate to next section first
  stdin.write('\u001B[C') // Right arrow
  // Then navigate back
  stdin.write('\u001B[D') // Left arrow

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Basic Commands'))
  t.true(output!.includes('1 of 6'))
})

test('Help component handles number key navigation', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Navigate to reputation section (3)
  stdin.write('3')

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Reputation System'))
  t.true(output!.includes('3 of 6'))
})

test('Help component displays NPC help content correctly', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Navigate to NPC section
  stdin.write('2')

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('NPC Interactions'))
  t.true(output!.includes('Types of NPCs:'))
  t.true(output!.includes('Merchants - Offer special trades'))
  t.true(output!.includes('Informants - Provide market intelligence'))
  t.true(output!.includes('NPCs remember your past interactions'))
})

test('Help component displays reputation help content correctly', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Navigate to reputation section
  stdin.write('3')

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Reputation System'))
  t.true(output!.includes('Reputation Levels:'))
  t.true(output!.includes('Despised (-50 or lower)'))
  t.true(output!.includes('Revered (80+)'))
  t.true(output!.includes('Building Reputation:'))
})

test('Help component displays market help content correctly', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Navigate to market section
  stdin.write('4')

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Enhanced Market System'))
  t.true(output!.includes('Market Dynamics:'))
  t.true(output!.includes('Dynamic Pricing'))
  t.true(output!.includes('Market Intelligence:'))
  t.true(output!.includes('↗ Rising prices'))
})

test('Help component displays animation help content correctly', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Navigate to animation section
  stdin.write('5')

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Visual Features'))
  t.true(output!.includes('Animation System:'))
  t.true(output!.includes('NPC Portraits'))
  t.true(output!.includes('Travel Animations'))
})

test('Help component displays advanced help content correctly', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Navigate to advanced section
  stdin.write('6')

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Advanced Strategies'))
  t.true(output!.includes('Reputation Management:'))
  t.true(output!.includes('Market Strategy:'))
  t.true(output!.includes('Risk vs Reward:'))
})

test('Help sections contain all required content', (t) => {
  // Test that all help sections are properly defined
  t.truthy(HELP_SECTIONS.basic)
  t.truthy(HELP_SECTIONS.npcs)
  t.truthy(HELP_SECTIONS.reputation)
  t.truthy(HELP_SECTIONS.market)
  t.truthy(HELP_SECTIONS.animations)
  t.truthy(HELP_SECTIONS.advanced)

  // Test that each section has title and content
  for (const section of Object.values(HELP_SECTIONS)) {
    t.truthy(section.title)
    t.truthy(section.content)
    t.true(section.content.length > 50) // Ensure substantial content
  }
})

test('Help sections cover all new features', (t) => {
  // Test NPC section covers key NPC features
  const npcContent = HELP_SECTIONS.npcs.content
  t.true(npcContent.includes('Merchants'))
  t.true(npcContent.includes('Informants'))
  t.true(npcContent.includes('reputation'))
  t.true(npcContent.includes('dialogue'))

  // Test reputation section covers key reputation features
  const reputationContent = HELP_SECTIONS.reputation.content
  t.true(reputationContent.includes('Despised'))
  t.true(reputationContent.includes('Revered'))
  t.true(reputationContent.includes('Building Reputation'))
  t.true(reputationContent.includes('prices'))

  // Test market section covers enhanced market features
  const marketContent = HELP_SECTIONS.market.content
  t.true(marketContent.includes('Dynamic Pricing'))
  t.true(marketContent.includes('supply and demand'))
  t.true(marketContent.includes('↗'))
  t.true(marketContent.includes('↘'))

  // Test animation section covers visual features
  const animationContent = HELP_SECTIONS.animations.content
  t.true(animationContent.includes('NPC Portraits'))
  t.true(animationContent.includes('Travel Animations'))
  t.true(animationContent.includes('ASCII art'))
})

test('Help component prevents navigation beyond bounds', (t) => {
  const { lastFrame, stdin } = render(
    
      <Help />
    
  )

  // Try to navigate left from first section
  stdin.write('\u001B[D') // Left arrow

  let output = lastFrame()
  t.true(output!.includes('Basic Commands')) // Should stay on first section
  t.true(output!.includes('1 of 6'))

  // Navigate to last section
  stdin.write('6')

  // Try to navigate right from last section
  stdin.write('\u001B[C') // Right arrow

  output = lastFrame()
  t.true(output!.includes('Advanced Strategies')) // Should stay on last section
  t.true(output!.includes('6 of 6'))
})
