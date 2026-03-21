import test from 'ava'
import React from 'react'
import { Box, Text, useInput } from 'ink'
import { render } from 'ink-testing-library'
import {
    ContextualHelp,
    useContextualHelp,
    HELP_HINTS,
} from '../ContextualHelp.js'

// Test component that uses the contextual help hook with useInput for dismiss
const TestComponent: React.FC<{ readonly hintId?: string }> = ({ hintId }) => {
  const { currentHint, showHint, dismissHint } = useContextualHelp()

  React.useEffect(() => {
    if (hintId) {
      showHint(hintId)
    }
  }, [hintId, showHint])

  useInput((input) => {
    if (input === 'x') {
      dismissHint()
    }
  })

  return (
    <Box flexDirection="column">
      {currentHint ? (
        <ContextualHelp visible hint={currentHint} onDismiss={dismissHint} />
      ) : (
        <Text>No hint</Text>
      )}
    </Box>
  )
}

test('ContextualHelp renders hint correctly', (t) => {
  const hint = HELP_HINTS['first_npc_encounter']!
  const { lastFrame } = render(<ContextualHelp visible hint={hint} />)

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('💡 First NPC Encounter'))
  t.true(output!.includes("You've encountered an NPC!"))
  t.true(output!.includes('Choose your dialogue options carefully'))
})

test('ContextualHelp shows dismiss instruction when onDismiss provided', (t) => {
  const hint = HELP_HINTS['reputation_explained']!
  const { lastFrame } = render(
    <ContextualHelp visible hint={hint} onDismiss={() => {}} />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes("Press 'x' to dismiss"))
})

test('ContextualHelp does not render when visible is false', (t) => {
  const hint = HELP_HINTS['market_trends']!
  const { lastFrame } = render(<ContextualHelp hint={hint} visible={false} />)

  const output = lastFrame()
  t.false(output!.includes('Market Trends'))
})

test('useContextualHelp hook shows hint correctly', async (t) => {
  const { lastFrame, unmount } = render(<TestComponent hintId="first_npc_encounter" />)

  // Wait for useEffect to fire
  await new Promise((resolve) => {
    setTimeout(resolve, 50)
  })

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('💡 First NPC Encounter'))
  t.true(output!.includes("You've encountered an NPC!"))
  unmount()
})

test('useContextualHelp hook handles dismissal', async (t) => {
  const { lastFrame, stdin, unmount } = render(
    <TestComponent hintId="reputation_explained" />
  )

  // Wait for useEffect to fire
  await new Promise((resolve) => {
    setTimeout(resolve, 50)
  })

  // Check hint is shown
  let output = lastFrame()
  t.true(output!.includes('💡 Reputation System'))

  // Dismiss hint via useInput handler
  stdin.write('x')

  // Wait for state update
  await new Promise((resolve) => {
    setTimeout(resolve, 50)
  })

  // Check hint is dismissed
  output = lastFrame()
  t.false(output!.includes('💡 Reputation System'))
  unmount()
})

test('useContextualHelp prevents showing first_time hints twice', async (t) => {
  const TestComponentWithMultipleShows: React.FC = () => {
    const { currentHint, showHint, dismissHint } = useContextualHelp()

    React.useEffect(() => {
      showHint('first_npc_encounter')
    }, [showHint])

    useInput((input) => {
      if (input === 'x') {
        dismissHint()
      }

      if (input === 's') {
        showHint('first_npc_encounter')
      }
    })

    return (
      <Box flexDirection="column">
        {currentHint ? (
          <ContextualHelp visible hint={currentHint} onDismiss={dismissHint} />
        ) : (
          <Text>No hint</Text>
        )}
      </Box>
    )
  }

  const { lastFrame, stdin, unmount } = render(<TestComponentWithMultipleShows />)

  // Wait for useEffect
  await new Promise((resolve) => {
    setTimeout(resolve, 50)
  })

  // Hint should be shown
  let output = lastFrame()
  t.true(output!.includes('💡 First NPC Encounter'))

  // Dismiss hint
  stdin.write('x')
  await new Promise((resolve) => {
    setTimeout(resolve, 50)
  })

  output = lastFrame()
  t.true(output!.includes('No hint'))

  // Try to show again — should not appear (first_time trigger)
  stdin.write('s')
  await new Promise((resolve) => {
    setTimeout(resolve, 50)
  })

  output = lastFrame()
  t.false(output!.includes('💡 First NPC Encounter'))
  unmount()
})

test('HELP_HINTS contains all required hints', (t) => {
  const requiredHints = [
    'first_npc_encounter',
    'reputation_explained',
    'market_trends',
    'npc_trading',
    'rival_encounter',
    'information_gathering',
    'travel_animation',
    'combat_encounter',
    'game_over',
  ]

  for (const hintId of requiredHints) {
    t.truthy(HELP_HINTS[hintId], `Missing help hint: ${hintId}`)
    t.truthy(HELP_HINTS[hintId]!.title, `Missing title for hint: ${hintId}`)
    t.truthy(HELP_HINTS[hintId]!.content, `Missing content for hint: ${hintId}`)
    t.truthy(HELP_HINTS[hintId]!.context, `Missing context for hint: ${hintId}`)
  }
})

test('Help hints have appropriate content length', (t) => {
  for (const [hintId, hint] of Object.entries(HELP_HINTS)) {
    t.true(hint.title.length > 3, `Title too short for hint: ${hintId}`)
    t.true(hint.content.length > 20, `Content too short for hint: ${hintId}`)
    t.true(hint.content.length < 300, `Content too long for hint: ${hintId}`)
  }
})

test('NPC trading hint has correct content', (t) => {
  const hint = HELP_HINTS['npc_trading']!
  t.true(hint.content.includes('unique trades'))
  t.true(hint.content.includes('reputation'))
  t.true(hint.content.includes('exclusive'))
})

test('Market trends hint explains trend indicators', (t) => {
  const hint = HELP_HINTS['market_trends']!
  t.true(hint.content.includes('↗'))
  t.true(hint.content.includes('↘'))
  t.true(hint.content.includes('rising prices'))
  t.true(hint.content.includes('falling prices'))
})

test('Rival encounter hint has always trigger', (t) => {
  const hint = HELP_HINTS['rival_encounter']!
  t.truthy(hint)
  t.is(hint.trigger, 'always')
  t.true(hint.content.includes('rival alchemist'))
  t.true(hint.content.includes('reputation'))
})

test('Information gathering hint explains informant NPCs', (t) => {
  const hint = HELP_HINTS['information_gathering']!
  t.true(hint.content.includes('Informant NPCs'))
  t.true(hint.content.includes('market tips'))
  t.true(hint.content.includes('trading decisions'))
})

test('Combat encounter hint has correct content', (t) => {
  const hint = HELP_HINTS['combat_encounter']!
  t.truthy(hint)
  t.is(hint.trigger, 'first_time')
  t.true(hint.content.includes('[A]ttack'))
  t.true(hint.content.includes('[D]efend'))
  t.true(hint.content.includes('[F]lee'))
})

test('Game over hint has always trigger', (t) => {
  const hint = HELP_HINTS['game_over']!
  t.truthy(hint)
  t.is(hint.trigger, 'always')
  t.true(hint.content.includes('journey has ended'))
})
