import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'
import { useStore } from '../store/appStore.js'
import { type CombatAction } from '../types/combat.types.js'
import { ContextualHelp, useContextualHelp } from '../ui/components/common/ContextualHelp.js'

const COMBAT_ACTIONS: Array<{ label: string; action: CombatAction; key: string }> = [
  { label: '⚔️  Attack', action: 'attack', key: 'a' },
  { label: '🛡️  Defend', action: 'defend', key: 'd' },
  { label: '🧪 Use Potion', action: 'use_potion', key: 'p' },
  { label: '🏃 Flee', action: 'flee', key: 'f' },
]

function HealthBar({ current, max, color }: { current: number; max: number; color: string }) {
  const width = 20
  const filled = Math.max(0, Math.round((current / max) * width))
  const empty = width - filled
  return (
    <Text>
      [<Text color={color}>{'█'.repeat(filled)}</Text>
      <Text dimColor>{'░'.repeat(empty)}</Text>] {current}/{max}
    </Text>
  )
}

export function CombatScreen() {
  const combat = useStore((state) => state.combat.active)
  const health = useStore((state) => state.game.health)
  const inventory = useStore((state) => state.game.inventory)
  const performCombatAction = useStore((state) => state.performCombatAction)
  const endCombat = useStore((state) => state.endCombat)

  const [selectingPotion, setSelectingPotion] = useState(false)
  const [potionIndex, setPotionIndex] = useState(0)

  const { currentHint, showHint, dismissHint } = useContextualHelp()

  // Show combat help on first encounter
  React.useEffect(() => {
    showHint('combat_encounter')
  }, [])

  const usablePotions = Object.entries(inventory).filter(
    ([_, qty]) => qty > 0,
  )

  const isResolved = combat?.phase === 'resolved'

  useInput((input, key) => {
    if (!combat) return

    if (isResolved) {
      if (key.return) {
        endCombat()
      }

      return
    }

    if (selectingPotion) {
      if (key.upArrow) {
        setPotionIndex((i) => Math.max(0, i - 1))
      } else if (key.downArrow) {
        setPotionIndex((i) => Math.min(usablePotions.length - 1, i + 1))
      } else if (key.return && usablePotions.length > 0) {
        performCombatAction('use_potion', usablePotions[potionIndex]![0])
        setSelectingPotion(false)
        setPotionIndex(0)
      } else if (key.escape || input === 'b') {
        setSelectingPotion(false)
      }

      return
    }

    // Action hotkeys
    if (input === 'a') performCombatAction('attack')
    if (input === 'd') performCombatAction('defend')
    if (input === 'f') performCombatAction('flee')
    if (input === 'x') dismissHint()
    if (input === 'p') {
      if (usablePotions.length > 0) {
        setSelectingPotion(true)
      } else {
        performCombatAction('use_potion')
      }
    }
  })

  if (!combat) return null

  const { enemy, enemyMaxHealth, round, log } = combat
  const recentLog = log.slice(-6)

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {currentHint && (
        <ContextualHelp hint={currentHint} onDismiss={dismissHint} />
      )}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="red">
          ⚔️  COMBAT — Round {round} ⚔️
        </Text>
      </Box>

      <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
        <Box flexDirection="column">
          <Text bold color="green">You</Text>
          <Box>
            <Text>HP: </Text>
            <HealthBar current={health} max={100} color="green" />
          </Box>
        </Box>
        <Box flexDirection="column" alignItems="flex-end">
          <Text bold color="red">{enemy.name}</Text>
          <Box>
            <Text>HP: </Text>
            <HealthBar
              current={Math.max(0, enemy.health)}
              max={enemyMaxHealth}
              color="red"
            />
          </Box>
        </Box>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={1}
        marginBottom={1}
        height={8}
      >
        {recentLog.map((entry: string, i: number) => (
          <Text key={i} dimColor={i < recentLog.length - 1}>
            {entry}
          </Text>
        ))}
      </Box>

      {isResolved ? (
        <Box justifyContent="center">
          <Text dimColor>Press Enter to continue</Text>
        </Box>
      ) : selectingPotion ? (
        <Box flexDirection="column">
          <Text bold color="yellow">Select a potion (↑↓ Enter, B to back):</Text>
          {usablePotions.map(([name, qty], i) => (
            <Text key={name} color={i === potionIndex ? 'cyan' : undefined}>
              {i === potionIndex ? '▸ ' : '  '}{name} (x{qty})
            </Text>
          ))}
        </Box>
      ) : (
        <Box flexDirection="row" gap={3}>
          {COMBAT_ACTIONS.map(({ label, key }) => (
            <Text key={key}>
              <Text color="yellow">[{key.toUpperCase()}]</Text> {label}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  )
}

export default CombatScreen
