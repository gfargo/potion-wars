import test from 'ava'
import { gameReducer } from '../reducers/gameReducer.js'
import { updateReputation, resetReputation } from '../actions/creators.js'
import {
    selectReputation,
    selectGlobalReputation,
    selectLocationReputation,
    selectCurrentLocationReputation,
    selectNPCRelationship,
    selectGlobalReputationLevel,
    selectLocationReputationLevel,
    selectReputationPriceModifier,
} from '../selectors/gameSelectors.js'
import { createGameState } from './utils/testHelper.js'
import { ReputationLevel } from '../../../types/reputation.types.js'

test('updateReputation action updates global reputation', (t) => {
  const initialState = createGameState()
  const action = updateReputation({ global: 10 })
  
  const newState = gameReducer(initialState, action)
  
  t.is(newState.reputation.global, 10)
  t.deepEqual(newState.reputation.locations, {})
  t.deepEqual(newState.reputation.npcRelationships, {})
})

test('updateReputation action updates location reputation', (t) => {
  const initialState = createGameState()
  const action = updateReputation({ 
    location: 'Market Square', 
    locationChange: 15 
  })
  
  const newState = gameReducer(initialState, action)
  
  t.is(newState.reputation.global, 0)
  t.is(newState.reputation.locations['Market Square'], 15)
  t.deepEqual(newState.reputation.npcRelationships, {})
})

test('updateReputation action updates NPC relationship', (t) => {
  const initialState = createGameState()
  const action = updateReputation({ 
    npc: 'merchant_aldric', 
    npcChange: 20 
  })
  
  const newState = gameReducer(initialState, action)
  
  t.is(newState.reputation.global, 0)
  t.deepEqual(newState.reputation.locations, {})
  t.is(newState.reputation.npcRelationships['merchant_aldric'], 20)
})

test('updateReputation action updates multiple reputation types', (t) => {
  const initialState = createGameState()
  const action = updateReputation({ 
    global: 5,
    location: 'Market Square', 
    locationChange: 10,
    npc: 'merchant_aldric', 
    npcChange: 15 
  })
  
  const newState = gameReducer(initialState, action)
  
  t.is(newState.reputation.global, 5)
  t.is(newState.reputation.locations['Market Square'], 10)
  t.is(newState.reputation.npcRelationships['merchant_aldric'], 15)
})

test('updateReputation action accumulates reputation changes', (t) => {
  let state = createGameState({
    reputation: {
      global: 10,
      locations: { 'Market Square': 20 },
      npcRelationships: { 'merchant_aldric': 30 }
    }
  })
  
  const action = updateReputation({ 
    global: 5,
    location: 'Market Square', 
    locationChange: 10,
    npc: 'merchant_aldric', 
    npcChange: -5 
  })
  
  state = gameReducer(state, action)
  
  t.is(state.reputation.global, 15)
  t.is(state.reputation.locations['Market Square'], 30)
  t.is(state.reputation.npcRelationships['merchant_aldric'], 25)
})

test('resetReputation action resets all reputation to zero', (t) => {
  const initialState = createGameState({
    reputation: {
      global: 50,
      locations: { 'Market Square': 30, 'Royal Palace': -20 },
      npcRelationships: { 'merchant_aldric': 40, 'guard_captain': -10 }
    }
  })
  
  const action = resetReputation()
  const newState = gameReducer(initialState, action)
  
  t.is(newState.reputation.global, 0)
  t.deepEqual(newState.reputation.locations, {})
  t.deepEqual(newState.reputation.npcRelationships, {})
})

test('selectReputation returns complete reputation state', (t) => {
  const state = createGameState({
    reputation: {
      global: 25,
      locations: { 'Market Square': 15 },
      npcRelationships: { 'merchant_aldric': 10 }
    }
  })
  
  const reputation = selectReputation(state)
  
  t.is(reputation.global, 25)
  t.is(reputation.locations['Market Square'], 15)
  t.is(reputation.npcRelationships['merchant_aldric'], 10)
})

test('selectGlobalReputation returns global reputation value', (t) => {
  const state = createGameState({
    reputation: { global: 42, locations: {}, npcRelationships: {} }
  })
  
  t.is(selectGlobalReputation(state), 42)
})

test('selectLocationReputation returns location reputation or 0 if not found', (t) => {
  const state = createGameState({
    reputation: {
      global: 0,
      locations: { 'Market Square': 30 },
      npcRelationships: {}
    }
  })
  
  t.is(selectLocationReputation(state, 'Market Square'), 30)
  t.is(selectLocationReputation(state, 'Unknown Location'), 0)
})

test('selectCurrentLocationReputation returns current location reputation', (t) => {
  const state = createGameState({
    location: {
      name: 'Market Square',
      description: 'A busy marketplace',
      dangerLevel: 2
    },
    reputation: {
      global: 0,
      locations: { 'Market Square': 25 },
      npcRelationships: {}
    }
  })
  
  t.is(selectCurrentLocationReputation(state), 25)
})

test('selectCurrentLocationReputation returns 0 for unknown location', (t) => {
  const state = createGameState({
    location: {
      name: 'Unknown Place',
      description: 'A mysterious location',
      dangerLevel: 5
    },
    reputation: {
      global: 0,
      locations: { 'Market Square': 25 },
      npcRelationships: {}
    }
  })
  
  t.is(selectCurrentLocationReputation(state), 0)
})

test('selectNPCRelationship returns NPC relationship or 0 if not found', (t) => {
  const state = createGameState({
    reputation: {
      global: 0,
      locations: {},
      npcRelationships: { 'merchant_aldric': 35 }
    }
  })
  
  t.is(selectNPCRelationship(state, 'merchant_aldric'), 35)
  t.is(selectNPCRelationship(state, 'unknown_npc'), 0)
})

test('selectGlobalReputationLevel returns correct reputation level', (t) => {
  const neutralState = createGameState({
    reputation: { global: 0, locations: {}, npcRelationships: {} }
  })
  
  const likedState = createGameState({
    reputation: { global: 30, locations: {}, npcRelationships: {} }
  })
  
  const despisedState = createGameState({
    reputation: { global: -60, locations: {}, npcRelationships: {} }
  })
  
  t.is(selectGlobalReputationLevel(neutralState), ReputationLevel.NEUTRAL)
  t.is(selectGlobalReputationLevel(likedState), ReputationLevel.LIKED)
  t.is(selectGlobalReputationLevel(despisedState), ReputationLevel.DESPISED)
})

test('selectLocationReputationLevel returns correct reputation level for location', (t) => {
  const state = createGameState({
    reputation: {
      global: 0,
      locations: { 
        'Market Square': 60,
        'Dark Alley': -30
      },
      npcRelationships: {}
    }
  })
  
  t.is(selectLocationReputationLevel(state, 'Market Square'), ReputationLevel.RESPECTED)
  t.is(selectLocationReputationLevel(state, 'Dark Alley'), ReputationLevel.DISLIKED)
  t.is(selectLocationReputationLevel(state, 'Unknown'), ReputationLevel.NEUTRAL)
})

test('selectReputationPriceModifier returns price modifier for current location', (t) => {
  const state = createGameState({
    location: {
      name: 'Market Square',
      description: 'A busy marketplace',
      dangerLevel: 2
    },
    reputation: {
      global: 0,
      locations: { 'Market Square': 50 },
      npcRelationships: {}
    }
  })
  
  const modifier = selectReputationPriceModifier(state)
  t.true(typeof modifier === 'number')
  t.true(modifier > 0)
})

test('selectReputationPriceModifier returns price modifier for specified location', (t) => {
  const state = createGameState({
    reputation: {
      global: 0,
      locations: { 'Royal Palace': -40 },
      npcRelationships: {}
    }
  })
  
  const modifier = selectReputationPriceModifier(state, 'Royal Palace')
  t.true(typeof modifier === 'number')
  t.true(modifier > 0)
})