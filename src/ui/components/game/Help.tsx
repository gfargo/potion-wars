import { Box, Text, useInput } from 'ink'
import React, { useState } from 'react'
import { HELP_SECTIONS } from '../../../constants.js'
import { useStore } from '../../../store/appStore.js'

type HelpSection = keyof typeof HELP_SECTIONS

export default function Help() {
  const toggleHelp = useStore((state) => state.toggleHelp)
  const [currentSection, setCurrentSection] = useState<HelpSection>('basic')

  const sections: HelpSection[] = [
    'basic',
    'npcs',
    'reputation',
    'market',
    'animations',
    'advanced',
  ]
  const currentIndex = sections.indexOf(currentSection)

  useInput((input, key) => {
    if (input === 'h' || key.escape) {
      toggleHelp()
    } else if (key.leftArrow && currentIndex > 0) {
      const previousSection = sections[currentIndex - 1]
      if (previousSection) setCurrentSection(previousSection)
    } else if (key.rightArrow && currentIndex < sections.length - 1) {
      const nextSection = sections[currentIndex + 1]
      if (nextSection) setCurrentSection(nextSection)
    } else if (input >= '1' && input <= '6') {
      const sectionIndex = Number.parseInt(input) - 1
      const targetSection = sections[sectionIndex]
      if (targetSection) {
        setCurrentSection(targetSection)
      }
    }
  })

  const currentHelpSection = HELP_SECTIONS[currentSection]

  return (
    <Box flexDirection="column" borderStyle="classic" paddingX={1}>
      <Box justifyContent="center" marginBottom={1}>
        <Text bold color="cyan">
          {currentHelpSection.title}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text>{currentHelpSection.content}</Text>
      </Box>

      <Box flexDirection="column" borderStyle="single" paddingX={1}>
        <Box justifyContent="space-between" marginBottom={1}>
          <Text>Help Sections:</Text>
          <Text>
            {currentIndex + 1} of {sections.length}
          </Text>
        </Box>

        <Box flexDirection="row" flexWrap="wrap" gap={1}>
          {sections.map((section, index) => (
            <Text
              key={section}
              color={section === currentSection ? 'green' : 'gray'}
              bold={section === currentSection}
            >
              {index + 1}.{HELP_SECTIONS[section].title.split(' ')[0]}
            </Text>
          ))}
        </Box>

        <Box marginTop={1} justifyContent="center">
          <Text>
            Use ← → arrows or numbers 1-6 to navigate • Press "h" or "esc" to
            close
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
