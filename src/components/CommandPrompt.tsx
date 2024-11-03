import React from 'react'
import { Box, Text } from 'ink'

interface CommandPromptProps {
  inputBuffer: string
}

const CommandPrompt: React.FC<CommandPromptProps> = ({ inputBuffer }) => {
  return (
    <Box marginY={1}>
      <Text>Input: {inputBuffer}</Text>
    </Box>
  )
}

export default CommandPrompt
