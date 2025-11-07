import { Box, Text } from 'ink'
import React from 'react'
import { useStore } from '../../../store/appStore.js'
import {
  selectHealth,
  selectCash,
  selectDebt,
} from '../../../store/selectors.js'
import { ReputationDisplay } from './ReputationDisplay.js'

function PlayerStatus() {
  const health = useStore(selectHealth)
  const cash = useStore(selectCash)
  const debt = useStore(selectDebt)
  const reputation = useStore((state) => state.game.reputation)
  const locationName = useStore((state) => state.game.location.name)

  return (
    <Box gap={1}>
      <Box borderDimColor borderStyle="single" borderColor="cyan" paddingX={1}>
        <Text>♡ {health}%</Text>
      </Box>
      <Box borderDimColor borderStyle="single" borderColor="blue" paddingX={1}>
        <Text>Purse: {cash}g</Text>
        <Text>{` | `}</Text>
        <Text>Debt: {debt}g</Text>
      </Box>
      <Box
        borderDimColor
        borderStyle="single"
        borderColor="magenta"
        paddingX={1}
      >
        <ReputationDisplay
          compact
          reputation={reputation}
          currentLocation={locationName}
        />
      </Box>
    </Box>
  )
}

export default PlayerStatus
