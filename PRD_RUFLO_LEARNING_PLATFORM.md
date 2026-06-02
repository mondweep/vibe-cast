# Ruflo Agent Orchestration Learning Platform
## Product Requirements Document (PRD)

**Version**: 1.0  
**Date**: June 2, 2026  
**Status**: SPECIFICATION PHASE  
**Methodology**: SPARC with Test-Driven Development (London School)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Vision
Build an industry-leading learning platform that teaches **agent orchestration through Ruflo**, transforming 500 learners into **Certified Orchestration Architects** capable of designing, building, and deploying production-grade multi-agent systems.

### 1.2 Problem Statement
Organizations need skilled engineers who can architect complex agent systems, but:
- Existing learning platforms lack hands-on agent orchestration labs
- Certification programs don't validate real-world Ruflo deployment skills
- No structured community for pattern sharing and expert mentorship
- Steep learning curve from "Hello World" to production topologies

**Target Market**: Backend engineers, DevOps professionals, ML engineers wanting to upskill in agent coordination

### 1.3 Success Metrics (6-Month Horizon)

| Metric | Target | Threshold |
|--------|--------|-----------|
| **Active Learners** | 500 | 400+ |
| **Course Completion Rate** | 70% | 60%+ |
| **Deploy to Production within 30 days** | 85% | 75%+ |
| **Certification Pursuits** | 20% of completers | 15%+ |
| **Skill Lab Engagement** | 2.5 sessions/learner/week | 1.5+ sessions |
| **Community Contributions** | 100 peer-reviewed patterns | 50+ |
| **Practitioner Certifications Issued** | 50+ | 30+ |
| **NPS Score** | 60+ | 45+ |

### 1.4 Timeline & Phasing

| Phase | Duration | Scope | Go-Live |
|-------|----------|-------|---------|
| **MVP** | Weeks 1-8 | Learning + Basic Certification | Week 8 |
| **Phase 2** | Weeks 9-16 | Skill Lab + Community Launch | Week 16 |
| **Phase 3** | Weeks 17+ | Advanced Features + Partnerships | Week 20+ |

---

## 2. USER PERSONAS & JOBS TO BE DONE

### Persona 1: Backend Engineer (Learning Path User)
**Name**: Alex Chen  
**Experience**: 5 years backend development, new to agent systems  
**Goals**: 
- Learn agent orchestration patterns in 12 weeks
- Build working Ruflo systems for current projects
- Earn Practitioner certification to add to resume

**Jobs to Be Done**:
1. Understand multi-agent architecture concepts
2. Practice agent design in safe, sandbox environments
3. Deploy agents to staging/production
4. Get peer feedback on orchestration choices

**Pain Points**: Complex concepts scattered across docs, no unified learning path, no lab environment

---

### Persona 2: Instructor (Course Creator)
**Name**: Jordan Martinez  
**Experience**: Formerly senior engineer, now training at consultancy  
**Goals**:
- Create comprehensive Ruflo courses for clients
- Track learner progress and outcomes
- Build reputation as agent orchestration expert

**Jobs to Be Done**:
1. Design custom learning paths for teams
2. Review learner code and provide feedback
3. Access student performance metrics
4. Share lesson materials and exercises

**Pain Points**: Need to manually manage spreadsheets, no integrated assessment tools

---

### Persona 3: Certification Board Member (Credential Issuer)
**Name**: Dr. Patricia Okonkwo  
**Experience**: Standards body executive  
**Goals**:
- Maintain high certification standards
- Verify practitioner competency through real work
- Build industry partnerships

**Jobs to Be Done**:
1. Define certification requirements and rubrics
2. Review capstone projects and exam submissions
3. Vote on expert/master level candidates
4. Issue cryptographically signed credentials

**Pain Points**: Manual review process is time-consuming, no integrated submission workflow

---

### Persona 4: Community Mentor (Pattern Contributor)
**Name**: Priya Sharma  
**Experience**: Certified Architect, leads architecture team  
**Goals**:
- Share battle-tested patterns with community
- Gain recognition as subject matter expert
- Build network of fellow practitioners

**Jobs to Be Done**:
1. Document orchestration patterns from production
2. Get community feedback via peer review
3. Earn Expert badge and speaking opportunities
4. Mentor junior engineers through labs

**Pain Points**: Nowhere to contribute patterns, limited visibility

---

## 3. FEATURES BY BOUNDED CONTEXT

### Domain Model Overview
```
┌─────────────────────────────────────────────────────────┐
│                  PLATFORM ORCHESTRATOR                  │
├──────────────┬──────────────┬──────────────┬────────────┤
│   LEARNING   │ SKILL LAB    │COMMUNITY     │ METRICS    │
│   DOMAIN     │  DOMAIN      │  DOMAIN      │  DOMAIN    │
├──────────────┼──────────────┼──────────────┼────────────┤
│ Curriculum   │ Simulators   │ Pattern      │ Analytics  │
│ Paths        │ Exercises    │ Repository   │ Reporting  │
│ Lessons      │ Feedback     │ Peer Review  │ Dashboards │
└──────────────┴──────────────┴──────────────┴────────────┘
        ↓              ↓              ↓              ↓
   ┌────────────────────────────────────────────────────┐
   │        CERTIFICATION DOMAIN                         │
   │ (Cross-cutting: Issues certs based on all domains) │
   └────────────────────────────────────────────────────┘
        ↓
   ┌────────────────────────────────────────────────────┐
   │        IDENTITY & MESSAGING SERVICE (SHARED)       │
   └────────────────────────────────────────────────────┘
```

---

## 4. LEARNING DOMAIN

### Overview
Manages learning paths, courses, lessons, and progress tracking. Core pathway from beginner to advanced orchestration concepts.

### 4.1 Feature: Learning Path Curriculum

#### Feature Story

**Feature**: Structured Learning Path with Prerequisites

**As a** Backend Engineer  
**I want** to follow a guided curriculum that progresses from basics to advanced agent orchestration  
**So that** I can systematically build knowledge and skills without feeling overwhelmed

#### Acceptance Criteria

```gherkin
Feature: Learning Path Progression

  Scenario: View available learning paths
    Given I am a new learner
    And I have not started any paths
    When I navigate to "Learning Paths"
    Then I should see:
      - Beginner Path (0% complete, 40 hours estimated)
      - Intermediate Path (locked until Beginner 100%)
      - Advanced Path (locked until Intermediate 100%)
    And I should see each path's prerequisites
    And I should see learners on each path

  Scenario: Start a learning path
    Given I am on the Beginner Learning Path page
    And I have read the description
    When I click "Start Path"
    Then my progress should be set to 0%
    And I should be enrolled in the path
    And I should see the first lesson
    And an event "learner.path_started" should be published

  Scenario: Progress through lessons
    Given I am enrolled in Beginner Path
    And I have completed 3 of 12 lessons (25%)
    When I complete the 4th lesson
    Then my path progress should update to 33%
    And the next lesson should be unlocked
    And I should see progress summary in dashboard

  Scenario: Unlock next path on completion
    Given I am 100% through Beginner Path
    And Intermediate Path is currently locked
    When the system detects path completion
    Then Intermediate Path should unlock automatically
    And I should receive notification "You're ready for the next level"
```

#### TDD Tests (London School - Mocks First)

```typescript
// Mock external dependencies first
describe('LearningPath', () => {
  let learningRepo: MockLearningRepository;
  let metricsService: MockMetricsService;
  let messagingService: MockMessagingService;
  let certificationDomain: MockCertificationDomain;

  beforeEach(() => {
    learningRepo = mock(LearningRepository);
    metricsService = mock(MetricsService);
    messagingService = mock(MessagingService);
    certificationDomain = mock(CertificationDomain);
  });

  describe('startPath', () => {
    it('should enroll learner and publish event', async () => {
      // Arrange
      const path = new LearningPath(
        learningRepo,
        metricsService,
        messagingService
      );
      const learnerId = 'learner-123';

      // Act
      path.startPath(learnerId, 'beginner-path-1');

      // Assert
      expect(learningRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId,
          pathId: 'beginner-path-1',
          progress: 0,
          status: 'active'
        })
      );
      expect(messagingService.publish).toHaveBeenCalledWith(
        'learner.path_started',
        expect.any(Object)
      );
    });

    it('should not enroll if prerequisites not met', async () => {
      // Arrange
      const path = new LearningPath(learningRepo, metricsService, messagingService);
      learningRepo.findPathById.returns({
        prerequisites: ['beginner-path-1'],
        id: 'intermediate-path-1'
      });
      learningRepo.getCompletionStatus.returns({ completed: false });

      // Act & Assert
      expect(() => path.startPath('learner-123', 'intermediate-path-1'))
        .toThrow('Prerequisites not met');
    });
  });

  describe('completeLesson', () => {
    it('should update progress and unlock next', async () => {
      // Arrange
      const path = new LearningPath(learningRepo, metricsService, messagingService);
      learningRepo.getPathProgress.returns({
        completedLessons: 3,
        totalLessons: 12,
        pathId: 'beginner-path-1'
      });

      // Act
      path.completeLesson('learner-123', 'lesson-4');

      // Assert
      expect(metricsService.recordProgress).toHaveBeenCalledWith({
        learnerId: 'learner-123',
        pathId: 'beginner-path-1',
        progress: expect.closeTo(0.33, 0.01) // 4/12
      });
      expect(learningRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ lessonCompleted: 'lesson-4' })
      );
    });

    it('should unlock next path when path 100% complete', async () => {
      // Arrange
      const path = new LearningPath(learningRepo, metricsService, messagingService);
      learningRepo.getPathProgress.returns({
        completedLessons: 11,
        totalLessons: 12,
        pathId: 'beginner-path-1'
      });
      learningRepo.getNextPath.returns('intermediate-path-1');

      // Act
      path.completeLesson('learner-123', 'lesson-12');

      // Assert
      expect(messagingService.publish).toHaveBeenCalledWith(
        'learner.path_completed',
        expect.any(Object)
      );
      // Next domain should react to this event
    });
  });
});
```

---

### 4.2 Feature: Interactive Lessons with Code Examples

#### Feature Story

**Feature**: Embedded Code Lessons with Runnable Examples

**As a** Backend Engineer  
**I want** to see Ruflo code examples and run them in a safe environment  
**So that** I can learn by doing and understand orchestration patterns

#### Acceptance Criteria

```gherkin
Feature: Interactive Code Lessons

  Scenario: View lesson with code example
    Given I am on lesson "Hello World Swarm"
    And the lesson contains a code snippet
    When the page loads
    Then I should see:
      - Lesson explanation text
      - Code editor with pre-filled Ruflo code
      - "Run Example" button
      - Expected output

  Scenario: Run example code
    Given I am viewing the code editor for lesson "Hello World Swarm"
    When I click "Run Example"
    Then the code should execute in a sandboxed agent simulator
    And I should see output showing:
      - Agent boot sequence
      - Message passing between agents
      - Final orchestration result
    And execution should complete within 5 seconds

  Scenario: Modify and test code
    Given the example is running successfully
    When I modify the agent count from 3 to 5
    And I click "Run Example"
    Then the simulation should show 5 agents
    And the orchestration pattern should adapt correctly

  Scenario: View lesson completion requirement
    Given I am on the code lesson
    And the lesson has a completion requirement
    When I view the lesson details
    Then I should see text: "To complete: Deploy swarm and collect performance metrics"
    And I should see a "Submit Solution" button
```

#### TDD Tests (London School)

```typescript
describe('InteractiveLesson', () => {
  let lessonRepo: MockLessonRepository;
  let skillLabService: MockSkillLabService;
  let progressService: MockProgressService;

  beforeEach(() => {
    lessonRepo = mock(LessonRepository);
    skillLabService = mock(SkillLabService);
    progressService = mock(ProgressService);
  });

  describe('runExample', () => {
    it('should execute code and return output', async () => {
      // Arrange
      const lesson = new InteractiveLesson(
        lessonRepo,
        skillLabService,
        progressService
      );
      skillLabService.executeAgentCode.returns({
        status: 'success',
        output: { agents: 3, messages: 15 },
        executionTime: 2100 // ms
      });

      // Act
      const result = lesson.runExample('lesson-123', 'learner-456');

      // Assert
      expect(skillLabService.executeAgentCode).toHaveBeenCalled();
      expect(result.status).toBe('success');
      expect(result.executionTime).toBeLessThan(5000);
    });

    it('should timeout after 5 seconds', async () => {
      // Arrange
      skillLabService.executeAgentCode.returns(
        new Promise(resolve => setTimeout(() => resolve({}), 6000))
      );

      // Act & Assert
      expect(lesson.runExample('lesson-123', 'learner-456'))
        .rejects.toThrow('Execution timeout');
    });
  });

  describe('submitSolution', () => {
    it('should validate submission and mark complete', async () => {
      // Arrange
      const lesson = new InteractiveLesson(
        lessonRepo,
        skillLabService,
        progressService
      );
      const submission = {
        learnerId: 'learner-456',
        lessonId: 'lesson-123',
        code: 'const swarm = new Ruflo.Swarm(...)'
      };

      // Act
      lesson.submitSolution(submission);

      // Assert
      expect(progressService.markLessonComplete).toHaveBeenCalledWith({
        learnerId: 'learner-456',
        lessonId: 'lesson-123'
      });
      expect(skillLabService.runTests).toHaveBeenCalledWith(submission.code);
    });
  });
});
```

---

### 4.3 Feature: Progress Dashboard

#### Feature Story

**Feature**: Learner Progress Visualization

**As a** Backend Engineer  
**I want** to see my learning progress at a glance  
**So that** I can track momentum and stay motivated

#### Acceptance Criteria

```gherkin
Feature: Progress Dashboard

  Scenario: View dashboard overview
    Given I am logged in as a learner
    When I navigate to "My Dashboard"
    Then I should see:
      - Active path name and completion %
      - Next lesson to start
      - Total lessons completed (X/Y)
      - Estimated hours until certification
      - Skill labs completed this week
      - Current streak (consecutive days active)

  Scenario: View path progress chart
    Given I am on my dashboard
    When I view the path progress section
    Then I should see a visual progress bar showing:
      - Completed lessons in green
      - Current lesson highlighted
      - Future lessons in gray
      - Percentage complete in text

  Scenario: View weekly activity
    Given I am on my dashboard
    And I have been active for 5 days this week
    When I view the "Week" tab
    Then I should see:
      - Activity for each day (Sun-Sat)
      - Green dot for days with activity
      - Gray dot for inactive days
      - Total hours this week

  Scenario: Set weekly goal
    Given I am on my dashboard
    And I haven't set a weekly goal yet
    When I click "Set Goal"
    And I enter "10 hours this week"
    Then my goal should be saved
    And I should see daily breakdown toward goal
    And I should get reminders if I fall behind
```

#### TDD Tests

```typescript
describe('ProgressDashboard', () => {
  let learningDomain: MockLearningDomain;
  let skillLabDomain: MockSkillLabDomain;
  let metricsService: MockMetricsService;

  describe('getDashboardData', () => {
    it('should aggregate learner metrics', async () => {
      // Arrange
      const dashboard = new ProgressDashboard(
        learningDomain,
        skillLabDomain,
        metricsService
      );
      learningDomain.getPathProgress.returns({
        pathId: 'beginner-path-1',
        progress: 0.42,
        completedLessons: 5,
        totalLessons: 12
      });
      skillLabDomain.getWeeklyLabs.returns({
        completed: 3,
        total: 5
      });
      metricsService.getActivityStreak.returns(7); // days

      // Act
      const data = dashboard.getDashboardData('learner-123');

      // Assert
      expect(data).toEqual(
        expect.objectContaining({
          currentPath: expect.objectContaining({ progress: 0.42 }),
          weeklyLabs: { completed: 3, total: 5 },
          streak: 7
        })
      );
    });

    it('should calculate hours until certification', async () => {
      // Arrange
      learningDomain.getPathProgress.returns({
        progress: 0.5,
        remainingLessons: 6
      });
      learningDomain.getAverageHoursPerLesson.returns(3);

      // Act
      const data = dashboard.getDashboardData('learner-123');

      // Assert
      expect(data.estimatedHoursToCertification).toBe(18); // 6 * 3
    });
  });
});
```

---

### 4.4 Curriculum Definition

#### Beginner Path (40 hours, 12 lessons)
Target: Backend engineers new to agent systems

| Lesson # | Title | Topics | Hours | Prerequisites | Capstone |
|----------|-------|--------|-------|---|----------|
| 1 | Introduction to Agent Orchestration | Agents, messages, topologies | 2 | None | Quiz |
| 2 | Hello World with Ruflo | Basic swarm setup, agent lifecycle | 3 | Lesson 1 | Run example |
| 3 | Message Passing Patterns | Direct, pub/sub, broadcast | 3 | Lesson 2 | Design pattern |
| 4 | Agent State Management | State machines, persistence | 3 | Lesson 3 | Code exercise |
| 5 | Error Handling & Resilience | Retries, circuit breakers, fallbacks | 3 | Lesson 4 | Code exercise |
| 6 | Monitoring & Observability | Metrics, logging, tracing | 3 | Lesson 5 | Code exercise |
| 7 | Scaling Strategies | Horizontal/vertical, load balancing | 3 | Lesson 6 | Design document |
| 8 | Testing Orchestrations | Unit, integration, e2e tests | 3 | Lesson 7 | Test suite |
| 9 | Deploying to Staging | Container setup, orchestration | 3 | Lesson 8 | Deployment |
| 10 | Production Considerations | Security, compliance, SLAs | 2 | Lesson 9 | Review checklist |
| 11 | Capstone Project Part 1 | Design multi-agent system | 3 | Lessons 1-10 | Architecture doc |
| 12 | Capstone Project Part 2 | Implement & deploy capstone | 4 | Capstone P1 | Running system |

**Capstone Project**: "Deploy a Customer Service Swarm"  
Build a 3-agent customer service system: Router (assigns tickets) → Classifier (determines category) → Handler (resolves). Deploy to staging, collect metrics.

---

#### Intermediate Path (50 hours, 14 lessons)
Target: Practitioners ready for advanced patterns

| Lesson # | Title | Topics | Hours | Prerequisites |
|----------|-------|--------|-------|---|
| 1 | Byzantine Consensus | Multi-agent agreement, quorum | 3 | Beginner Path |
| 2 | Leader Election Algorithms | Bully, ring, raft algorithms | 3 | Lesson 1 |
| 3 | Distributed State | Event sourcing, CQRS patterns | 3 | Lesson 2 |
| 4 | Topology Evolution | Dynamic agent networks, joining/leaving | 3 | Lesson 3 |
| 5 | Custom Skills Development | Building Ruflo skill extensions | 4 | Intermediate 1-4 |
| 6 | Performance Optimization | Profiling, bottleneck detection | 3 | Lesson 5 |
| 7 | Security Hardening | Agent authentication, authorization | 3 | Lesson 6 |
| 8 | Multi-Domain Orchestration | Cross-domain agents, federation | 4 | Lesson 7 |
| 9 | Real-Time Coordination | Low-latency patterns, ordering | 3 | Lesson 8 |
| 10 | Capstone Part 1: Design | Design federated trading swarm | 4 | Lessons 1-9 |
| 11 | Capstone Part 2: Implement | Build trading system with persistence | 5 | Capstone P1 |
| 12 | Capstone Part 3: Test | Comprehensive test coverage | 4 | Capstone P2 |
| 13 | Capstone Part 4: Deploy | Production deployment & monitoring | 3 | Capstone P3 |
| 14 | Reflection & Review | Community presentation | 2 | Capstone P4 |

---

#### Advanced Path (60 hours, 12 lessons)
Target: Architects designing large-scale systems

| Lesson # | Title | Topics | Hours |
|----------|-------|--------|-------|
| 1 | Game Theory in Orchestration | Equilibrium, incentives, coalition | 4 |
| 2 | Fault Tolerance Architectures | Byzantine fault tolerance, quorum | 4 |
| 3 | Adaptive Topologies | ML-driven topology optimization | 4 |
| 4 | Building Custom Skill Frameworks | Advanced Ruflo extensions | 5 |
| 5 | Multi-Cloud Orchestration | Cloud-agnostic agent deployment | 4 |
| 6 | Advanced Security Models | Zero-trust agents, threat models | 4 |
| 7 | Capstone Design Phase | Design production system | 6 |
| 8 | Capstone Build Phase | Full implementation | 8 |
| 9 | Capstone Hardening Phase | Security & performance audits | 6 |
| 10 | Capstone Deployment Phase | Production launch & SRE handoff | 5 |
| 11 | Capstone Defense | Technical presentation to board | 2 |
| 12 | Expert Mentorship Setup | Begin mentoring junior architects | 2 |

---

## 5. SKILL LAB DOMAIN

### Overview
Provides hands-on sandbox environments where learners practice agent orchestration without impacting production systems.

### 5.1 Feature: Interactive Agent Simulator

#### Feature Story

**Feature**: Agent Simulator with Real-Time Visualization

**As a** Backend Engineer  
**I want** to write orchestration code and see agents interact in real-time  
**So that** I can learn how patterns affect agent behavior

#### Acceptance Criteria

```gherkin
Feature: Agent Simulator

  Scenario: Launch simulator environment
    Given I am in the Skill Lab
    And I have selected exercise "Message Passing"
    When I click "Launch Simulator"
    Then I should see:
      - Code editor with starter code
      - Visualization canvas on right
      - Console output below
      - Play/Pause/Reset controls
      - Execution speed slider

  Scenario: Deploy agents in simulator
    Given I have written orchestration code
    When I click "Deploy" or press Ctrl+Shift+D
    Then the simulator should:
      - Parse my code for syntax errors
      - Instantiate agents as defined
      - Show agents as nodes on canvas
      - Start message exchange
      - Run for 30 seconds max

  Scenario: Visualize agent communication
    Given agents are deployed and running
    When agents send messages
    Then I should see:
      - Arrows between agents showing message direction
      - Message type label on arrow
      - Color coding (success=green, error=red, timeout=orange)
      - Message count per connection

  Scenario: Inspect agent state
    Given agents are running
    When I click on an agent node
    Then I should see:
      - Agent ID and type
      - Current state (JSON)
      - Message queue size
      - Error count
      - Uptime

  Scenario: Adjust execution speed
    Given simulator is running
    When I move the speed slider to 2x
    Then all agent timings should fast-forward proportionally
    And messages should process faster but remain correct

  Scenario: Stop and inspect
    Given simulator is running
    When I click "Pause"
    Then all agent activity should freeze
    And I should see current state snapshot
    And I should be able to inspect any agent state
    And I should see message queue contents
```

#### TDD Tests

```typescript
describe('AgentSimulator', () => {
  let simulator: AgentSimulator;
  let skillLabRepo: MockSkillLabRepository;
  let runtimeService: MockRuntimeService;
  let visualizationService: MockVisualizationService;

  beforeEach(() => {
    skillLabRepo = mock(SkillLabRepository);
    runtimeService = mock(RuntimeService);
    visualizationService = mock(VisualizationService);
    simulator = new AgentSimulator(skillLabRepo, runtimeService, visualizationService);
  });

  describe('deployCode', () => {
    it('should parse and instantiate agents', async () => {
      // Arrange
      const code = `
        const swarm = new Ruflo.Swarm();
        swarm.agent('router', Router);
        swarm.agent('handler-1', Handler);
        swarm.agent('handler-2', Handler);
      `;

      // Act
      simulator.deployCode(code);

      // Assert
      expect(runtimeService.instantiateAgent).toHaveBeenCalledTimes(3);
      expect(runtimeService.instantiateAgent).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'router' })
      );
    });

    it('should throw on syntax errors', () => {
      // Arrange
      const invalidCode = `const swarm = new Ruflo.Swarm(;`; // missing )

      // Act & Assert
      expect(() => simulator.deployCode(invalidCode))
        .toThrow(/Syntax error/);
    });

    it('should set execution timeout to 30 seconds', async () => {
      // Arrange
      const code = `const swarm = new Ruflo.Swarm();`;

      // Act
      simulator.deployCode(code);

      // Assert
      expect(runtimeService.setExecutionTimeout).toHaveBeenCalledWith(30000);
    });
  });

  describe('onMessageSent', () => {
    it('should visualize message on canvas', () => {
      // Arrange
      simulator.deployCode(testCode);
      const message = {
        from: 'agent-1',
        to: 'agent-2',
        type: 'REQUEST',
        status: 'success'
      };

      // Act
      simulator.onMessageSent(message);

      // Assert
      expect(visualizationService.drawMessage).toHaveBeenCalledWith({
        from: 'agent-1',
        to: 'agent-2',
        color: 'green', // success
        label: 'REQUEST'
      });
    });
  });

  describe('pause', () => {
    it('should freeze agent activity', async () => {
      // Arrange
      simulator.deployCode(testCode);
      simulator.play();

      // Act
      simulator.pause();

      // Assert
      expect(runtimeService.pause).toHaveBeenCalled();
      expect(visualizationService.renderSnapshot).toHaveBeenCalled();
    });
  });
});
```

---

### 5.2 Feature: Guided Exercises with Feedback

#### Feature Story

**Feature**: Structured Exercises with Automated Feedback

**As a** Backend Engineer  
**I want** to complete guided exercises that check my work and provide hints  
**So that** I can practice without waiting for instructor feedback

#### Acceptance Criteria

```gherkin
Feature: Skill Lab Exercises

  Scenario: Start an exercise
    Given I am in Skill Lab and viewing exercise "Leader Election"
    When I click "Start Exercise"
    Then I should see:
      - Exercise description and learning objectives
      - Starter code with TODOs
      - Test suite (hidden, but runs on submit)
      - Instructions panel on right
      - "Get Hint" button

  Scenario: Submit partial solution
    Given I have written some code for the exercise
    And I haven't completed all requirements
    When I click "Submit & Check"
    Then I should see:
      - ✓ Tests passed: 2/5
      - ✗ Test failed: "Leader must broadcast election message"
      - Error details and stack trace
      - Line numbers of failures

  Scenario: Request hint
    Given I am stuck on an exercise
    When I click "Get Hint" (can use 1x per exercise)
    Then I should see:
      - Progressive hint (not full solution)
      - Example: "Consider using Map to track vote counts"
      - Hint count remaining (1 used)
      - "Get Another Hint" disabled after 1st use

  Scenario: Complete exercise
    Given I have fixed all test failures
    When I click "Submit & Check"
    Then I should see:
      - ✓ All 5 tests passed!
      - Button changes to "Mark as Complete"
      - Optional: Bonus challenges shown
      - Completion recorded in progress

  Scenario: Review completed exercise
    Given I completed an exercise previously
    When I return to it
    Then I should see:
      - ✓ Completed badge
      - My submitted code (read-only)
      - Option to "Redo for Practice"
```

#### TDD Tests

```typescript
describe('SkillLabExercise', () => {
  let exercise: SkillLabExercise;
  let testRunner: MockTestRunner;
  let feedbackService: MockFeedbackService;
  let progressService: MockProgressService;

  beforeEach(() => {
    testRunner = mock(TestRunner);
    feedbackService = mock(FeedbackService);
    progressService = mock(ProgressService);
    exercise = new SkillLabExercise(testRunner, feedbackService, progressService);
  });

  describe('submitSolution', () => {
    it('should run tests and return results', async () => {
      // Arrange
      const code = `
        class LeaderElection {
          constructor(agents) { this.agents = agents; }
          startElection() { /* implementation */ }
        }
      `;
      testRunner.runTests.returns({
        passed: 3,
        failed: 2,
        tests: [
          { name: 'broadcasts election', passed: true },
          { name: 'counts votes', passed: false, error: 'Expected votes > 0' }
        ]
      });

      // Act
      const result = exercise.submitSolution('exercise-1', code);

      // Assert
      expect(result.passCount).toBe(3);
      expect(result.failCount).toBe(2);
      expect(testRunner.runTests).toHaveBeenCalledWith(code, 'exercise-1');
    });

    it('should provide feedback on failure', async () => {
      // Arrange
      testRunner.runTests.returns({
        passed: 2,
        failed: 3,
        tests: [{
          name: 'counts votes',
          passed: false,
          error: 'Expected votes.length > 0'
        }]
      });

      // Act
      exercise.submitSolution('exercise-1', code);

      // Assert
      expect(feedbackService.generateFeedback).toHaveBeenCalledWith({
        exerciseId: 'exercise-1',
        testResults: expect.any(Object)
      });
    });

    it('should mark complete when all tests pass', async () => {
      // Arrange
      testRunner.runTests.returns({
        passed: 5,
        failed: 0,
        tests: [{ name: 'all pass', passed: true }]
      });

      // Act
      exercise.submitSolution('exercise-1', code);

      // Assert
      expect(progressService.markExerciseComplete).toHaveBeenCalledWith({
        learnerId: 'learner-123',
        exerciseId: 'exercise-1'
      });
    });
  });

  describe('getHint', () => {
    it('should return progressive hint', async () => {
      // Arrange
      feedbackService.getHint.returns(
        'Tip: Use a Map to count votes from each agent'
      );

      // Act
      const hint = exercise.getHint('exercise-1', 'learner-123');

      // Assert
      expect(hint).toBe('Tip: Use a Map to count votes from each agent');
    });

    it('should allow only 1 hint per exercise', async () => {
      // Arrange
      exercise.getHint('exercise-1', 'learner-123'); // 1st call

      // Act & Assert
      expect(() => exercise.getHint('exercise-1', 'learner-123'))
        .toThrow('Hint limit reached for this exercise');
    });
  });
});
```

---

## 6. CERTIFICATION DOMAIN

### Overview
Manages certification levels, requirements, exams, and credential issuance.

### 6.1 Feature: Certification Levels & Pathways

#### Feature Story

**Feature**: Multi-Level Certification with Clear Requirements

**As a** Certification Board Member  
**I want** to define certification levels with measurable requirements  
**So that** we can issue credentials that prove competency

#### Acceptance Criteria

```gherkin
Feature: Certification Levels

  Scenario: View certification requirements
    Given I am logged in as a learner
    When I navigate to "Certifications"
    Then I should see three levels:
      - Practitioner (foundational)
      - Architect (advanced)
      - Master (expert)

  Scenario: Check Practitioner requirements
    Given I am viewing Practitioner certification
    Then I should see:
      ✓ Complete Beginner Learning Path (100%)
      ✓ Score 80%+ on Practitioner Exam
      ✓ Complete Beginner Capstone Project
      ✓ Agree to Code of Conduct
      Estimated time: 12 weeks

  Scenario: Check Architect requirements
    Given I am viewing Architect certification
    Then I should see:
      ✓ Have Practitioner credential
      ✓ Complete Intermediate Learning Path (100%)
      ✓ Score 85%+ on Architect Exam
      ✓ Complete Intermediate Capstone Project
      ✓ Deploy production swarm (evidence: GitHub link)
      ✓ Peer code review (by 2 Architects minimum)
      Estimated time: 18 weeks (from Practitioner)

  Scenario: Check Master requirements
    Given I am viewing Master certification
    Then I should see:
      ✓ Have Architect credential (min 6 months)
      ✓ Complete Advanced Learning Path (100%)
      ✓ Pass Master Project Review (community vote: 70% approval)
      ✓ Score 90%+ on Master Exam
      ✓ Mentor minimum 3 junior practitioners
      ✓ Contribute 5+ production patterns to community
      Estimated time: Open-ended (12+ months from Architect)

  Scenario: Track certification progress
    Given I am pursuing Practitioner certification
    When I navigate to my certification dashboard
    Then I should see:
      - Learning Path progress bar (60%)
      - Exam status: "Not started"
      - Capstone status: "In progress"
      - Overall completion: 40%
      - "Schedule Exam" button
```

#### TDD Tests

```typescript
describe('CertificationLevel', () => {
  let certRepo: MockCertificationRepository;
  let learningDomain: MockLearningDomain;
  let examService: MockExamService;

  beforeEach(() => {
    certRepo = mock(CertificationRepository);
    learningDomain = mock(LearningDomain);
    examService = mock(ExamService);
  });

  describe('getPractitionerRequirements', () => {
    it('should return requirement checklist', () => {
      // Arrange
      certRepo.getRequirements.returns({
        level: 'Practitioner',
        requirements: [
          { id: 'path-complete', description: 'Complete Beginner Path' },
          { id: 'exam-pass', description: 'Score 80%+ on exam' },
          { id: 'capstone', description: 'Complete capstone' },
          { id: 'code-of-conduct', description: 'Agree to Code of Conduct' }
        ]
      });

      // Act
      const requirements = certRepo.getRequirements('Practitioner');

      // Assert
      expect(requirements).toHaveLength(4);
      expect(requirements.map(r => r.id)).toContain('path-complete');
    });
  });

  describe('checkEligibility', () => {
    it('should verify Practitioner prerequisites', async () => {
      // Arrange
      learningDomain.isPathComplete.returns(true);
      examService.getExamScore.returns(82);

      // Act
      const eligible = certRepo.checkEligibility('learner-123', 'Practitioner');

      // Assert
      expect(learningDomain.isPathComplete).toHaveBeenCalledWith(
        'learner-123',
        'beginner-path'
      );
      expect(examService.getExamScore).toHaveBeenCalledWith(
        'learner-123',
        'practitioner-exam'
      );
      expect(eligible).toBe(true);
    });

    it('should require Architect prereq for Master', async () => {
      // Arrange
      certRepo.hasCredential.returns(false); // No Architect cert

      // Act & Assert
      expect(() => certRepo.checkEligibility('learner-123', 'Master'))
        .toThrow('Must have Architect credential');
    });
  });

  describe('issueCertificate', () => {
    it('should create signed credential', async () => {
      // Arrange
      const credential = {
        learnerId: 'learner-123',
        level: 'Practitioner',
        issuedAt: new Date(),
        validUntil: new Date(Date.now() + 3 * 365 * 24 * 60 * 60 * 1000) // 3 years
      };

      // Act
      certRepo.issueCertificate(credential);

      // Assert
      expect(certRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'Practitioner',
          signature: expect.any(String) // Cryptographic signature
        })
      );
    });
  });
});
```

---

### 6.2 Feature: Exam Management

#### Feature Story

**Feature**: Proctored Exams with Auto-Grading

**As a** Learner  
**I want** to schedule and take certification exams with immediate feedback  
**So that** I can progress toward certification

#### Acceptance Criteria

```gherkin
Feature: Exam System

  Scenario: Schedule exam
    Given I meet all prerequisites for Practitioner
    When I click "Schedule Exam"
    Then I should see:
      - Available exam dates in next 30 days
      - Time slots (2-hour blocks)
      - Location: "Online proctored"
      - Cost: "$0" (included in learning platform)
    And I should be able to select date/time
    And I should see confirmation with exam ID

  Scenario: Take exam
    Given it is my scheduled exam time
    When I click "Start Exam"
    Then I should see:
      - Instructions and honor code
      - 120-minute timer (locked, cannot pause)
      - 50 multiple choice questions
      - Progress indicator (Q15 of 50)
      - Next/Previous buttons
      - "Submit Exam" button (active only when all answered)

  Scenario: Answer questions
    Given I am on question 10
    When I select an answer
    Then the answer should be saved immediately
    And I should be able to navigate to any previous question
    And changing answer should update saved state

  Scenario: Time expires
    Given I am on question 40 of 50
    And timer shows 0:00
    When time expires
    Then exam should auto-submit
    And I should see "Time expired - exam submitted with current answers"
    And I should be redirected to results page

  Scenario: View exam results
    Given I submitted my exam
    When I navigate to exam results
    Then I should see:
      - Final score: 82/100 (82%)
      - Pass/Fail status: "PASS"
      - Breakdown by topic:
        * Orchestration patterns: 90%
        * Debugging: 75%
        * Security: 85%
      - Questions missed (review available in 24 hours)
      - Certificate issued or next steps if failed
```

#### TDD Tests

```typescript
describe('ExamProctor', () => {
  let examService: MockExamService;
  let gradingService: MockGradingService;
  let certificationDomain: MockCertificationDomain;

  describe('startExam', () => {
    it('should initialize exam session', async () => {
      // Arrange
      examService.createSession.returns({
        sessionId: 'exam-session-123',
        duration: 120,
        questionCount: 50
      });

      // Act
      const session = examService.startExam('learner-123', 'practitioner-exam');

      // Assert
      expect(session.sessionId).toBeDefined();
      expect(examService.startTimer).toHaveBeenCalledWith(session.sessionId, 120 * 60);
    });
  });

  describe('submitAnswer', () => {
    it('should save answer and confirm receipt', async () => {
      // Arrange
      const answer = {
        questionId: 'q-10',
        selectedOption: 'B',
        timestamp: new Date()
      };

      // Act
      examService.submitAnswer('session-123', answer);

      // Assert
      expect(examService.saveAnswer).toHaveBeenCalledWith(
        'session-123',
        expect.objectContaining({ selectedOption: 'B' })
      );
    });
  });

  describe('submitExam', () => {
    it('should grade exam and return results', async () => {
      // Arrange
      const answers = [
        { questionId: 'q-1', selectedOption: 'A' },
        { questionId: 'q-2', selectedOption: 'C' }
      ];
      gradingService.grade.returns({
        score: 82,
        passed: true,
        breakdown: {
          patterns: 0.90,
          debugging: 0.75
        }
      });

      // Act
      const results = examService.submitExam('session-123', answers);

      // Assert
      expect(results.score).toBe(82);
      expect(results.passed).toBe(true);
      expect(gradingService.grade).toHaveBeenCalled();
    });

    it('should issue certificate if passed', async () => {
      // Arrange
      gradingService.grade.returns({ score: 85, passed: true });

      // Act
      examService.submitExam('session-123', answers);

      // Assert
      expect(certificationDomain.issueCertificate).toHaveBeenCalledWith({
        learnerId: 'learner-123',
        level: 'Practitioner'
      });
    });

    it('should auto-submit on timer expiry', async () => {
      // Arrange
      examService.onTimerExpired = jasmine.createSpy('onTimerExpired');

      // Act
      examService.expireExam('session-123');

      // Assert
      expect(examService.submitExam).toHaveBeenCalledWith('session-123', {
        autoSubmitted: true
      });
    });
  });
});
```

---

### 6.3 Feature: Capstone Project Review

#### Feature Story

**Feature**: Capstone Submission & Expert Review

**As a** Learner  
**I want** to submit capstone projects for expert review  
**So that** I can get feedback before certification vote

#### Acceptance Criteria

```gherkin
Feature: Capstone Review

  Scenario: Submit capstone project
    Given I completed Intermediate Path capstone
    And I have working code deployed
    When I navigate to "Submit Capstone"
    Then I should see form:
      - Project name (required)
      - GitHub repo link (required)
      - Deployed URL (required)
      - Architecture diagram (upload PDF)
      - Lessons learned (textarea, 500+ chars)
      - Peer review code (optional, from another learner)
    And I should see checklist:
      ✓ Passes all required tests
      ✓ Production deployment verified
      ✓ README present
      ✓ Code comments adequate

  Scenario: Submit capstone
    Given I filled all required fields
    And checklist items are passing
    When I click "Submit for Review"
    Then I should see:
      - Submission confirmation
      - "Status: Pending Review"
      - Estimated review time: "3-5 business days"
      - Reviewer assignment (2 assigned)

  Scenario: Receive feedback
    Given my capstone was submitted
    And 2 reviewers provided feedback
    When I navigate to "Capstone Review"
    Then I should see:
      - Reviewer #1 feedback (comments on code, architecture, deployment)
      - Reviewer #2 feedback
      - Overall recommendation: Pass/Revise/Reject
      - Specific areas for improvement
      - Next steps (if revisions needed)

  Scenario: Request revision
    Given reviewers requested minor revisions
    When I update code and resubmit
    Then the system should:
      - Flag as "Resubmitted"
      - Notify reviewers
      - Update timeline for re-review

  Scenario: Pass capstone
    Given both reviewers approved
    When I view capstone status
    Then I should see:
      - ✓ Capstone Approved
      - "Ready for certification vote"
      - Button to "Proceed to Exam" (if applicable)
```

#### TDD Tests

```typescript
describe('CapstoneReview', () => {
  let capstoneRepo: MockCapstoneRepository;
  let reviewService: MockReviewService;
  let notificationService: MockNotificationService;

  describe('submitCapstone', () => {
    it('should validate submission completeness', async () => {
      // Arrange
      const submission = {
        learnerId: 'learner-123',
        pathId: 'intermediate-path',
        githubUrl: 'https://github.com/user/project',
        deployedUrl: 'https://project.example.com'
      };

      // Act
      capstoneRepo.submit(submission);

      // Assert
      expect(capstoneRepo.save).toHaveBeenCalled();
      expect(reviewService.assignReviewers).toHaveBeenCalledWith({
        capstoneId: expect.any(String),
        count: 2 // Always 2 reviewers
      });
    });

    it('should reject incomplete submission', () => {
      // Arrange
      const incompleteSubmission = {
        learnerId: 'learner-123'
        // Missing required fields
      };

      // Act & Assert
      expect(() => capstoneRepo.submit(incompleteSubmission))
        .toThrow('Missing required fields: githubUrl, deployedUrl');
    });
  });

  describe('assignReviewers', () => {
    it('should select 2 certified reviewers', async () => {
      // Arrange
      reviewService.getCertifiedReviewers.returns([
        { id: 'reviewer-1', expertise: 'high' },
        { id: 'reviewer-2', expertise: 'medium' }
      ]);

      // Act
      const assigned = reviewService.assignReviewers('capstone-123');

      // Assert
      expect(assigned).toHaveLength(2);
      expect(notificationService.notify).toHaveBeenCalledTimes(2);
    });
  });

  describe('submitReview', () => {
    it('should save reviewer feedback', async () => {
      // Arrange
      const review = {
        capstoneId: 'capstone-123',
        reviewerId: 'reviewer-1',
        feedback: 'Great orchestration patterns',
        recommendation: 'PASS'
      };

      // Act
      reviewService.submitReview(review);

      // Assert
      expect(capstoneRepo.saveReview).toHaveBeenCalledWith(review);
    });

    it('should finalize when both reviews submitted', async () => {
      // Arrange
      capstoneRepo.getReviewCount.returns(2);

      // Act
      reviewService.submitReview({ capstoneId: 'capstone-123' });

      // Assert
      expect(capstoneRepo.finalizeReview).toHaveBeenCalled();
      expect(notificationService.notify).toHaveBeenCalledWith(
        'learner-123',
        'Your capstone review is complete'
      );
    });
  });
});
```

---

## 7. COMMUNITY DOMAIN

### Overview
Manages pattern sharing, peer reviews, mentor relationships, and community engagement.

### 7.1 Feature: Pattern Repository

#### Feature Story

**Feature**: Shareable Orchestration Patterns from Production

**As a** Community Mentor  
**I want** to document and share orchestration patterns from my production systems  
**So that** the community learns from real-world experience

#### Acceptance Criteria

```gherkin
Feature: Pattern Repository

  Scenario: View all patterns
    Given I am on the Community section
    When I click "Patterns"
    Then I should see:
      - List of 50+ patterns (paginated)
      - Pattern cards showing:
        * Title (e.g., "Leader Election with Quorum")
        * Author name (e.g., "Patricia O.")
        * Category (e.g., "Consensus")
        * Stars count
        * Preview (first 200 chars)
      - Filter by category, difficulty, rating
      - Search bar

  Scenario: Submit new pattern
    Given I am a Certified Architect
    When I click "Contribute Pattern"
    Then I should see form:
      - Pattern name (required)
      - Category dropdown
      - Difficulty (Beginner/Intermediate/Advanced)
      - Problem statement (textarea)
      - Solution description
      - Code example (GitHub gist or inline)
      - Production context ("Used in X at Y scale")
      - Performance notes
      - Known limitations
    And form should have "Preview" and "Submit" buttons

  Scenario: Review submission
    Given I submitted a pattern
    When pattern enters moderation
    Then system should:
      - Run plagiarism check against existing patterns
      - Assign 2 community reviewers
      - Notify me of review progress
      - Publish after approval (1-3 days)

  Scenario: View pattern details
    Given I clicked on a pattern
    When pattern page loads
    Then I should see:
      - Full problem statement
      - Solution with diagrams
      - Complete code example
      - Author info with bio link
      - "When to use" and "When NOT to use"
      - Performance metrics (latency, throughput)
      - Related patterns
      - Star/favorite button
      - Comment section (vetted community feedback)

  Scenario: Rate and review pattern
    Given I am viewing a pattern
    When I click the star icon
    Then I should see options:
      - 1-5 stars
      - Optional written review (100+ chars)
      - "Mark helpful" checkbox
    And my rating should aggregate with others
    And author should be notified

  Scenario: Flag pattern as problematic
    Given I found an issue with a pattern
    When I click "Report Issue"
    Then I should see options:
      - Outdated information
      - Security vulnerability
      - Performance problem
      - Misleading content
      - Other (with text)
    And report should go to moderation queue
```

#### TDD Tests

```typescript
describe('PatternRepository', () => {
  let patternRepo: MockPatternRepository;
  let moderationService: MockModerationService;
  let notificationService: MockNotificationService;

  describe('submitPattern', () => {
    it('should accept pattern from Certified Architect', async () => {
      // Arrange
      const pattern = {
        title: 'Leader Election with Quorum',
        category: 'Consensus',
        problem: 'Need to elect leader among agents',
        solution: 'Implement quorum-based voting',
        code: 'const election = new LeaderElection(...)',
        authorId: 'architect-1'
      };
      patternRepo.getAuthorCertification.returns({ level: 'Architect' });

      // Act
      patternRepo.submitPattern(pattern);

      // Assert
      expect(moderationService.assignReviewers).toHaveBeenCalled();
      expect(notificationService.notify).toHaveBeenCalledWith(
        'architect-1',
        'Your pattern submitted for review'
      );
    });

    it('should reject from non-Architect', () => {
      // Arrange
      const pattern = { title: 'Test', category: 'Consensus' };
      patternRepo.getAuthorCertification.returns({ level: 'Practitioner' });

      // Act & Assert
      expect(() => patternRepo.submitPattern(pattern))
        .toThrow('Only Architects can contribute patterns');
    });
  });

  describe('ratePattern', () => {
    it('should save rating and aggregate score', async () => {
      // Arrange
      const rating = {
        patternId: 'pattern-123',
        learnerId: 'learner-456',
        stars: 5
      };

      // Act
      patternRepo.ratePattern(rating);

      // Assert
      expect(patternRepo.saveRating).toHaveBeenCalledWith(rating);
      expect(patternRepo.updateAverageScore).toHaveBeenCalled();
    });
  });

  describe('flagPattern', () => {
    it('should queue for moderation on security flag', async () => {
      // Arrange
      const flag = {
        patternId: 'pattern-123',
        reason: 'Security vulnerability',
        details: 'Code does not validate agent identity'
      };

      // Act
      patternRepo.flagPattern(flag);

      // Assert
      expect(moderationService.queue).toHaveBeenCalledWith({
        type: 'FLAG',
        pattern: 'pattern-123',
        reason: 'security',
        priority: 'high'
      });
    });
  });
});
```

---

### 7.2 Feature: Peer Code Review Workflow

#### Feature Story

**Feature**: Structured Peer Code Review

**As a** Community Mentor  
**I want** to review peer solutions and get detailed feedback  
**So that** I can learn from different approaches

#### Acceptance Criteria

```gherkin
Feature: Peer Code Review

  Scenario: Request peer review
    Given I completed a capstone project
    When I click "Request Peer Review"
    Then I should see:
      - GitHub repo link (auto-filled if available)
      - Description of what I'd like reviewed
      - Areas of interest (orchestration, performance, security)
      - Proposed reviewer names (optional)
      - "Submit Request" button

  Scenario: Accept review request
    Given I am a Certified Architect
    And someone requested peer review
    When I navigate to "Pending Reviews"
    Then I should see:
      - List of 3-5 pending review requests
      - Requestor profile
      - Project description
      - Time commitment estimate (2-4 hours)
      - "Accept" or "Decline" button

  Scenario: Conduct peer review
    Given I accepted a peer review
    When I open the GitHub repo
    Then I should see (in-app viewer):
      - Code with line numbers
      - "Comment" button on each line
      - Difficulty toggle (focus on key issues or be thorough)
      - Overall assessment form
      - Time tracker (for our data)

  Scenario: Leave detailed feedback
    Given I am reviewing code
    When I click "Comment" on line 42
    Then I should see:
      - Text editor for comment
      - Example patterns (dropdown suggestions)
      - "Comment" button to post
    And comment should be threaded
    And author can reply

  Scenario: Submit review summary
    Given I reviewed all code
    When I scroll to bottom
    Then I should see assessment form:
      - Overall quality (1-5 scale)
      - Orchestration patterns (feedback)
      - Performance (feedback)
      - Security (feedback)
      - Suggested improvements (optional)
      - "Submit Review" button
    And once submitted, requestor should be notified

  Scenario: Receive review feedback
    Given someone reviewed my code
    When I navigate to "Reviews"
    Then I should see:
      - Reviewer name and credential level
      - Overall quality score
      - Inline comments (clickable to code)
      - Assessment summary
      - "Mark Helpful" button
      - Follow-up discussion option
```

#### TDD Tests

```typescript
describe('PeerCodeReview', () => {
  let reviewService: MockReviewService;
  let notificationService: MockNotificationService;
  let communityRepo: MockCommunityRepository;

  describe('requestReview', () => {
    it('should create review request', async () => {
      // Arrange
      const request = {
        learnerId: 'learner-123',
        repoUrl: 'https://github.com/user/project',
        description: 'Please review my swarm design',
        focusAreas: ['orchestration', 'performance']
      };

      // Act
      reviewService.requestReview(request);

      // Assert
      expect(communityRepo.saveReviewRequest).toHaveBeenCalledWith(request);
      expect(reviewService.assignReviewers).toHaveBeenCalledWith({
        skillLevel: 'Architect',
        count: 1
      });
    });
  });

  describe('submitReview', () => {
    it('should save comments and assessment', async () => {
      // Arrange
      const review = {
        requestId: 'req-123',
        reviewerId: 'architect-1',
        comments: [
          { line: 42, text: 'Consider using Map for faster lookup' }
        ],
        assessment: {
          quality: 4,
          patterns: 'Good use of leader election pattern',
          performance: 'Throughput could be improved'
        }
      };

      // Act
      reviewService.submitReview(review);

      // Assert
      expect(communityRepo.saveReview).toHaveBeenCalledWith(review);
      expect(notificationService.notify).toHaveBeenCalledWith(
        'learner-123',
        'Your code review is complete'
      );
    });
  });

  describe('threadedComments', () => {
    it('should allow replies to comments', async () => {
      // Arrange
      const comment = {
        reviewId: 'review-123',
        line: 42,
        text: 'Consider using Map'
      };
      reviewService.saveComment(comment);

      // Act
      reviewService.replyToComment('comment-123', {
        text: 'Great idea! Will implement.'
      });

      // Assert
      expect(communityRepo.saveReply).toHaveBeenCalled();
      expect(notificationService.notify).toHaveBeenCalledWith(
        'architect-1',
        'New reply to your comment'
      );
    });
  });
});
```

---

## 8. METRICS DOMAIN

### Overview
Tracks and reports learner engagement, platform health, and certification outcomes.

### 8.1 Feature: Learner Analytics Dashboard

#### Feature Story

**Feature**: Comprehensive Analytics for Learners and Instructors

**As a** Instructor  
**I want** to see detailed learner progress and engagement metrics  
**So that** I can identify struggling learners and celebrate successes

#### Acceptance Criteria

```gherkin
Feature: Analytics Dashboard

  Scenario: View cohort overview
    Given I am an instructor with 25 learners
    When I navigate to "Analytics"
    Then I should see:
      - Cohort size: 25 learners
      - Active this week: 20 (80%)
      - Average path progress: 42%
      - Completion rate: 68%
      - Avg time per lesson: 2.5 hours
      - Churn risk: 3 learners (see list)

  Scenario: View individual learner metrics
    Given I clicked on a learner "Alex Chen"
    When learner detail page loads
    Then I should see:
      - Learning path progress: 60%
      - Skill lab exercises completed: 8/12
      - Code submission quality: High
      - Last activity: Today at 2:35 PM
      - Time investment: 24.5 hours total
      - Engagement trend: ↗ (increasing)
      - Estimated certification date: Jan 2025

  Scenario: Export cohort report
    Given I am viewing cohort analytics
    When I click "Export Report"
    Then I should see options:
      - Format: CSV, PDF
      - Date range: Last 30 days / Custom
      - Metrics: Check/uncheck which to include
      - "Download" button
    And report should include summary stats and per-learner data

  Scenario: View exam analytics
    Given I have administered 20 exams
    When I navigate to "Exam Analytics"
    Then I should see:
      - Average score: 76%
      - Pass rate: 85%
      - Question difficulty analysis
      - Most missed questions
      - Score distribution chart
      - Comparison to previous cohort
```

#### TDD Tests

```typescript
describe('AnalyticsDashboard', () => {
  let metricsRepo: MockMetricsRepository;
  let learningDomain: MockLearningDomain;
  let analyticsEngine: MockAnalyticsEngine;

  describe('getCohortMetrics', () => {
    it('should aggregate learner metrics', async () => {
      // Arrange
      metricsRepo.getLearnerCount.returns(25);
      metricsRepo.getActiveThisWeek.returns(20);
      learningDomain.getAveragePathProgress.returns(0.42);
      learningDomain.getCompletionRate.returns(0.68);

      // Act
      const metrics = analyticsEngine.getCohortMetrics('cohort-1');

      // Assert
      expect(metrics.activeThisWeek).toBe(20);
      expect(metrics.activePercentage).toBe(0.8);
      expect(metrics.avgPathProgress).toBe(0.42);
      expect(metricsRepo.getLearnerCount).toHaveBeenCalled();
    });

    it('should identify churn-risk learners', async () => {
      // Arrange
      metricsRepo.getInactiveForDays.returns([
        { learnerId: 'learner-1', daysInactive: 7 },
        { learnerId: 'learner-2', daysInactive: 5 }
      ]);

      // Act
      const churnRisk = analyticsEngine.getChurnRisk('cohort-1');

      // Assert
      expect(churnRisk).toHaveLength(2);
      expect(churnRisk[0].learnerId).toBe('learner-1');
    });
  });

  describe('getExamAnalytics', () => {
    it('should calculate exam statistics', async () => {
      // Arrange
      const exams = [
        { score: 85 }, { score: 92 }, { score: 78 },
        { score: 88 }, { score: 75 }
      ];
      metricsRepo.getExams.returns(exams);

      // Act
      const stats = analyticsEngine.getExamStats('practitioner-exam');

      // Assert
      expect(stats.averageScore).toBe(83.6);
      expect(stats.passRate).toBe(0.8); // 4/5 passed
    });
  });
});
```

---

## 9. INTEGRATION POINTS & DOMAIN EVENTS

### Domain Event Architecture

Domains communicate via **Domain Events**, enabling loose coupling and scalability:

```typescript
// Domain Event Types (Published & Subscribed)

// LEARNING DOMAIN
LearnerEnrolled(learnerId, pathId)
LessonCompleted(learnerId, lessonId, pathId)
PathCompleted(learnerId, pathId)
ExerciseSubmitted(learnerId, exerciseId, code)

// SKILL LAB DOMAIN
SimulationStarted(learnerId, simulationId)
AgentDeployed(learnerId, agentConfig)
TestsPassed(learnerId, exerciseId, testCount)

// CERTIFICATION DOMAIN
ExamScheduled(learnerId, examId, dateTime)
ExamSubmitted(learnerId, examId, score)
CertificateIssued(learnerId, level, issuedAt)
ExpertBadgeAwarded(learnerId)

// COMMUNITY DOMAIN
PatternContributed(architectId, patternId)
PeerReviewRequested(learnerId, capstoneId)
ReviewSubmitted(reviewerId, capstoneId)
MentorshipStarted(mentorId, menteeId)

// METRICS DOMAIN
EngagementRecorded(learnerId, activity, timestamp)
LearnerMetricsUpdated(learnerId, metrics)
CohortAnalyticsComputed(cohortId, metrics)

// Cross-Domain Subscriptions
Learning.LessonCompleted → SkillLab.GetRelatedExercises()
Learning.PathCompleted → Certification.CheckEligibility()
Certification.ExamSubmitted → Metrics.RecordCompletion()
Certification.CertificateIssued → Community.UnlockMentorRole()
Community.PatternContributed → Metrics.RecordEngagement()
Community.ReviewSubmitted → Certification.UpdateCapstoneStatus()
```

### Ruflo Skill Integration

Each domain uses Ruflo skills for agent-based operations:

| Domain | Skills Used | Purpose |
|--------|------------|---------|
| **Learning** | `content-router`, `progress-tracker` | Route learners to personalized paths |
| **Skill Lab** | `simulator`, `code-executor`, `feedback-agent` | Run simulations, execute code, provide feedback |
| **Certification** | `exam-proctor`, `grader`, `credential-issuer` | Proctor exams, grade, issue certs |
| **Community** | `pattern-curator`, `review-moderator` | Moderate patterns, coordinate reviews |
| **Metrics** | `analytics-aggregator`, `cohort-analyzer` | Aggregate metrics, compute analytics |

---

## 10. TECHNICAL ARCHITECTURE DECISIONS

### Key ADRs (Architecture Decision Records)

**ADR-001: Domain-Driven Design**
- Decision: Use bounded contexts (Learning, Certification, Skill Lab, Community, Metrics)
- Rationale: Isolates complexity, enables independent scaling, clear ownership
- Consequence: Requires careful event coordination, event store management

**ADR-002: Event-Driven Architecture**
- Decision: Domains communicate via Domain Events, not direct calls
- Rationale: Loose coupling, audit trail, enables future analytics
- Consequence: Eventual consistency model, need for event reconciliation

**ADR-003: Ruflo-Based Orchestration**
- Decision: Use Ruflo agents for cross-domain workflows (routing, grading, feedback)
- Rationale: Demonstrates platform capabilities, enables complex workflows, scalable processing
- Consequence: Learners see real Ruflo patterns in use (learning by example)

**ADR-004: Microservice per Domain**
- Decision: Each domain is independently deployable service
- Rationale: Autonomous teams, independent scaling, fault isolation
- Consequence: Network calls between services, need for circuit breakers

**ADR-005: PostgreSQL + Event Store**
- Decision: Each domain has SQL database + event store
- Rationale: ACID for critical operations, event sourcing for audit, time-travel debugging
- Consequence: Complexity in maintaining event store, need for synchronization

---

## 11. MVP PHASING (Weeks 1-8)

### Week 1-2: Foundation & Core Setup
- [ ] Platform infrastructure (auth, user management)
- [ ] Learning domain: Core lesson system
- [ ] Skill Lab: Basic simulator
- [ ] Database schema for Learning & Certification

### Week 3-4: Learning Path
- [ ] 12 Beginner Path lessons created
- [ ] Lesson progress tracking
- [ ] Dashboard skeleton

### Week 5-6: Exam & Certification
- [ ] Exam infrastructure
- [ ] Practitioner certification requirements
- [ ] Basic exam grading

### Week 7: Integration & Testing
- [ ] Domain event coordination
- [ ] End-to-end integration tests
- [ ] Performance baseline

### Week 8: Beta Launch
- [ ] Deploy to staging
- [ ] Close beta with 50 learners
- [ ] Collect feedback
- [ ] Fix critical bugs

**MVP Success Criteria**:
- 50 beta learners active
- 5+ learners complete Beginner Path
- 2+ learners pass Practitioner exam
- NPS score 40+

---

## 12. PHASE 2 ROADMAP (Weeks 9-16)

**Focus**: Skill Lab, Community, Advanced Learning

- Week 9-10: Skill Lab expansion (12 interactive exercises)
- Week 11-12: Community patterns repository
- Week 13-14: Intermediate Path curriculum
- Week 15-16: Peer review workflows
- Target: 150+ active learners, 30+ capstone submissions

---

## 13. PHASE 3 ROADMAP (Weeks 17+)

**Focus**: Scaling, Advanced Features, Partnerships

- Architect & Master certification levels
- Advanced learning path (60 hours)
- Partnership with industry certification bodies
- Enterprise team dashboards
- Target: 500+ active learners, 100+ certified practitioners

---

## 14. SUCCESS METRICS & ACCEPTANCE CRITERIA

### Platform-Level Acceptance Criteria

```gherkin
Feature: Platform Success

  Scenario: 500 Active Learners
    Given 6 months have passed since launch
    When I check "Active Learners" metric
    Then value should be >= 500
    And retention rate should be >= 60%

  Scenario: 70% Course Completion
    Given tracking learning path completions
    When I check completion rate across all paths
    Then value should be >= 70%
    And learners should cite platform as "highly valuable"

  Scenario: 85% Deploy to Production
    Given learners complete capstone projects
    When I survey completed practitioners
    Then 85%+ should report:
      - "Deployed swarm to production within 30 days"
      - "Used Ruflo for production orchestration"

  Scenario: 20% Pursue Certification
    Given 500 active learners
    When I check certification enrollment
    Then value should be >= 100 (20% of 500)
    And completion rate should be >= 50%

  Scenario: NPS Score 60+
    Given collecting quarterly NPS surveys
    When I aggregate scores
    Then average should be >= 60
    And promoters should cite specific features

  Scenario: 100 Peer-Reviewed Patterns
    Given community launch in Phase 2
    When I check pattern repository after 16 weeks
    Then published patterns should be >= 100
    And community engagement should be active
```

---

## 15. CRITICAL SUCCESS FACTORS

1. **Content Quality**: Lessons must be practical, hands-on, immediately applicable
2. **Simulation Fidelity**: Agent simulator must accurately reflect Ruflo behavior
3. **Fast Feedback Loops**: Exercise feedback < 10 seconds
4. **Community Momentum**: Early patterns from expert architects drive engagement
5. **Certification Credibility**: Standards high enough to mean something
6. **Mentorship**: Experienced practitioners available for guidance
7. **Production Relevance**: Capstones solve real business problems

---

## 16. TESTING STRATEGY (London School TDD)

### Test Pyramid by Domain

```
                    ▲
                   / \
                  / E2E \       (5% - Critical flows)
                 /-------\
                /  Acceptance \  (15% - Feature scenarios)
               /-----------\
              /   Unit Tests  \  (80% - Mock dependencies)
             /                 \
            ─────────────────────
```

### Mocking Standards (London School)

Every domain test mocks its dependencies:

```typescript
// Template for all domain feature tests
describe('[DomainName].[Feature]', () => {
  let underTest: [ClassName];
  let mockDependency1: Mock[Type];
  let mockDependency2: Mock[Type];
  let mockEventBus: MockEventBus;

  beforeEach(() => {
    // Create mocks FIRST
    mockDependency1 = mock([Type]);
    mockDependency2 = mock([Type]);
    mockEventBus = mock(EventBus);

    // Inject mocks into class under test
    underTest = new [ClassName](
      mockDependency1,
      mockDependency2,
      mockEventBus
    );
  });

  it('should [behavior] when [condition]', () => {
    // Arrange: Setup mock return values
    mockDependency1.method.returns(value);

    // Act: Call method
    const result = underTest.method(input);

    // Assert: Verify mocks were called correctly
    expect(mockDependency1.method).toHaveBeenCalledWith(expected);
    expect(result).toEqual(expected);
  });
});
```

---

## 17. DEPLOYMENT STRATEGY

### Infrastructure
- **Platform**: AWS ECS (Fargate) with Aurora PostgreSQL
- **Event Store**: Kafka for domain events
- **Cache**: Redis for session/progress
- **Search**: Elasticsearch for lesson/pattern search
- **Storage**: S3 for certificates, capstone uploads, code submissions

### CI/CD Pipeline
- Each domain has independent pipeline
- Tests (unit + integration) must pass
- Code coverage threshold: 80%
- Staging deployment on successful test
- Production deployment approval before release

---

## 18. GLOSSARY

| Term | Definition |
|------|-----------|
| **Agent** | Autonomous unit in Ruflo that processes messages and state |
| **Orchestration** | Coordination of multiple agents in patterns |
| **Swarm** | Group of agents working together |
| **Pattern** | Reusable solution to orchestration problem |
| **Topology** | Network structure of agents (hierarchical, mesh, etc.) |
| **Byzantine Consensus** | Agreement algorithm tolerating faulty agents |
| **Domain Event** | Significant occurrence in a domain (e.g., LessonCompleted) |
| **Bounded Context** | Explicit boundary around a domain (Learning, Certification, etc.) |
| **Skill Lab** | Sandbox environment for practicing orchestration |
| **Capstone** | Final project demonstrating competency |

---

## APPENDIX: ACCEPTANCE CRITERIA SUMMARY

### By Status

**MUST HAVE (MVP)**:
- Learning Path curriculum (Beginner only)
- Lesson progress tracking
- Interactive simulator
- Practitioner exam & certification
- Basic dashboard

**SHOULD HAVE (Phase 2)**:
- Intermediate Path curriculum
- Community patterns
- Peer code review
- Skill Lab exercises (12+)
- Analytics dashboard

**COULD HAVE (Phase 3)**:
- Architect & Master levels
- Advanced Path curriculum
- Enterprise team features
- Partner integrations
- Mobile app

**WON'T HAVE (Out of scope)**:
- Synchronous instructor-led classes
- Video hosting (link to external)
- AI tutoring (not Ruflo-focused)
- Marketplace/paid content

---

## Document Metadata

- **Created**: June 2, 2026
- **Last Updated**: June 2, 2026
- **Status**: SPECIFICATION PHASE
- **Methodology**: SPARC with London School TDD
- **Next Phase**: Architecture & Pseudocode
- **Review Frequency**: Weekly during development
- **Approval Required From**: Product, Engineering, Certification Board

---

**END OF PRD**

---

## Quick Reference: Feature Checklist

### Learning Domain
- [ ] Learning paths (Beginner, Intermediate, Advanced)
- [ ] Lessons with code examples
- [ ] Progress dashboard
- [ ] Interactive curriculum

### Skill Lab Domain
- [ ] Agent simulator with visualization
- [ ] Guided exercises with autograding
- [ ] Code runner & feedback

### Certification Domain
- [ ] Certification levels (Practitioner, Architect, Master)
- [ ] Exam management & proctoring
- [ ] Capstone review workflow
- [ ] Credential issuance

### Community Domain
- [ ] Pattern repository
- [ ] Peer code review
- [ ] Mentor matching

### Metrics Domain
- [ ] Learner analytics
- [ ] Cohort reporting
- [ ] Engagement tracking

---

**This PRD is a living document. Update as requirements evolve and feedback arrives from stakeholders.**
