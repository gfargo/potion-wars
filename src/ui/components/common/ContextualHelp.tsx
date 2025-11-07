import { Box, Text } from 'ink'
import React from 'react'

export type HelpHint = {
  id: string
  title: string
  content: string
  trigger?: 'first_time' | 'always' | 'on_demand'
  context: string
}

type ContextualHelpProperties = {
  readonly hint: HelpHint
  readonly visible?: boolean
  readonly onDismiss?: () => void
}

export function ContextualHelp({
  hint,
  visible = true,
  onDismiss,
}: ContextualHelpProperties) {
  if (!visible) return null

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      paddingX={1}
      marginY={1}
    >
      <Box
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text bold color="yellow">
          💡 {hint.title}
        </Text>
        {onDismiss && (
          <Text dimColor color="gray">
            Press 'x' to dismiss
          </Text>
        )}
      </Box>

      <Box marginTop={1}>
        <Text>{hint.content}</Text>
      </Box>
    </Box>
  )
}

// Predefined help hints for different contexts
export const HELP_HINTS: Record<string, HelpHint> = {
  first_npc_encounter: {
    id: 'first_npc_encounter',
    title: 'First NPC Encounter',
    content:
      "You've encountered an NPC! Choose your dialogue options carefully - they affect your reputation. Use arrow keys to select and Enter to confirm.",
    trigger: 'first_time',
    context: 'npc_interaction',
  },

  reputation_explained: {
    id: 'reputation_explained',
    title: 'Reputation System',
    content:
      'Your reputation affects prices and available options. Build good relationships for better deals and exclusive opportunities.',
    trigger: 'first_time',
    context: 'reputation_display',
  },

  market_trends: {
    id: 'market_trends',
    title: 'Market Trends',
    content:
      'Watch the trend arrows: ↗ means rising prices (good to sell), ↘ means falling prices (good to buy). Your reputation affects the base prices.',
    trigger: 'first_time',
    context: 'market_display',
  },

  npc_trading: {
    id: 'npc_trading',
    title: 'NPC Trading',
    content:
      'NPCs offer unique trades not available in regular markets. Higher reputation unlocks better deals and exclusive items.',
    trigger: 'first_time',
    context: 'npc_trading',
  },

  rival_encounter: {
    id: 'rival_encounter',
    title: 'Rival Alchemist',
    content:
      'A rival alchemist! These encounters can affect your reputation and local market conditions. Choose your approach wisely.',
    trigger: 'always',
    context: 'rival_encounter',
  },

  information_gathering: {
    id: 'information_gathering',
    title: 'Market Intelligence',
    content:
      'Informant NPCs provide valuable market tips and rumors. This information can help you make better trading decisions.',
    trigger: 'first_time',
    context: 'information_npc',
  },

  travel_animation: {
    id: 'travel_animation',
    title: 'Travel System',
    content:
      'Enjoy the journey! Travel animations show your path between locations. You might encounter NPCs or events along the way.',
    trigger: 'first_time',
    context: 'travel_animation',
  },
}

// Hook for managing contextual help state
export function useContextualHelp() {
  const [shownHints, setShownHints] = React.useState<Set<string>>(new Set())
  const [currentHint, setCurrentHint] = React.useState<HelpHint | undefined>(
    undefined
  )

  const showHint = React.useCallback(
    (hintId: string) => {
      const hint = HELP_HINTS[hintId]
      if (!hint) return

      // Check if hint should be shown based on trigger type
      if (hint.trigger === 'first_time' && shownHints.has(hintId)) {
        return
      }

      setCurrentHint(hint)
    },
    [shownHints]
  )

  const dismissHint = React.useCallback(() => {
    if (currentHint) {
      setShownHints((previous) => new Set(previous).add(currentHint.id))
      setCurrentHint(undefined)
    }
  }, [currentHint])

  const resetHints = React.useCallback(() => {
    setShownHints(new Set())
  }, [])

  return {
    currentHint,
    showHint,
    dismissHint,
    resetHints,
    hasShownHint: (hintId: string) => shownHints.has(hintId),
  }
}
