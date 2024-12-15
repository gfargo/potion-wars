import { Box, Newline, Text } from 'ink'
import React from 'react'
import { useGame } from '../../../contexts/GameContext.js'
import {
  selectLocationDanger,
  selectLocationDescription,
  selectLocationName,
} from '../../../core/state/index.js'

function Location() {
  const { gameState } = useGame()
  const locationName = selectLocationName(gameState)
  const dangerLevel = selectLocationDanger(gameState)
  const description = selectLocationDescription(gameState)

  return (
    <Box
      borderDimColor
      width="100%"
      flexDirection="column"
      borderStyle="singleDouble"
      paddingX={1}
    >
      <Box
        width="100%"
        justifyContent="space-between"
        alignItems="center"
        marginBottom={1}
      >
        <Box flexShrink={0} width={40}>
          <Text bold wrap="truncate-end">
            Location: {locationName}
          </Text>
        </Box>
        <Box flexShrink={0}>
          <Text dimColor color="red">
            Danger: {dangerLevel}
          </Text>
        </Box>
      </Box>
      <Text>{description}</Text>
      <Newline />
    </Box>
  )
}

export default Location
