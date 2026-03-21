import { Box, Text, useInput } from 'ink'
import React, { useMemo } from 'react'
import { ReputationManager } from '../core/reputation/ReputationManager.js'
import { useStore } from '../store/appStore.js'
import { ContextualHelp, useContextualHelp } from '../ui/components/common/ContextualHelp.js'

type GameOverProperties = {
  readonly finalScore: number
}

function getGameOverReason(
  health: number,
  debt: number,
  day: number,
): string {
  if (health <= 0) return 'Your health reached zero. The kingdom mourns another fallen peddler.'
  if (debt > 10_000) return 'Your debts spiraled beyond control. The collectors came knocking.'
  if (day > 30) return 'Thirty days have passed. Your peddling license has expired.'
  return 'Your journey has ended.'
}

function getRating(score: number): { label: string; color: string } {
  if (score >= 10_000) return { label: 'Legendary Alchemist', color: 'yellow' }
  if (score >= 5000) return { label: 'Master Peddler', color: 'green' }
  if (score >= 2000) return { label: 'Skilled Merchant', color: 'cyan' }
  if (score >= 0) return { label: 'Humble Peddler', color: 'white' }
  return { label: 'Bankrupt Wanderer', color: 'red' }
}

export function GameOver({ finalScore }: GameOverProperties) {
  const setScreen = useStore((state) => state.setScreen)
  const game = useStore((state) => state.game)
  const messages = useStore((state) => state.messages)

  const stats = useMemo(() => {
    const { tradeHistory, reputation, day, cash, debt } = game

    const totalBuys = tradeHistory.filter((t) => t.type === 'buy')
    const totalSells = tradeHistory.filter((t) => t.type === 'sell')
    const goldSpent = totalBuys.reduce((sum, t) => sum + t.totalValue, 0)
    const goldEarned = totalSells.reduce((sum, t) => sum + t.totalValue, 0)
    const profit = goldEarned - goldSpent

    const locationsVisited = new Set(tradeHistory.map((t) => t.location)).size
    const potionsTraded = new Set(tradeHistory.map((t) => t.potionType)).size

    const repLevel = ReputationManager.getReputationLevel(reputation.global)
    const npcCount = Object.keys(reputation.npcRelationships).length

    const eventCount = messages.filter(
      (m) => m.type === 'random_event',
    ).length

    return {
      day,
      cash,
      debt,
      goldEarned,
      goldSpent,
      profit,
      totalTrades: tradeHistory.length,
      locationsVisited,
      potionsTraded,
      repLevel,
      globalRep: reputation.global,
      npcCount,
      eventCount,
      health: game.health,
    }
  }, [game, messages])

  const reason = getGameOverReason(stats.health, stats.debt, stats.day)
  const rating = getRating(finalScore)

  const { currentHint, showHint, dismissHint } = useContextualHelp()

  React.useEffect(() => {
    showHint('game_over')
  }, [])

  useInput((_, key) => {
    if (key.return) {
      setScreen('title')
    }
  })

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      {currentHint && (
        <ContextualHelp hint={currentHint} onDismiss={dismissHint} />
      )}
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="red">
          ══════ GAME OVER ══════
        </Text>
      </Box>

      <Box justifyContent="center" marginBottom={1}>
        <Text dimColor italic>{reason}</Text>
      </Box>

      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        paddingX={2}
        paddingY={1}
        marginBottom={1}
      >
        <Text bold color={rating.color}>
          Rating: {rating.label}
        </Text>
        <Text bold>
          Final Score: <Text color="yellow">{finalScore}</Text> gold
        </Text>
      </Box>

      <Box flexDirection="row" gap={4} marginBottom={1}>
        <Box flexDirection="column">
          <Text bold underline color="cyan">Journey</Text>
          <Text>Days survived: {stats.day}/30</Text>
          <Text>Final cash: {stats.cash}g</Text>
          <Text>Final debt: {stats.debt}g</Text>
          <Text>Locations visited: {stats.locationsVisited}</Text>
        </Box>

        <Box flexDirection="column">
          <Text bold underline color="cyan">Trading</Text>
          <Text>Total trades: {stats.totalTrades}</Text>
          <Text>Gold earned: {stats.goldEarned}g</Text>
          <Text>Gold spent: {stats.goldSpent}g</Text>
          <Text>
            Net profit:{' '}
            <Text color={stats.profit >= 0 ? 'green' : 'red'}>
              {stats.profit >= 0 ? '+' : ''}{stats.profit}g
            </Text>
          </Text>
          <Text>Potion types traded: {stats.potionsTraded}</Text>
        </Box>

        <Box flexDirection="column">
          <Text bold underline color="cyan">Social</Text>
          <Text>Reputation: {stats.repLevel} ({stats.globalRep})</Text>
          <Text>NPCs met: {stats.npcCount}</Text>
          <Text>Events encountered: {stats.eventCount}</Text>
        </Box>
      </Box>

      <Box justifyContent="center" marginTop={1}>
        <Text dimColor>Press Enter to return to the main menu</Text>
      </Box>
    </Box>
  )
}

export default GameOver
