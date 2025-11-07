import { Box, Newline, Text } from 'ink'
import React from 'react'
import { useStore } from '../../../store/appStore.js'
import {
  selectLocationDanger,
  selectLocationDescription,
  selectLocationName,
} from '../../../store/selectors.js'

function Location() {
  const locationName = useStore(selectLocationName)
  const dangerLevel = useStore(selectLocationDanger)
  const description = useStore(selectLocationDescription)

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
