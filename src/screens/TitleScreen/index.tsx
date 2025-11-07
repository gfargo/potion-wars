import { Box } from 'ink'
import Gradient from 'ink-gradient'
import React from 'react'
import { useStore } from '../../store/appStore.js'
import { Help } from '../../ui/components/game/index.js'
import { TitleScreenAnimation } from './TitleScreenAnimation.js'
import { TitleScreenMenu } from './TitleScreenMenu.js'

export function TitleScreen() {
  const showHelp = useStore((state) => state.ui.showHelp)

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
