import { Box, Text } from 'ink'
import React from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useStore } from '../../../store/appStore.js'
import { selectWeatherUI } from '../../../store/selectors.js'

function Weather() {
  const { icon, color, text } = useStore(useShallow(selectWeatherUI))

  return (
    <Box width={9}>
      <Text color={color}>
        {icon}
        {` `}
        {text}
      </Text>
    </Box>
  )
}

export default Weather
