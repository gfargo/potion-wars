import test from 'ava'
import React from 'react'
import { render } from 'ink-testing-library'
import { TutorialSystem, useTutorial, QuickHelpOverlay, TUTORIAL_STEPS } from '../TutorialSystem.js'

// Test component that uses the tutorial hook
const TestTutorialComponent: React.FC<{ triggerStep?: string }> = ({ triggerStep }) => {
  const { currentTutorialStep, triggerTutorial, completeTutorialStep, skipTutorial } = useTutorial()
  
  React.useEffect(() => {
    if (triggerStep) {
      triggerTutorial(triggerStep as any)
    }
  }, [triggerStep, triggerTutorial])
  
  return (
    <div>
      <TutorialSystem 
        currentStep={currentTutorialStep || undefined}
        onComplete={completeTutorialStep}
        onSkip={skipTutorial}
      />
    </div>
  )
}

test('TutorialSystem renders welcome step correctly', t => {
  const { lastFrame } = render(
    <TestTutorialComponent triggerStep="game_start" />
  )
  
  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('🎓 Tutorial'))
  t.true(output!.includes('Welcome to Enhanced Potion Wars!'))
  t.true(output!.includes('NPCs, reputation system, and dynamic markets'))
})

test('TutorialSystem shows navigation instructions', t => {
  const { lastFrame } = render(
    <TestTutorialComponent triggerStep="first_travel" />
  )
  
  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Press Enter to continue'))
  t.true(output!.includes('\'s\' to skip tutorial'))
  t.true(output!.includes('Esc to close'))
})

test('TutorialSystem handles Enter key to complete step', t => {
  const { lastFrame, stdin } = render(
    <TestTutorialComponent triggerStep="first_npc" />
  )
  
  // Check tutorial is shown
  let output = lastFrame()
  t.true(output!.includes('Reputation Matters'))
  
  // Press Enter to complete
  stdin.write('\r')
  
  // Tutorial should be hidden
  output = lastFrame()
  t.false(output!.includes('Reputation Matters'))
})

test('TutorialSystem handles skip tutorial', t => {
  const { lastFrame, stdin } = render(
    <TestTutorialComponent triggerStep="first_market_view" />
  )
  
  // Check tutorial is shown
  let output = lastFrame()
  t.true(output!.includes('Dynamic Markets'))
  
  // Press 's' to skip
  stdin.write('s')
  
  // Tutorial should be hidden
  output = lastFrame()
  t.false(output!.includes('Dynamic Markets'))
})

test('TutorialSystem handles escape key', t => {
  const { lastFrame, stdin } = render(
    <TestTutorialComponent triggerStep="game_start" />
  )
  
  // Check tutorial is shown
  let output = lastFrame()
  t.true(output!.includes('Welcome to Enhanced Potion Wars!'))
  
  // Press Escape to close
  stdin.write('\u001B')
  
  // Tutorial should be hidden
  output = lastFrame()
  t.false(output!.includes('Welcome to Enhanced Potion Wars!'))
})

test('QuickHelpOverlay renders correctly', t => {
  const { lastFrame } = render(
    <QuickHelpOverlay visible={true} onClose={() => {}} />
  )
  
  const output = lastFrame()
  t.truthy(output)
  t.true(output!.includes('Quick Help'))
  t.true(output!.includes('NPCs: Dialogue affects reputation'))
  t.true(output!.includes('Reputation: Better prices'))
  t.true(output!.includes('Markets: ↗↘ show price trends'))
  t.true(output!.includes('Trading: NPCs offer unique deals'))
})

test('QuickHelpOverlay does not render when not visible', t => {
  const { lastFrame } = render(
    <QuickHelpOverlay visible={false} onClose={() => {}} />
  )
  
  const output = lastFrame()
  t.truthy(output)
  t.false(output!.includes('Quick Help'))
})

test('QuickHelpOverlay handles close on escape', t => {
  let closed = false
  const { lastFrame, stdin } = render(
    <QuickHelpOverlay 
      visible={true} 
      onClose={() => { closed = true }} 
    />
  )
  
  // Check overlay is shown
  let output = lastFrame()
  t.true(output!.includes('Quick Help'))
  
  // Press Escape to close
  stdin.write('\u001B')
  
  // onClose should have been called
  t.true(closed)
})

test('QuickHelpOverlay handles close on h key', t => {
  let closed = false
  const { stdin } = render(
    <QuickHelpOverlay 
      visible={true} 
      onClose={() => { closed = true }} 
    />
  )
  
  // Press 'h' to close
  stdin.write('h')
  
  // onClose should have been called
  t.true(closed)
})

test('TUTORIAL_STEPS contains all required steps', t => {
  const requiredSteps = [
    'welcome_enhanced',
    'npc_introduction', 
    'reputation_introduction',
    'market_dynamics'
  ]
  
  requiredSteps.forEach(stepId => {
    const step = TUTORIAL_STEPS.find(s => s.id === stepId)
    t.truthy(step, `Missing tutorial step: ${stepId}`)
    t.truthy(step?.title, `Missing title for step: ${stepId}`)
    t.truthy(step?.content, `Missing content for step: ${stepId}`)
    t.truthy(step?.trigger, `Missing trigger for step: ${stepId}`)
  })
})

test('Tutorial steps have appropriate content', t => {
  TUTORIAL_STEPS.forEach(step => {
    t.true(step.title.length > 5, `Title too short for step: ${step.id}`)
    t.true(step.content.length > 20, `Content too short for step: ${step.id}`)
    t.true(step.content.length < 200, `Content too long for step: ${step.id}`)
  })
})

test('useTutorial hook manages state correctly', t => {
  const TestHookComponent: React.FC = () => {
    const { 
      currentTutorialStep, 
      tutorialCompleted, 
      tutorialSkipped,
      triggerTutorial,
      skipTutorial,
      resetTutorial
    } = useTutorial()
    
    return (
      <div>
        <button onClick={() => triggerTutorial('game_start')}>Trigger</button>
        <button onClick={skipTutorial}>Skip</button>
        <button onClick={resetTutorial}>Reset</button>
        <span>{currentTutorialStep || 'none'}</span>
        <span>{tutorialCompleted ? 'completed' : 'not-completed'}</span>
        <span>{tutorialSkipped ? 'skipped' : 'not-skipped'}</span>
      </div>
    )
  }
  
  const { lastFrame } = render(<TestHookComponent />)
  const output = lastFrame()
  t.truthy(output)
  
  // Initial state
  t.true(output!.includes('none'))
  t.true(output!.includes('not-completed'))
  t.true(output!.includes('not-skipped'))
})

test('Tutorial step content mentions key features', t => {
  const welcomeStep = TUTORIAL_STEPS.find(s => s.id === 'welcome_enhanced')
  t.truthy(welcomeStep)
  t.true(welcomeStep!.content.includes('NPCs'))
  t.true(welcomeStep!.content.includes('reputation'))
  t.true(welcomeStep!.content.includes('dynamic markets'))
  
  const npcStep = TUTORIAL_STEPS.find(s => s.id === 'npc_introduction')
  t.truthy(npcStep)
  t.true(npcStep!.content.includes('trades'))
  t.true(npcStep!.content.includes('information'))
  t.true(npcStep!.content.includes('reputation'))
  
  const marketStep = TUTORIAL_STEPS.find(s => s.id === 'market_dynamics')
  t.truthy(marketStep)
  t.true(marketStep!.content.includes('supply and demand'))
  t.true(marketStep!.content.includes('trend arrows'))
})