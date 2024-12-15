import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../../../contexts/GameContext.js'
import { selectDayInfo } from '../../../core/state/index.js'

function Day() {
  const { gameState } = useGame()
  const { current, total } = selectDayInfo(gameState)

  return (
    <Box>
      <Text italic bold color="green">
        Day {current}/{total}
      </Text>
    </Box>
  )
}

export default Day
