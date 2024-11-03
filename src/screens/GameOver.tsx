import { Box, Text } from 'ink'
import React from 'react'

export const GameOver: React.FC = () => {
  return (
    <Box flexDirection="column">
      <Text bold color="red">
        Game Over! Press 'q' to quit.
      </Text>
    </Box>
  )
}
