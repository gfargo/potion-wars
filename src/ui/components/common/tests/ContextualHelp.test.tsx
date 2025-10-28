import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { ContextualHelp, useContextualHelp, HELP_HINTS } from '../ContextualHelp.js'

// Test component that uses the contextual help hook
const TestComponent: React.FC<{ hintId?: string }> = ({ hintId }) => {
  const { currentHint, showHint, dismissHint } = useContextualHelp()
  
  React.useEffect(() => {
    if (hintId) {
      showHint(hintId)
    }
  }, [hintId, showHint])
  
  return (
    <div>
      {currentHint && (
        <ContextualHelp 
          hint={currentHint} 
          visible={true}
          onDismiss={dismissHint}
        />
      )}
    </div>
  )
}

test('ContextualHelp renders hint correctly', t => {
  const hint = HELP_HINTS['first_npc_encounter']!
  const { lastFrame } = render(
    <ContextualHelp hint={hint} visible={true} />
  )
  
  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('💡 First NPC Encounter'))
  t.true(output!.includes('You\'ve encountered an NPC!'))
  t.true(output!.includes('Choose your dialogue options carefully'))
})

test('ContextualHelp shows dismiss instruction when onDismiss provided', t => {
  const hint = HELP_HINTS['reputation_explained']!
  const { lastFrame } = render(
    <ContextualHelp 
      hint={hint} 
      visible={true} 
      onDismiss={() => {}} 
    />
  )
  
  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Press \'x\' to dismiss'))
})

test('ContextualHelp does not render when visible is false', t => {
  const hint = HELP_HINTS['market_trends']!
  const { lastFrame } = render(
    <ContextualHelp hint={hint} visible={false} />
  )
  
  const output = lastFrame()
  t.truthy(output)
  t.false(output!.includes('Market Trends'))
})

test('useContextualHelp hook shows hint correctly', t => {
  const { lastFrame } = render(
    <TestComponent hintId="first_npc_encounter" />
  )
  
  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('💡 First NPC Encounter'))
  t.true(output!.includes('You\'ve encountered an NPC!'))
})

test('useContextualHelp hook handles dismissal', t => {
  const { lastFrame, stdin } = render(
    <TestComponent hintId="reputation_explained" />
  )
  
  // Check hint is shown
  let output = lastFrame()
  t.true(output!.includes('💡 Reputation System'))
  
  // Dismiss hint
  stdin.write('x')
  
  // Check hint is dismissed
  output = lastFrame()
  t.false(output!.includes('💡 Reputation System'))
})

test('useContextualHelp prevents showing first_time hints twice', t => {
  const TestComponentWithMultipleShows: React.FC = () => {
    const { currentHint, showHint, dismissHint } = useContextualHelp()
    
    React.useEffect(() => {
      // Try to show the same first_time hint multiple times
      showHint('first_npc_encounter')
      showHint('first_npc_encounter')
    }, [showHint])
    
    return (
      <div>
        {currentHint && (
          <ContextualHelp 
            hint={currentHint} 
            visible={true}
            onDismiss={dismissHint}
          />
        )}
      </div>
    )
  }
  
  const { lastFrame, stdin } = render(<TestComponentWithMultipleShows />)
  
  // Hint should be shown
  let output = lastFrame()
  t.true(output!.includes('💡 First NPC Encounter'))
  
  // Dismiss hint
  stdin.write('x')
  
  // Hint should not appear again
  output = lastFrame()
  t.false(output!.includes('💡 First NPC Encounter'))
})

test('HELP_HINTS contains all required hints', t => {
  const requiredHints = [
    'first_npc_encounter',
    'reputation_explained',
    'market_trends',
    'npc_trading',
    'rival_encounter',
    'information_gathering',
    'travel_animation'
  ]
  
  requiredHints.forEach(hintId => {
    t.truthy(HELP_HINTS[hintId], `Missing help hint: ${hintId}`)
    t.truthy(HELP_HINTS[hintId]!.title, `Missing title for hint: ${hintId}`)
    t.truthy(HELP_HINTS[hintId]!.content, `Missing content for hint: ${hintId}`)
    t.truthy(HELP_HINTS[hintId]!.context, `Missing context for hint: ${hintId}`)
  })
})

test('Help hints have appropriate content length', t => {
  Object.entries(HELP_HINTS).forEach(([hintId, hint]) => {
    t.true(hint!.title.length > 5, `Title too short for hint: ${hintId}`)
    t.true(hint!.content.length > 20, `Content too short for hint: ${hintId}`)
    t.true(hint!.content.length < 300, `Content too long for hint: ${hintId}`)
  })
})

test('NPC trading hint has correct content', t => {
  const hint = HELP_HINTS['npc_trading']!
  t.true(hint!.content.includes('unique trades'))
  t.true(hint!.content.includes('reputation'))
  t.true(hint!.content.includes('exclusive'))
})

test('Market trends hint explains trend indicators', t => {
  const hint = HELP_HINTS['market_trends']!
  t.true(hint!.content.includes('↗'))
  t.true(hint!.content.includes('↘'))
  t.true(hint!.content.includes('rising prices'))
  t.true(hint!.content.includes('falling prices'))
})

test('Rival encounter hint has always trigger', t => {
  const hint = HELP_HINTS['rival_encounter']!
  t.truthy(hint)
  t.is(hint!.trigger, 'always')
  t.true(hint!.content.includes('rival alchemist'))
  t.true(hint!.content.includes('reputation'))
})

test('Information gathering hint explains informant NPCs', t => {
  const hint = HELP_HINTS['information_gathering']!
  t.true(hint!.content.includes('Informant NPCs'))
  t.true(hint!.content.includes('market tips'))
  t.true(hint!.content.includes('trading decisions'))
})