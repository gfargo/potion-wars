import { Box, Text, useInput } from 'ink'
import React from 'react'
import { HELP_TEXT, TITLE_ART } from '../constants.js'

interface MainMenuProps {
  onAction: (action: string) => void
  showHelp: boolean
}

const MainMenu: React.FC<MainMenuProps> = ({ onAction, showHelp }) => {
  useInput((input, key) => {
    if (key.return) {
      onAction('startGame')
    }
    
    if (showHelp) {
      if (key.escape || input.toLowerCase() === 'h') {
        onAction('toggleHelp')
      }
    } else {
      switch (input.toLowerCase()) {
        case 'h':
          onAction('toggleHelp')
          break
        case 'q':
          onAction('quit')
          break
      }
    }
  })

  return (
    <Box flexDirection="column">
      <Text>{TITLE_ART}</Text>
      {showHelp ? (
        <Text>{HELP_TEXT}</Text>
      ) : (
        <Text>
          Press (Enter) to Start, Press (H) for help, (Q) to quit
        </Text>
      )}
    </Box>
  )
}

export default MainMenu
