import { Box } from 'ink'
import Gradient from 'ink-gradient'
import { default as React } from 'react'
import { useUI } from '../../contexts/UIContext.js'
import { Help } from '../../ui/Help.js'
import { TitleScreenAnimation } from './TitleScreenAnimation.js'
import { TitleScreenMenu } from './TitleScreenMenu.js'

function TitleScreen() {
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
        <>
          <Help />
        </>
      ) : (
        <>
          <TitleScreenMenu />
        </>
      )}
    </Box>
  )
}

export default TitleScreen
