import { type Weather } from './weather.types.js'

export type NPCType = 'merchant' | 'informant' | 'guard' | 'rival' | 'citizen'

export type NPCPersonality = {
  greeting: string
  farewell: string
  tradeAccept: string
  tradeDecline: string
  lowReputation: string
  highReputation: string
}

export type NPCAvailability = {
  probability: number // 0-1, chance of encounter
  timeRestriction?: [number, number] // day range
  weatherRestriction?: Weather[]
  reputationGate?: number // minimum reputation required
}

export type ReputationRequirement = {
  minimum?: number
  maximum?: number
  location?: string
}

export type NPCTrade = {
  offer: string
  price: number
  quantity: number
  reputationRequirement?: number
  conditions?: NPCTradeCondition[]
}

export type NPCTradeCondition = {
  type: 'reputation' | 'cash' | 'inventory' | 'day'
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  value: number | string
}

export type NPCInformation = {
  id: string
  content: string
  reputationRequirement?: number
  conditions?: NPCInformationCondition[]
  category: 'market' | 'event' | 'location' | 'general'
}

export type NPCInformationCondition = {
  type: 'reputation' | 'cash' | 'inventory' | 'day' | 'location'
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  value: number | string
}

export type DialogueNode = {
  id: string
  text: string
  choices: DialogueChoice[]
  conditions?: DialogueCondition[]
  effects?: DialogueEffect[]
}

export type DialogueChoice = {
  text: string
  nextNode?: string
  conditions?: DialogueCondition[]
  effects?: DialogueEffect[]
  reputationChange?: number
}

export type DialogueCondition = {
  type: 'reputation' | 'cash' | 'inventory' | 'day' | 'location'
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte'
  value: number | string
  location?: string // for location-specific reputation checks
}

export type DialogueEffect = {
  type: 'reputation' | 'cash' | 'inventory' | 'health'
  value: number
  location?: string // for location-specific reputation changes
  item?: string // for inventory changes
}

export type NPCDialogue = {
  rootNode: string
  nodes: Record<string, DialogueNode>
}

export type NPC = {
  id: string
  name: string
  type: NPCType
  description: string
  personality: NPCPersonality
  location: string
  availability: NPCAvailability
  reputation: ReputationRequirement
  trades?: NPCTrade[]
  information?: NPCInformation[]
  dialogue: NPCDialogue
}

// Animation-related types for NPCs
export type AnimationFrame = string[] // Array of ASCII art lines

export type NPCAnimation = {
  idle: AnimationFrame[]
  talking: AnimationFrame[]
  trading: AnimationFrame[]
}