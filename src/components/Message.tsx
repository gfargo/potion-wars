import chalk from 'chalk'
import { Box, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'
import { useUI } from '../contexts/UIContext.js'

const Message: React.FC = () => {
  const { message } = useGame()
  const { combatResult } = useUI()

  return (
    <Box flexDirection="column" paddingX={1} marginBottom={1}>
      <Text bold>{chalk.hex('#f7c978')('Messages:')}</Text>
      <Text>{message}</Text>
      {combatResult && <Text color="red">{combatResult}</Text>}
    </Box>
  )
}

export default Message
