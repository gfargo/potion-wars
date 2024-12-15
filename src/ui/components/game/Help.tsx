import { Box, Text, useInput } from 'ink'
import React from 'react'
import { HELP_TEXT } from '../../../constants.js'
import { useUI } from '../../../contexts/UIContext.js'

export default function Help() {
  const { toggleHelp } = useUI()

  useInput((input, key) => {
    if (input === 'h' || key.escape) {
      toggleHelp()
    }
  })

  return (
    <Box flexDirection="column" borderStyle="classic" paddingX={1}>
      <Text>{HELP_TEXT}</Text>
      <Box alignSelf="flex-end" paddingX={1}>
        <Text>Press &quot;h&quot; or &quot;esc&quot; to close</Text>
      </Box>
    </Box>
  )
}
