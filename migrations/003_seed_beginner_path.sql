-- Migration: Seed Beginner Learning Path (12 lessons)
-- Date: 2026-06-07
-- Source: PRD §4.4 "Beginner Path (40 hours, 12 lessons)"
-- Note: lesson `content` is left empty ('[]') here; authored in ADR-013 Phase 5.
-- Idempotent: ON CONFLICT DO NOTHING on primary keys.

-- Beginner path (no prerequisite)
INSERT INTO ruflo_demo.ruflo_demo_learning_path_read_model
  (path_id, level, title, description, estimated_hours, lesson_count, ordered_lesson_ids, prerequisite_path_id, status)
VALUES (
  'b0000000-0000-4000-8000-000000000000',
  'beginner',
  'Beginner Path',
  'Backend engineers new to agent systems. From "Hello World" swarms to a deployed customer-service capstone.',
  40,
  12,
  ARRAY[
    'b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002',
    'b0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000004',
    'b0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000006',
    'b0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000008',
    'b0000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-000000000010',
    'b0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000012'
  ]::UUID[],
  NULL,
  'PUBLISHED'
)
ON CONFLICT (path_id) DO NOTHING;

-- 12 lessons (order, title, topics, hours, capstone, prerequisite)
INSERT INTO ruflo_demo.ruflo_demo_lesson_read_model
  (lesson_id, path_id, lesson_order, title, topics, estimated_hours, capstone, prerequisite_lesson_id, content, status)
VALUES
  ('b0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000000',1,
   'Introduction to Agent Orchestration', '["Agents","messages","topologies"]', 2, 'quiz', NULL, '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000000',2,
   'Hello World with Ruflo', '["Basic swarm setup","agent lifecycle"]', 3, 'run_example', 'b0000000-0000-4000-8000-000000000001', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000000',3,
   'Message Passing Patterns', '["Direct","pub/sub","broadcast"]', 3, 'design_pattern', 'b0000000-0000-4000-8000-000000000002', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000000',4,
   'Agent State Management', '["State machines","persistence"]', 3, 'code_exercise', 'b0000000-0000-4000-8000-000000000003', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000000',5,
   'Error Handling & Resilience', '["Retries","circuit breakers","fallbacks"]', 3, 'code_exercise', 'b0000000-0000-4000-8000-000000000004', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000000',6,
   'Monitoring & Observability', '["Metrics","logging","tracing"]', 3, 'code_exercise', 'b0000000-0000-4000-8000-000000000005', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000000',7,
   'Scaling Strategies', '["Horizontal/vertical","load balancing"]', 3, 'design_document', 'b0000000-0000-4000-8000-000000000006', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000008','b0000000-0000-4000-8000-000000000000',8,
   'Testing Orchestrations', '["Unit","integration","e2e tests"]', 3, 'test_suite', 'b0000000-0000-4000-8000-000000000007', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-000000000000',9,
   'Deploying to Staging', '["Container setup","orchestration"]', 3, 'deployment', 'b0000000-0000-4000-8000-000000000008', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000010','b0000000-0000-4000-8000-000000000000',10,
   'Production Considerations', '["Security","compliance","SLAs"]', 2, 'review_checklist', 'b0000000-0000-4000-8000-000000000009', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000000',11,
   'Capstone Project Part 1', '["Design multi-agent system"]', 3, 'architecture_doc', 'b0000000-0000-4000-8000-000000000010', '[]', 'PUBLISHED'),
  ('b0000000-0000-4000-8000-000000000012','b0000000-0000-4000-8000-000000000000',12,
   'Capstone Project Part 2', '["Implement & deploy capstone"]', 4, 'running_system', 'b0000000-0000-4000-8000-000000000011', '[]', 'PUBLISHED')
ON CONFLICT (lesson_id) DO NOTHING;
