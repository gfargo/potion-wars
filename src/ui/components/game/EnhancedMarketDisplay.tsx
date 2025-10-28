import { Box, Text, useInput } from 'ink'
import React, { useEffect } from 'react'
import { ReputationManager } from '../../../core/reputation/ReputationManager.js'
import { EnhancedEconomyManager } from '../../../core/game/enhancedEconomy.js'
import type { MarketState, MarketTrend } from '../../../types/economy.types.js'
import type { ReputationState } from '../../../types/reputation.types.js'
import { ContextualHelp } from '../common/ContextualHelp.js'
import { useContextualHelp } from '../common/ContextualHelp.js'

type EnhancedMarketDisplayProps = {
  readonly markets: MarketState
  readonly reputation: ReputationState
  readonly currentLocation: string
  readonly showTrends?: boolean
  readonly showHistory?: boolean
  readonly compact?: boolean
}

export function EnhancedMarketDisplay({ 
  markets, 
  reputation, 
  currentLocation,
  showTrends = true,
  showHistory = false,
  compact = false 
}: EnhancedMarketDisplayProps) {
  const locationReputation = ReputationManager.getLocationReputation(reputation, currentLocation)
  const reputationModifier = ReputationManager.calculatePriceModifier(locationReputation)
  const trends = EnhancedEconomyManager.getMarketTrends(markets)
  
  // Contextual help system
  const { currentHint, showHint, dismissHint } = useContextualHelp()
  
  // Show help hint when market display is first shown with trends
  useEffect(() => {
    if (showTrends && !compact) {
      showHint('market_trends')
    }
  }, [showTrends, compact, showHint])
  
  // Handle help dismissal
  useInput((input) => {
    if (input === 'x' && currentHint) {
      dismissHint()
    }
  })

  if (compact) {
    return (
      <Box flexDirection="column" borderStyle="single" paddingX={1} minWidth={35}>
        <Text bold color="cyan">Market Prices 🧪</Text>
        {Object.entries(markets).map(([potionType, marketData]) => {
          const adjustedPrice = Math.floor(marketData.currentPrice * reputationModifier)
          const trend = marketData.trend
          
          return (
            <Box key={potionType} flexDirection="row" justifyContent="space-between">
              <Text>{potionType}:</Text>
              <Box flexDirection="row" gap={1}>
                <Text color={getPriceColor(adjustedPrice, marketData.basePrice)}>
                  {adjustedPrice}g
                </Text>
                <Text color={getTrendColor(trend)}>
                  {getTrendIndicator(trend)}
                </Text>
              </Box>
            </Box>
          )
        })}
        {reputationModifier !== 1.0 && (
          <Text dimColor>
            Rep bonus: {reputationModifier < 1.0 ? '-' : '+'}{Math.round(Math.abs(1 - reputationModifier) * 100)}%
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1} minWidth={50}>
      <Text bold color="cyan">Enhanced Market Analysis 📊</Text>
      
      {/* Current Prices */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="yellow">Current Prices ({currentLocation}):</Text>
        {Object.entries(markets).map(([potionType, marketData]) => {
          const basePrice = marketData.currentPrice
          const adjustedPrice = Math.floor(basePrice * reputationModifier)
          const trend = marketData.trend
          const supplyDemandRatio = marketData.demand / marketData.supply
          
          return (
            <Box key={potionType} flexDirection="row" justifyContent="space-between">
              <Box flexDirection="row" gap={1} width="60%">
                <Text>{potionType}:</Text>
                <Text color={getTrendColor(trend)} dimColor>
                  {getTrendIndicator(trend)}
                </Text>
              </Box>
              <Box flexDirection="row" gap={1}>
                {reputationModifier !== 1.0 && (
                  <Text dimColor strikethrough={true}>{basePrice}g</Text>
                )}
                <Text color={getPriceColor(adjustedPrice, marketData.basePrice)}>
                  {adjustedPrice}g
                </Text>
                <Text dimColor>
                  ({getSupplyDemandIndicator(supplyDemandRatio)})
                </Text>
              </Box>
            </Box>
          )
        })}
      </Box>

      {/* Market Trends */}
      {showTrends && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="yellow">Market Trends:</Text>
          {trends.map(({ potionType, trend, priceChange, confidence }) => (
            <Box key={potionType} flexDirection="row" justifyContent="space-between">
              <Text>{potionType}:</Text>
              <Box flexDirection="row" gap={1}>
                <Text color={getTrendColor(trend)}>
                  {trend.toUpperCase()}
                </Text>
                {priceChange !== 0 && (
                  <Text color={priceChange > 0 ? 'green' : 'red'}>
                    {priceChange > 0 ? '+' : ''}{priceChange.toFixed(1)}%
                  </Text>
                )}
                <Text dimColor>
                  ({Math.round(confidence * 100)}%)
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {/* Price History */}
      {showHistory && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="yellow">Recent Price History:</Text>
          {Object.entries(markets).slice(0, 3).map(([potionType, marketData]) => (
            <Box key={potionType} flexDirection="column">
              <Text>{potionType}:</Text>
              <Box flexDirection="row" gap={1}>
                {marketData.history.slice(-7).map((entry, index) => (
                  <Text 
                    key={index} 
                    color={entry.playerTransaction ? 'cyan' : 'white'}
                    dimColor={!entry.playerTransaction}
                  >
                    {entry.price}
                  </Text>
                ))}
              </Box>
            </Box>
          ))}
          <Text dimColor>Cyan = your trades, White = market activity</Text>
        </Box>
      )}

      {/* Market Intelligence */}
      <Box flexDirection="column">
        <Text bold color="yellow">Market Intelligence:</Text>
        {getMarketIntelligence(markets, trends).map((intel, index) => (
          <Text key={index} dimColor>
            • {intel}
          </Text>
        ))}
      </Box>

      {/* Reputation Effect */}
      {reputationModifier !== 1.0 && (
        <Box marginTop={1} borderStyle="single" paddingX={1}>
          <Text color={reputationModifier < 1.0 ? 'green' : 'red'}>
            Reputation Effect: {reputationModifier < 1.0 ? 'Discount' : 'Markup'} of {Math.round(Math.abs(1 - reputationModifier) * 100)}%
          </Text>
        </Box>
      )}
      
      {/* Contextual Help */}
      {currentHint && !compact && (
        <ContextualHelp 
          hint={currentHint} 
          visible={true}
          onDismiss={dismissHint}
        />
      )}
    </Box>
  )
}

/**
 * Get color for price display based on comparison to base price
 */
function getPriceColor(currentPrice: number, basePrice: number): string {
  const ratio = currentPrice / basePrice
  if (ratio > 1.2) return 'red'
  if (ratio > 1.1) return 'yellow'
  if (ratio < 0.8) return 'green'
  if (ratio < 0.9) return 'cyan'
  return 'white'
}

/**
 * Get color for trend display
 */
function getTrendColor(trend: MarketTrend): string {
  switch (trend) {
    case 'rising':
      return 'green'
    case 'falling':
      return 'red'
    case 'volatile':
      return 'magenta'
    case 'stable':
      return 'white'
    default:
      return 'white'
  }
}

/**
 * Get indicator symbol for trend
 */
function getTrendIndicator(trend: MarketTrend): string {
  switch (trend) {
    case 'rising':
      return '↗'
    case 'falling':
      return '↘'
    case 'volatile':
      return '↕'
    case 'stable':
      return '→'
    default:
      return '?'
  }
}

/**
 * Get supply/demand indicator
 */
function getSupplyDemandIndicator(ratio: number): string {
  if (ratio > 1.5) return 'High Demand'
  if (ratio > 1.2) return 'Good Demand'
  if (ratio < 0.7) return 'Oversupply'
  if (ratio < 0.8) return 'Low Demand'
  return 'Balanced'
}

/**
 * Generate market intelligence insights
 */
function getMarketIntelligence(
  markets: MarketState, 
  trends: Array<{ potionType: string; trend: MarketTrend; priceChange: number; confidence: number }>
): string[] {
  const intelligence: string[] = []

  // Find best opportunities
  const risingTrends = trends.filter(t => t.trend === 'rising' && t.confidence > 0.6)
  const fallingTrends = trends.filter(t => t.trend === 'falling' && t.confidence > 0.6)
  const volatileTrends = trends.filter(t => t.trend === 'volatile')

  if (risingTrends.length > 0) {
    const best = risingTrends.sort((a, b) => b.priceChange - a.priceChange)[0]
    if (best) {
      intelligence.push(`${best.potionType} prices are rising strongly (+${best.priceChange.toFixed(1)}%)`)
    }
  }

  if (fallingTrends.length > 0) {
    const worst = fallingTrends.sort((a, b) => a.priceChange - b.priceChange)[0]
    if (worst) {
      intelligence.push(`${worst.potionType} prices are falling (${worst.priceChange.toFixed(1)}%)`)
    }
  }

  if (volatileTrends.length > 0) {
    intelligence.push(`${volatileTrends.map(t => t.potionType).join(', ')} showing high volatility`)
  }

  // Supply/demand insights
  const highDemandPotions = Object.entries(markets)
    .filter(([, data]) => data.demand / data.supply > 1.3)
    .map(([name]) => name)

  const oversupplyPotions = Object.entries(markets)
    .filter(([, data]) => data.demand / data.supply < 0.7)
    .map(([name]) => name)

  if (highDemandPotions.length > 0) {
    intelligence.push(`High demand for: ${highDemandPotions.join(', ')}`)
  }

  if (oversupplyPotions.length > 0) {
    intelligence.push(`Oversupply of: ${oversupplyPotions.join(', ')}`)
  }

  // General market condition
  const avgTrend = trends.reduce((sum, t) => sum + t.priceChange, 0) / trends.length
  if (avgTrend > 5) {
    intelligence.push('Overall market is bullish - prices rising')
  } else if (avgTrend < -5) {
    intelligence.push('Overall market is bearish - prices falling')
  } else {
    intelligence.push('Market conditions are stable')
  }

  return intelligence.slice(0, 4) // Limit to 4 insights
}

export default EnhancedMarketDisplay