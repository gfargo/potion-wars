import React, { createContext, useContext, useState, useEffect } from 'react'
import { getActiveSlot } from '../activeSlot.js'
import { loadMessages, saveMessages, clearMessageLog } from '../messageStorage.js'

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
  const activeSlot = getActiveSlot()

  // Load messages when component mounts or active slot changes
  useEffect(() => {
    if (activeSlot >= 0) {
      const loadedMessages = loadMessages(activeSlot)
      setMessages(loadedMessages)
    }
  }, [activeSlot])

  // Save messages whenever they change
  useEffect(() => {
    if (activeSlot >= 0) {
      saveMessages(messages, activeSlot)
    }
  }, [messages, activeSlot])

  const addMessage = (type: MessageType, content: string) => {
    setMessages((previousMessages) => [
      ...previousMessages,
      { type, content, timestamp: Date.now() }
    ])
  }

  const clearMessages = () => {
    if (activeSlot >= 0) {
      clearMessageLog(activeSlot)
    }
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
