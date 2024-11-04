import chalk from 'chalk'
import { Box, Newline, Text } from 'ink'
import React from 'react'
import { useGame } from '../contexts/GameContext.js'

const Location: React.FC = () => {
  const { gameState } = useGame()

  return (
    <Box 
      width={"100%"}
      flexDirection="column"
      borderStyle="singleDouble"
      paddingX={1}
      borderDimColor
    >
      <Box
        width="100%"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={1}
      >
        <Text bold>
          {chalk.hex('#5a55ae')(`Location: ${gameState.location.name}`)} 
        </Text>
        <Text color="red" dimColor>
          Danger Level: {gameState.location.dangerLevel}
        </Text>
      </Box>
      <Text>{gameState.location.description}</Text>
      <Newline />
    </Box>
  )
}

export default Location
