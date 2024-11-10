import { Box, Text, useInput } from 'ink'
import React from 'react'
import { HELP_TEXT } from '../constants.js'
import { useUI } from '../contexts/UIContext.js'

export const Help = () => {
  const { toggleHelp } = useUI()

  useInput((input, key) => {
    if (input === 'h' || key.escape) {
      toggleHelp()
      return
    }
  })

  return (
    <Box flexDirection="column" borderStyle="classic" paddingX={1} marginTop={-10}>
      <Text>{HELP_TEXT}</Text>
      <Box alignSelf="flex-end" paddingX={1}>
        <Text>Press 'h' or 'esc' to close</Text>
      </Box>
    </Box>
  )
}
