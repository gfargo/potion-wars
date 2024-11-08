import { Box, Text, useInput } from 'ink'
import React, { useEffect, useMemo, useState } from 'react'
import { type MessageType, useMessage } from '../contexts/MessageContext.js'

const getMessageColor = (type: MessageType): string => {
  switch (type) {
    case 'combat': {
      return 'red'
    }

    case 'sale': {
      return 'green'
    }

    case 'purchase': {
      return 'yellow'
    }

    case 'random_event': {
      return 'magenta'
    }

    case 'info':
    default: {
      return 'white'
    }
  }
}

const MAX_HISTORY = 4

const Message: React.FC = () => {
  const { messages } = useMessage()
  const [currentIndex, setCurrentIndex] = useState(0)

  useInput((input) => {
    if (input === ',' && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else if (input === '.' && currentIndex < messages.length - MAX_HISTORY) {
      setCurrentIndex(currentIndex + 1)
    }
  })

  useEffect(() => {
    setCurrentIndex(Math.max(0, messages.length - MAX_HISTORY))
  }, [messages.length])

  const displayMessages = useMemo(
    () =>
      messages
        .slice(currentIndex, currentIndex + MAX_HISTORY)
        .map((message) => (
          <Text key={message.timestamp} color={getMessageColor(message.type)}>
            [{new Date(message.timestamp).toLocaleTimeString()}]{' '}
            {message.content}
          </Text>
        )),
    [messages, currentIndex]
  )

  return (
    <Box flexDirection="column">
      <Box
        borderDimColor
        borderStyle="round"
        flexDirection="column"
        height={6}
        overflow="hidden"
      >
        {displayMessages}
      </Box>

      {messages.length > MAX_HISTORY && (
        <Text dimColor italic>
          Use &apos;,&apos; to scroll back up and &apos;.&apos; to scroll down (
          {currentIndex + 1}-
          {Math.min(currentIndex + MAX_HISTORY, messages.length)} of{' '}
          {messages.length})
        </Text>
      )}
    </Box>
  )
}

export default Message
