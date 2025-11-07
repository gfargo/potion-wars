import { Box, Text } from 'ink'
import React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../../../store/appStore.js'
import { selectDayInfo } from '../../../store/selectors.js'

function Day() {
  const { current, total } = useStore(useShallow(selectDayInfo))

  return (
    <Box>
      <Text italic bold color="green">
        Day {current}/{total}
      </Text>
    </Box>
  )
}

export default Day
