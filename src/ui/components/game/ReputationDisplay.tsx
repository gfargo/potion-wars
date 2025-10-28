import { Box, Text, useInput } from 'ink'
import React, { useEffect } from 'react'
import { ReputationManager } from '../../../core/reputation/ReputationManager.js'
import { ReputationLevel } from '../../../types/reputation.types.js'
import { useContextualHelp, ContextualHelp } from '../common/index.js'
import type { ReputationState } from '../../../types/reputation.types.js'

type ReputationDisplayProps = {
  readonly reputation: ReputationState
  readonly currentLocation: string
  readonly showDetails?: boolean
  readonly compact?: boolean
}

export function ReputationDisplay({ 
  reputation, 
  currentLocation, 
  showDetails = false,
  compact = false 
}: ReputationDisplayProps) {
  const globalLevel = ReputationManager.getReputationLevel(reputation.global)
  const locationReputation = ReputationManager.getLocationReputation(reputation, currentLocation)
  const locationLevel = ReputationManager.getReputationLevel(locationReputation)
  const priceModifier = ReputationManager.calculatePriceModifier(locationReputation)
  const accessLevel = ReputationManager.getAccessLevel(locationReputation)
  
  // Contextual help system
  const { currentHint, showHint, dismissHint } = useContextualHelp()
  
  // Show help hint when reputation display is first shown
  useEffect(() => {
    if (!compact && showDetails) {
      showHint('reputation_explained')
    }
  }, [showDetails, compact, showHint])
  
  // Handle help dismissal
  useInput((input) => {
    if (input === 'x' && currentHint) {
      dismissHint()
    }
  })

  if (compact) {
    return (
      <Box flexDirection="row" gap={2}>
        <Text color="cyan">Rep:</Text>
        <Text color={getReputationColor(locationLevel)}>
          {locationLevel} ({locationReputation >= 0 ? '+' : ''}{locationReputation})
        </Text>
        {priceModifier !== 1.0 && (
          <Text color={priceModifier < 1.0 ? 'green' : 'red'}>
            {priceModifier < 1.0 ? '↓' : '↑'}{Math.round((Math.abs(1 - priceModifier)) * 100)}%
          </Text>
        )}
      </Box>
    )
  }

  return (
    <Box flexDirection="column" borderStyle="single" paddingX={1}>
      <Text bold color="cyan">Reputation Status</Text>
      
      {/* Global Reputation */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text>Global:</Text>
        <Box flexDirection="row" gap={1}>
          <Text color={getReputationColor(globalLevel)}>{globalLevel}</Text>
          <Text dimColor>
            ({reputation.global >= 0 ? '+' : ''}{reputation.global})
          </Text>
        </Box>
      </Box>

      {/* Current Location Reputation */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text>{currentLocation}:</Text>
        <Box flexDirection="row" gap={1}>
          <Text color={getReputationColor(locationLevel)}>{locationLevel}</Text>
          <Text dimColor>
            ({locationReputation >= 0 ? '+' : ''}{locationReputation})
          </Text>
        </Box>
      </Box>

      {/* Price Modifier */}
      {priceModifier !== 1.0 && (
        <Box flexDirection="row" justifyContent="space-between">
          <Text>Price Effect:</Text>
          <Text color={priceModifier < 1.0 ? 'green' : 'red'}>
            {priceModifier < 1.0 ? 'Discount' : 'Markup'} {Math.round((Math.abs(1 - priceModifier)) * 100)}%
          </Text>
        </Box>
      )}

      {/* Access Level */}
      <Box flexDirection="row" justifyContent="space-between">
        <Text>Access Level:</Text>
        <Text color="yellow">{accessLevel}/5</Text>
      </Box>

      {showDetails && (
        <>
          {/* Location-specific reputations */}
          {Object.keys(reputation.locations).length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold dimColor>Location Details:</Text>
              {Object.entries(reputation.locations)
                .filter(([location]) => location !== currentLocation)
                .slice(0, 3) // Show max 3 other locations
                .map(([location, rep]) => (
                  <Box key={location} flexDirection="row" justifyContent="space-between">
                    <Text dimColor>{location}:</Text>
                    <Text color={getReputationColor(ReputationManager.getReputationLevel(rep))}>
                      {ReputationManager.getReputationLevel(rep)} ({rep >= 0 ? '+' : ''}{rep})
                    </Text>
                  </Box>
                ))}
            </Box>
          )}

          {/* NPC relationships */}
          {Object.keys(reputation.npcRelationships).length > 0 && (
            <Box flexDirection="column" marginTop={1}>
              <Text bold dimColor>NPC Relations:</Text>
              {Object.entries(reputation.npcRelationships)
                .slice(0, 3) // Show max 3 NPC relationships
                .map(([npcId, rep]) => (
                  <Box key={npcId} flexDirection="row" justifyContent="space-between">
                    <Text dimColor>{formatNPCName(npcId)}:</Text>
                    <Text color={getReputationColor(ReputationManager.getReputationLevel(rep))}>
                      {ReputationManager.getReputationLevel(rep)} ({rep >= 0 ? '+' : ''}{rep})
                    </Text>
                  </Box>
                ))}
            </Box>
          )}

          {/* Reputation effects explanation */}
          <Box flexDirection="column" marginTop={1}>
            <Text bold dimColor>Effects:</Text>
            <Text dimColor>• {getReputationEffectDescription(locationLevel, priceModifier, accessLevel)}</Text>
          </Box>
        </>
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
 * Get color for reputation level display
 */
function getReputationColor(level: ReputationLevel): string {
  switch (level) {
    case ReputationLevel.DESPISED:
      return 'red'
    case ReputationLevel.DISLIKED:
      return 'redBright'
    case ReputationLevel.NEUTRAL:
      return 'white'
    case ReputationLevel.LIKED:
      return 'green'
    case ReputationLevel.RESPECTED:
      return 'greenBright'
    case ReputationLevel.REVERED:
      return 'cyan'
    default:
      return 'white'
  }
}

/**
 * Format NPC ID for display
 */
function formatNPCName(npcId: string): string {
  return npcId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .slice(0, 12) // Truncate long names
}

/**
 * Get description of reputation effects
 */
function getReputationEffectDescription(
  level: ReputationLevel, 
  priceModifier: number, 
  accessLevel: number
): string {
  const effects: string[] = []

  if (priceModifier < 1.0) {
    effects.push(`${Math.round((1 - priceModifier) * 100)}% better prices`)
  } else if (priceModifier > 1.0) {
    effects.push(`${Math.round((priceModifier - 1) * 100)}% worse prices`)
  }

  if (accessLevel >= 4) {
    effects.push('exclusive opportunities')
  } else if (accessLevel >= 3) {
    effects.push('good opportunities')
  } else if (accessLevel <= 1) {
    effects.push('limited opportunities')
  }

  switch (level) {
    case ReputationLevel.DESPISED:
      effects.push('NPCs avoid you')
      break
    case ReputationLevel.DISLIKED:
      effects.push('NPCs are wary')
      break
    case ReputationLevel.LIKED:
      effects.push('NPCs are friendly')
      break
    case ReputationLevel.RESPECTED:
      effects.push('NPCs seek you out')
      break
    case ReputationLevel.REVERED:
      effects.push('NPCs revere you')
      break
  }

  return effects.join(', ') || 'standard interactions'
}

export default ReputationDisplay