import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { EnhancedMarketDisplay } from '../EnhancedMarketDisplay.js'
import type { MarketState, MarketData } from '../../../../types/economy.types.js'
import type { ReputationState } from '../../../../types/reputation.types.js'

// Test market data
const mockMarketData: MarketData = {
  basePrice: 100,
  currentPrice: 120,
  demand: 0.7,
  supply: 0.4,
  trend: 'rising',
  history: [
    { day: 1, price: 100, volume: 10, playerTransaction: false },
    { day: 2, price: 110, volume: 15, playerTransaction: true },
    { day: 3, price: 120, volume: 8, playerTransaction: false }
  ],
  volatility: 0.2,
  lastUpdated: 3
}

const testMarkets: MarketState = {
  'Healing Potion': mockMarketData,
  'Strength Potion': {
    ...mockMarketData,
    basePrice: 150,
    currentPrice: 140,
    trend: 'falling',
    demand: 0.3,
    supply: 0.8
  },
  'Magic Potion': {
    ...mockMarketData,
    basePrice: 200,
    currentPrice: 200,
    trend: 'stable',
    demand: 0.5,
    supply: 0.5
  }
}

const neutralReputation: ReputationState = {
  global: 0,
  locations: { 'Market Square': 0 },
  npcRelationships: {}
}

const highReputation: ReputationState = {
  global: 60,
  locations: { 'Market Square': 75 },
  npcRelationships: {}
}

const lowReputation: ReputationState = {
  global: -40,
  locations: { 'Market Square': -60 },
  npcRelationships: {}
}

test('EnhancedMarketDisplay renders basic market information', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Enhanced Market Analysis'))
  t.true(output!.includes('Current Prices'))
  t.true(output!.includes('Healing Potion'))
  t.true(output!.includes('Strength Potion'))
  t.true(output!.includes('Magic Potion'))
})

test('EnhancedMarketDisplay shows compact format', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
      compact={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Market Prices'))
  t.true(output!.includes('120g'))
  // Should not include detailed sections in compact mode
  t.false(output!.includes('Market Trends'))
  t.false(output!.includes('Market Intelligence'))
})

test('EnhancedMarketDisplay shows trend indicators', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
      showTrends={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Market Trends'))
  t.true(output!.includes('RISING') || output!.includes('FALLING') || output!.includes('STABLE'))
})

test('EnhancedMarketDisplay applies reputation price modifiers', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={highReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Reputation Effect'))
  t.true(output!.includes('Discount'))
})

test('EnhancedMarketDisplay shows price history when requested', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
      showHistory={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Recent Price History'))
  t.true(output!.includes('your trades'))
})

test('EnhancedMarketDisplay shows market intelligence', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Market Intelligence'))
  // Should contain some intelligence insights
  t.true(output!.includes('demand') || output!.includes('supply') || output!.includes('prices'))
})

test('EnhancedMarketDisplay handles low reputation markup', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={lowReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Reputation Effect'))
  t.true(output!.includes('Markup'))
})

test('EnhancedMarketDisplay shows supply/demand indicators', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  // Should show supply/demand status
  t.true(
    output!.includes('High Demand') || 
    output!.includes('Low Demand') || 
    output!.includes('Balanced') ||
    output!.includes('Oversupply')
  )
})

test('EnhancedMarketDisplay handles empty market data', t => {
  const emptyMarkets: MarketState = {}
  
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={emptyMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Enhanced Market Analysis'))
  // Should handle empty data gracefully
  t.true(output!.includes('Market Intelligence'))
})

test('EnhancedMarketDisplay shows trend arrows', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
      compact={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  // Should show trend indicators (arrows)
  t.true(output!.includes('↗') || output!.includes('↘') || output!.includes('→') || output!.includes('↕'))
})

test('EnhancedMarketDisplay shows percentage changes', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
      showTrends={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  // Should show percentage changes in trends
  t.true(output!.includes('%'))
})

test('EnhancedMarketDisplay highlights player transactions in history', t => {
  const { lastFrame } = render(
    <EnhancedMarketDisplay 
      markets={testMarkets} 
      reputation={neutralReputation} 
      currentLocation="Market Square" 
      showHistory={true}
    />
  )

  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Cyan = your trades'))
})