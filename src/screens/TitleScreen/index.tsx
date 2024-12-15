import { Box } from 'ink'
import Gradient from 'ink-gradient'
import React from 'react'
import { useUI } from '../../contexts/UIContext.js'
import { Help } from '../../ui/components/game/index.js'
import { TitleScreenAnimation } from './TitleScreenAnimation.js'
import { TitleScreenMenu } from './TitleScreenMenu.js'

export function TitleScreen() {
  const { showHelp } = useUI()

  return (
    <Box
      flexDirection="column"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Gradient name="pastel">
        <TitleScreenAnimation />
      </Gradient>
      {showHelp ? (
        <Box marginTop={-10}>
          <Help />
        </Box>
      ) : (
        <TitleScreenMenu />
      )}
    </Box>
  )
}

export default TitleScreen
