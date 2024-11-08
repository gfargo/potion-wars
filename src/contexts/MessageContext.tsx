import React, { createContext, useContext, useState } from 'react'

export type MessageType =
  | 'combat'
  | 'sale'
  | 'purchase'
  | 'random_event'
  | 'info'

export type Message = {
  type: MessageType
  content: string
  timestamp: number
}

type MessageContextType = {
  messages: Message[]
  addMessage: (type: MessageType, content: string) => void
  clearMessages: () => void
}

const MessageContext = createContext<MessageContextType | undefined>(undefined)

export const MessageProvider: React.FC<{
  readonly children: React.ReactNode
}> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([])

  const addMessage = (type: MessageType, content: string) => {
    setMessages((previousMessages) =>
      [...previousMessages, { type, content, timestamp: Date.now() }].slice(
        -100
      )
    ) // Keep only the last 100 messages
  }

  const clearMessages = () => {
    setMessages([])
  }

  return (
    <MessageContext.Provider value={{ messages, addMessage, clearMessages }}>
      {children}
    </MessageContext.Provider>
  )
}

export const useMessage = () => {
  const context = useContext(MessageContext)
  if (context === undefined) {
    throw new Error('useMessage must be used within a MessageProvider')
  }

  return context
}
