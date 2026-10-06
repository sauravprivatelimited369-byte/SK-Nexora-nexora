import { z } from 'zod';
import { chatCompletion, extractJson, isAiConfigured } from './ai';

const list = z.array(z.string().trim().min(2).max(240)).min(1).max(12);
const blueprintSchema = z.object({
  title: z.string().trim().min(4).max(120),
  problem: z.string().trim().min(20).max(1400),
  solution: z.string().trim().min(20).max(1400),
  target_users: list,
  real_world_application: z.string().trim().min(10).max(900),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  estimated_weeks: z.number().int().min(1).max(52),
  required_skills: list,
  components: z.array(z.object({ name: z.string().max(120), purpose: z.string().max(240), estimated_cost_inr: z.string().max(80) })).max(14),
  estimated_budget: z.object({ min_inr: z.number().nonnegative(), max_inr: z.number().nonnegative(), assumptions: z.array(z.string().max(240)).max(6) }),
  architecture: z.string().min(30).max(1800),
  milestones: z.array(z.object({ title: z.string().min(3).max(100), description: z.string().min(10).max(500), tasks: z.array(z.string().min(3).max(180)).min(1).max(8) })).min(3).max(10),
  database_design: z.string().max(1200),
  api_design: z.string().max(1200),
  folder_structure: z.array(z.string().max(180)).max(20),
  testing_plan: list,
  security_considerations: list,
  deployment_plan: list,
  future_improvements: list,
});

export type ProjectBlueprint = z.infer<typeof blueprintSchema>;

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function createStarterBlueprint(rawPrompt: string): ProjectBlueprint {
  const prompt = rawPrompt.trim();
  const agriculture = /agri|farm|irrigat|crop|soil|greenhouse/i.test(prompt);
  const iot = agriculture || /iot|sensor|embedded|arduino|esp32|hardware|device/i.test(prompt);
  const mechanical = /mechanical|cad|thermo|fluid|machine|robot|manufactur/i.test(prompt);
  const focus = agriculture ? 'Smart Agriculture Monitoring System' : mechanical ? 'Engineering Design & Monitoring Project' : iot ? 'Connected Sensor Monitoring System' : 'Engineering Project Workspace';
  const title = agriculture ? 'FieldSense — Smart Agriculture Monitoring' : mechanical ? 'EngiScope — Engineering Design Monitor' : iot ? 'Nexora Sense — Connected Monitoring' : `${titleCase(prompt.replace(/[.!?].*$/, '').split(/\s+/).slice(-5).join(' '))} — Project Blueprint`;
  const skills = agriculture
    ? ['IoT', 'Embedded Systems', 'Sensors', 'Python', 'API Design', 'Project Planning']
    : mechanical
      ? ['CAD', 'Thermodynamics', 'Problem Solving', 'Project Planning']
      : iot
        ? ['Embedded Systems', 'Sensors', 'Python', 'API Design', 'Project Planning']
        : ['Problem Solving', 'API Design', 'Project Planning', 'Git'];
  const components = agriculture
    ? [
      { name: 'ESP32 development board', purpose: 'Reads sensor inputs and connects to Wi-Fi', estimated_cost_inr: '₹350–₹700' },
      { name: 'Capacitive soil-moisture sensor', purpose: 'Estimates soil moisture with less corrosion than exposed probes', estimated_cost_inr: '₹120–₹300' },
      { name: 'Temperature and humidity sensor', purpose: 'Adds ambient context to field readings', estimated_cost_inr: '₹100–₹350' },
      { name: 'Relay module and low-voltage pump', purpose: 'Optional supervised irrigation prototype; size for the actual load', estimated_cost_inr: '₹300–₹900' },
      { name: 'Power supply, enclosure, tubing, wires', purpose: 'Safe prototype assembly and weather protection', estimated_cost_inr: '₹500–₹1,200' },
    ]
    : iot
      ? [
        { name: 'ESP32 development board', purpose: 'Collects sensor readings and connects to Wi-Fi', estimated_cost_inr: '₹350–₹700' },
        { name: 'Sensor matched to the physical quantity', purpose: 'Measures the signal required by the project', estimated_cost_inr: '₹150–₹800' },
        { name: 'Breadboard, jumper wires, enclosure', purpose: 'Prototype assembly and protection', estimated_cost_inr: '₹300–₹900' },
      ]
      : [];
  const projectTasks = agriculture ? [
    { title: 'Define field requirements', description: 'Choose a small test plot, target crops, sampling interval, and what counts as a useful alert.', tasks: ['Write a one-page problem and user brief', 'Set measurable moisture and alert thresholds'] },
    { title: 'Prototype sensor readings', description: 'Connect the sensor to the ESP32 and log calibrated readings before controlling any equipment.', tasks: ['Review the exact board and sensor data sheets', 'Read and label 30 sensor samples', 'Document calibration and known limitations'] },
    { title: 'Build the data service', description: 'Send readings over an authenticated API or MQTT broker and persist timestamped measurements.', tasks: ['Design a readings schema with device ID and timestamp', 'Implement a validated ingest endpoint', 'Add connectivity and malformed-payload tests'] },
    { title: 'Create the monitoring dashboard', description: 'Show current conditions, history, device health, and user-configured alerts.', tasks: ['Plot sample readings with units', 'Display stale/offline device state', 'Add accessible threshold controls'] },
    { title: 'Test and prepare a field pilot', description: 'Validate failure modes and safety before any pump or mains-connected equipment is used.', tasks: ['Test sensor disconnect and network loss', 'Review access control and secret handling', 'Write setup, maintenance, and rollback instructions'] },
  ] : [
    { title: 'Scope the problem', description: 'Identify a specific user, measurable outcome, constraints, and acceptance criteria.', tasks: ['Write the problem statement', 'Record assumptions and constraints'] },
    { title: 'Design the system', description: 'Map components and data flow before building the first vertical slice.', tasks: ['Draw the architecture and interfaces', 'Choose data model and key technologies'] },
    { title: 'Build the smallest working slice', description: 'Implement one end-to-end use case and make each step observable.', tasks: ['Create the core data or prototype model', 'Implement the primary user workflow', 'Document setup and limitations'] },
    { title: 'Validate and improve', description: 'Test normal and failure cases; use feedback to prioritize a second iteration.', tasks: ['Add unit and integration checks', 'Test an error and edge case', 'Summarize results and next steps'] },
  ];
  return {
    title,
    problem: agriculture
      ? 'Small farms often make irrigation decisions with limited, delayed visibility into soil and local conditions. Fixed schedules can over-water or under-water and make it difficult to explain when a field needs attention.'
      : `The requested project, “${prompt}”, needs a clear user problem, measurable outcome, and build sequence before implementation can be evaluated. This starter brief turns the idea into a testable engineering plan.`,
    solution: agriculture
      ? 'Build a low-cost, modular prototype that records soil and ambient readings, sends timestamped measurements to a private service, and presents trends and configurable alerts. Treat automated pump control as an optional, safety-reviewed extension.'
      : `Create a small, testable system around “${prompt}”. Start with a narrowly scoped user workflow, keep interfaces explicit, record assumptions, and add tests before extending the feature set.`,
    target_users: agriculture ? ['Smallholder farmers and farm operators', 'Agronomy students and extension teams', 'Engineering teams evaluating low-cost field sensing'] : ['The primary user described in the project brief', 'Engineering students building a demonstrable prototype'],
    real_world_application: agriculture ? 'A supervised pilot can help compare sensor readings with manual observations and support more informed irrigation decisions. Readings are advisory until calibrated for local soil, crop, and field conditions.' : 'Use the project as a working prototype to validate the target workflow with real users before expanding its scope.',
    difficulty: agriculture ? 'Intermediate' : 'Beginner',
    estimated_weeks: agriculture ? 6 : 4,
    required_skills: skills,
    components,
    estimated_budget: agriculture
      ? { min_inr: 1370, max_inr: 3450, assumptions: ['Indicative India retail ranges; prices and availability vary by location and supplier.', 'Includes a small low-voltage prototype, not field-grade weatherproof hardware.', 'Pump and power supply must be independently sized and reviewed for safe use.'] }
      : { min_inr: 0, max_inr: 2500, assumptions: ['Budget depends on final scope and whether hardware is required.', 'Cloud hosting and third-party service charges are excluded.', 'Verify component prices and safety specifications before purchase.'] },
    architecture: agriculture
      ? 'Capacitive soil sensor + ambient sensor → ESP32 (sample, basic validation, Wi-Fi) → authenticated ingest API or MQTT broker → PostgreSQL readings store → web dashboard (trends, device heartbeat, thresholds). Keep actuation behind an explicit, fail-safe control boundary; never connect a pump until the electrical design is reviewed.'
      : 'User interface / physical prototype → validated service boundary → persistent data store → observable results. Keep inputs and responsibilities modular so individual components can be tested and replaced.',
    milestones: projectTasks,
    database_design: agriculture
      ? 'devices(id, owner_id, label, firmware_version, last_seen_at); readings(id, device_id, captured_at, moisture_raw, moisture_pct, temperature_c, humidity_pct, quality_flags); alert_rules(id, owner_id, device_id, threshold, enabled); audit_events(id, actor_id, action, created_at). Index readings by (device_id, captured_at). Store times in UTC and keep raw/calibrated values distinct.'
      : 'Start with entities for users, the main project object, and timestamped activity or results. Add stable IDs, ownership keys, created/updated times, input validation, and indexes only for demonstrated query patterns.',
    api_design: agriculture
      ? 'POST /api/v1/devices/{deviceId}/readings (authenticated device credential, validated units/ranges); GET /api/v1/devices (owner scoped); GET /api/v1/devices/{deviceId}/readings?from=&to= (bounded pagination); PATCH /api/v1/alert-rules/{id} (owner authorized). Return structured errors and rate-limit device ingestion.'
      : 'Define resource-oriented endpoints for the main workflow. Validate request bodies, authenticate private operations, enforce ownership on every read/write, paginate collections, and return useful status codes without exposing internal errors.',
    folder_structure: iot ? ['firmware/src/', 'firmware/test/', 'server/src/routes/', 'server/src/services/', 'server/src/db/', 'web/src/components/', 'web/src/features/', 'docs/architecture.md', 'docs/safety.md'] : ['src/app/', 'src/components/', 'src/features/', 'src/server/', 'src/db/', 'tests/unit/', 'tests/integration/', 'docs/architecture.md', 'README.md'],
    testing_plan: ['Unit-test validation, conversions, and threshold logic with boundary values.', 'Integration-test persistence and owner-scoped API access.', 'Simulate missing, stale, malformed, and out-of-range sensor data.', 'Run a small user test and record expected versus observed outcomes.'],
    security_considerations: ['Keep API and device secrets server-side; never commit secrets to Git.', 'Authenticate devices and scope every record to its owner.', 'Use TLS for network traffic and rotate compromised credentials.', 'Treat sensor readings as advisory; add manual override and safe defaults for any actuator.', 'Validate file, payload, and time-range limits.'],
    deployment_plan: ['Run the service in a test environment with synthetic readings first.', 'Configure managed PostgreSQL, TLS, secret storage, backups, and request logging.', 'Deploy a versioned API and monitor errors, latency, and device heartbeats.', 'Pilot with one device and documented rollback before scaling.'],
    future_improvements: ['Add calibrated multi-zone sensing with documented uncertainty.', 'Add offline buffering and signed device updates.', 'Compare alert performance against field observations.', 'Support multiple farms and roles with audited access.'],
  };
}

export async function generateProjectBlueprint(prompt: string, userContext: string, userId: string): Promise<{ blueprint: ProjectBlueprint; source: 'ai' | 'starter'; tokens: number | null }> {
  if (!isAiConfigured()) return { blueprint: createStarterBlueprint(prompt), source: 'starter', tokens: null };
  const completion = await chatCompletion([
    { role: 'system', content: 'You are NEXORA, an engineering project planning system. Return only valid JSON matching the requested schema. Never invent existing code, test results, certifications, or verified skills. Make safety constraints and budget assumptions explicit. For hardware, budget amounts are rough estimates in INR and must be labeled as estimates. Ensure milestones contain specific tasks. If the domain is high-risk, require qualified review.' },
    { role: 'user', content: `Create a detailed but buildable engineering project plan for this request: ${prompt}\n\nLearner context: ${userContext}\n\nReturn JSON with keys: title, problem, solution, target_users (string array), real_world_application, difficulty (Beginner|Intermediate|Advanced), estimated_weeks (integer), required_skills (array), components (array of {name,purpose,estimated_cost_inr}), estimated_budget ({min_inr,max_inr,assumptions}), architecture, milestones (array of {title,description,tasks}), database_design, api_design, folder_structure (array), testing_plan (array), security_considerations (array), deployment_plan (array), future_improvements (array). Use empty strings for software-only database/api sections that do not apply. Do not use markdown fences.` },
  ], { temperature: 0.25, maxTokens: 2800, userId, kind: 'project_builder' });
  const parsed = blueprintSchema.safeParse(extractJson<unknown>(completion.text));
  if (!parsed.success) throw new Error(`AI project schema invalid: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`);
  return { blueprint: parsed.data, source: 'ai', tokens: (completion.promptTokens ?? 0) + (completion.completionTokens ?? 0) || null };
}
