import fs from 'fs'
import path from 'path'
import { getSaveDirectory } from './saveLoad.js'
import { Message } from './contexts/MessageContext.js'

const getMessageLogPath = (slot: number): string => {
  return path.join(getSaveDirectory(), `messages_${slot}.json`)
}

export const initializeMessageLog = (slot: number) => {
  const messagePath = getMessageLogPath(slot)
  if (!fs.existsSync(messagePath)) {
    fs.writeFileSync(messagePath, JSON.stringify([]))
  }
}

export const clearMessageLog = (slot: number) => {
  const messagePath = getMessageLogPath(slot)
  fs.writeFileSync(messagePath, JSON.stringify([]))
}

export const saveMessages = (messages: Message[], slot: number) => {
  const messagePath = getMessageLogPath(slot)
  fs.writeFileSync(messagePath, JSON.stringify(messages))
}

export const loadMessages = (slot: number): Message[] => {
  const messagePath = getMessageLogPath(slot)
  if (!fs.existsSync(messagePath)) {
    initializeMessageLog(slot)
    return []
  }

  try {
    const fileContent = fs.readFileSync(messagePath, 'utf-8')
    const messages = JSON.parse(fileContent)
    
    // Validate that the loaded data is an array of Message objects
    if (!Array.isArray(messages) || !messages.every(isValidMessage)) {
      clearMessageLog(slot)
      return []
    }

    return messages
  } catch (error) {
    clearMessageLog(slot)
    return []
  }
}

const isValidMessage = (message: any): message is Message => {
  return (
    typeof message === 'object' &&
    message !== null &&
    typeof message.type === 'string' &&
    typeof message.content === 'string' &&
    typeof message.timestamp === 'number'
  )
}