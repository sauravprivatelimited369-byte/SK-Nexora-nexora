type SeedQuery = <T extends Record<string, unknown> = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<{ rows: T[]; rowCount: number }>;

const subjects = [
  ['cs-fundamentals', 'Computer Science', 'Computer Science', 'Build durable foundations in programming, data, networks, and software systems.', 'terminal'],
  ['it-systems', 'Information Technology', 'Information Technology', 'Learn to design, deploy, and maintain reliable information systems.', 'network'],
  ['ai-data-science', 'AI & Data Science', 'AI/ML & Data Science', 'Move from data foundations to responsible, evaluated machine learning systems.', 'brain'],
  ['electronics', 'Electronics Engineering', 'Electronics', 'Understand circuits, digital logic, sensing, and embedded systems.', 'cpu'],
  ['electrical', 'Electrical Engineering', 'Electrical', 'Study electrical networks, machines, power, and control systems.', 'zap'],
  ['mechanical', 'Mechanical Engineering', 'Mechanical', 'Connect mechanics, thermal sciences, design, and manufacturing.', 'settings'],
  ['civil', 'Civil Engineering', 'Civil', 'Learn the analysis and design principles behind the built environment.', 'building'],
  ['chemical', 'Chemical Engineering', 'Chemical', 'Explore transport, reaction, and process engineering fundamentals.', 'flask'],
] as const;

const topics = [
  {
    id: 'python-functions', subject: 'cs-fundamentals', title: 'Python functions & modules', slug: 'python-functions', summary: 'Write reusable functions, reason about scope, and organize code into modules.', level: 'Beginner', duration: 25, order: 1,
    objectives: ['Define functions with parameters and return values', 'Explain local and global scope', 'Import and organize modules'],
    content: `## Why functions matter\nA function is a named, reusable unit of work. Functions turn a long script into small pieces you can test, understand, and combine.\n\n## The shape of a function\n\`def area(width, height):\n    return width * height\n\nprint(area(4, 3))  # 12\`\n\nThe values inside the parentheses are parameters. \`return\` sends a result back to the caller; \`print\` only displays a value.\n\n## Scope and modules\nNames created inside a function are local to that function. Put related functions in a \`.py\` file and import that file as a module. Keep modules focused on one concept.\n\n## Common mistakes\n- Forgetting to return a value (the result becomes \`None\`).\n- Using mutable defaults such as \`items=[]\`; use \`None\` and create the list inside instead.\n- Writing one function that does several unrelated jobs.\n\n## Try it\nWrite \`celsius_to_fahrenheit(celsius)\` and test it with 0°C and 100°C. The formula is \`F = C × 9/5 + 32\`.`,
  },
  {
    id: 'http-rest', subject: 'cs-fundamentals', title: 'HTTP & REST APIs', slug: 'http-rest', summary: 'Understand requests, responses, HTTP methods, status codes, and resource-oriented API design.', level: 'Beginner', duration: 30, order: 2,
    objectives: ['Describe a request-response cycle', 'Choose an HTTP method for a change', 'Interpret common status codes'],
    content: `## A request-response contract\nHTTP is the protocol browsers and services use to exchange messages. A request has a method, URL, headers, and sometimes a body. A response has a status code, headers, and often a body.\n\n## Methods and resources\nA REST-style API models things as resources. \`GET /projects\` reads a collection; \`POST /projects\` creates one; \`GET /projects/42\` reads one; \`PATCH /projects/42\` updates selected fields; \`DELETE /projects/42\` removes it.\n\n## Status codes\n- \`200\` successful read or update; \`201\` resource created.\n- \`400\` invalid input; \`401\` not authenticated; \`403\` not allowed.\n- \`404\` not found; \`429\` rate limit; \`500\` unexpected server failure.\n\n## Design checkpoint\nValidate inputs at the boundary, return useful error messages without leaking internals, and require authorization on every private resource.`,
  },
  {
    id: 'sql-joins', subject: 'cs-fundamentals', title: 'SQL joins & relationships', slug: 'sql-joins', summary: 'Combine related rows and understand what each join preserves.', level: 'Beginner', duration: 25, order: 3,
    objectives: ['Read a primary-key/foreign-key relationship', 'Choose INNER vs LEFT JOIN', 'Avoid accidental row multiplication'],
    content: `## Why joins exist\nRelational data is split into tables so each fact has a clear home. A foreign key connects a row to a related row. A join combines those rows for a query.\n\n## INNER JOIN and LEFT JOIN\n\`SELECT p.title, u.name\nFROM projects AS p\nJOIN users AS u ON u.id = p.user_id;\`\n\nAn INNER JOIN keeps only rows with a match on both sides. A LEFT JOIN keeps every left-side row and fills missing right-side values with NULL.\n\n## Example\nTo list every student, including those with no project yet, start from students and LEFT JOIN projects. Starting from projects would omit students with no project.\n\n## Common mistakes\n- Joining on a non-unique column and multiplying rows.\n- Putting a right-table filter in WHERE after a LEFT JOIN when you meant to preserve missing matches.\n- Forgetting the relationship condition and creating a Cartesian product.`,
  },
  {
    id: 'git-workflow', subject: 'cs-fundamentals', title: 'Git branches & pull requests', slug: 'git-workflow', summary: 'Use version control to make changes safely and collaborate through review.', level: 'Beginner', duration: 20, order: 4,
    objectives: ['Describe commit, branch, and merge', 'Make a focused commit', 'Explain why code review helps'],
    content: `## A useful mental model\nGit records snapshots of a project. A commit is a named snapshot; a branch is a movable pointer that lets you work separately; a merge brings reviewed changes together.\n\n## A small workflow\n\`git switch -c feature/profile-card\ngit status\ngit add src/ProfileCard.tsx\ngit commit -m "Add profile card"\`\n\nKeep each commit focused. A pull request gives collaborators context, a diff to review, and a place to run automated checks before merging.\n\n## Good habits\nRead the diff before committing, keep secrets out of source control, and use a \`.gitignore\` for local data and generated files.`,
  },
  {
    id: 'thermodynamics-first-law', subject: 'mechanical', title: 'First law of thermodynamics', slug: 'thermodynamics-first-law', summary: 'Apply energy conservation to closed systems and identify sign conventions.', level: 'Beginner', duration: 30, order: 1,
    objectives: ['Define a control mass', 'Use the first-law energy balance', 'State assumptions and sign convention'],
    content: `## Energy bookkeeping\nThe first law is conservation of energy. For a closed system, a common engineering form is \`ΔU = Q − W\`, where \`Q\` is heat added to the system and \`W\` is work done by the system. State the convention before using signs.\n\n## A simple example\nIf 500 J of heat enters a closed system and it does 120 J of work, then \`ΔU = 500 − 120 = 380 J\`. This assumes kinetic and potential energy changes are negligible.\n\n## Engineering use\nThe same energy balance supports analysis of pistons, engines, refrigeration cycles, and many thermal processes. Real systems may also require flow energy, shaft work, and heat losses.\n\n## Check your assumptions\nIdentify the system boundary, process, sign convention, and neglected terms. Units must be consistent.`,
  },
  {
    id: 'fluid-continuity', subject: 'mechanical', title: 'Continuity equation for incompressible flow', slug: 'fluid-continuity', summary: 'Relate flow area and velocity using conservation of mass.', level: 'Beginner', duration: 20, order: 2,
    objectives: ['Explain conservation of mass', 'Apply Q = A·v', 'Check units and assumptions'],
    content: `## Conservation of mass\nFor steady, incompressible flow through a single inlet and outlet, volumetric flow rate is conserved: \`Q = A₁v₁ = A₂v₂\`. Here \`A\` is cross-sectional area and \`v\` is average velocity.\n\n## Example\nIf a pipe narrows from 0.02 m² to 0.01 m² and the inlet velocity is 2 m/s, then \`v₂ = (0.02 × 2) / 0.01 = 4 m/s\`.\n\n## Limits\nThe simple form assumes steady flow, incompressible fluid, and no branches or leakage. For compressible flow, use mass flow rate \`ṁ = ρAv\`.`,
  },
  {
    id: 'circuit-ohms-law', subject: 'electronics', title: 'Circuit analysis: Ohm’s law', slug: 'circuit-ohms-law', summary: 'Use voltage, current, and resistance to analyze simple DC circuits.', level: 'Beginner', duration: 20, order: 1,
    objectives: ['Use V = I·R with units', 'Calculate power', 'Identify series and parallel behavior'],
    content: `## The relationship\nFor an ideal ohmic resistor, voltage, current, and resistance are related by \`V = I × R\`. If a 1 kΩ resistor has 5 V across it, current is \`I = 5 / 1000 = 0.005 A = 5 mA\`.\n\n## Power and safety\nElectrical power is \`P = V × I = I²R = V²/R\`. Check resistor power rating and component limits before building. A circuit diagram is not a substitute for validating wiring and supply voltage.\n\n## Combining resistors\nSeries resistances add. For parallel resistors, reciprocal resistances add: \`1/Rₑq = 1/R₁ + 1/R₂\`.`,
  },
  {
    id: 'embedded-sensors', subject: 'electronics', title: 'Reading a sensor with a microcontroller', slug: 'embedded-sensors', summary: 'Design a safe sensor input, sample data, and validate readings.', level: 'Beginner', duration: 35, order: 2,
    objectives: ['Distinguish analog and digital signals', 'Check voltage compatibility', 'Plan calibration and filtering'],
    content: `## From physical quantity to data\nA sensor converts a physical quantity into an electrical signal. A microcontroller reads an analog voltage with an ADC or a digital value over a bus such as I²C.\n\n## Before wiring\nRead the module data sheet. Confirm supply voltage, logic level, pinout, current draw, and whether the output is analog or digital. Never assume a 5 V signal is safe for a 3.3 V input.\n\n## Make measurements useful\nCollect a baseline, repeat samples, note units, and document calibration. A moving average can reduce noise, but filtering also adds delay. Test disconnected, expected, and out-of-range values.`,
  },
  {
    id: 'ac-power-basics', subject: 'electrical', title: 'AC power: real, reactive, and apparent', slug: 'ac-power-basics', summary: 'Differentiate P, Q, and S and interpret power factor.', level: 'Beginner', duration: 25, order: 1,
    objectives: ['Define real and reactive power', 'Interpret power factor', 'Keep RMS quantities and units clear'],
    content: `## Three useful quantities\nIn sinusoidal steady state, real power \`P\` (watts) performs useful work, reactive power \`Q\` (var) exchanges energy with inductors and capacitors, and apparent power \`S\` (VA) is their vector combination.\n\nFor single-phase circuits using RMS values: \`P = Vᵣₘₛ Iᵣₘₛ cos φ\`, \`Q = Vᵣₘₛ Iᵣₘₛ sin φ\`, and power factor is \`cos φ = P/S\`.\n\n## Engineering meaning\nLow power factor can increase current for the same real power. Always identify the load, phase convention, and whether values are RMS. High-voltage work requires qualified supervision and appropriate safety practices.`,
  },
  {
    id: 'cad-design-intro', subject: 'mechanical', title: 'Parametric CAD: constraints and design intent', slug: 'cad-design-intro', summary: 'Create editable sketches by expressing dimensions and relationships as constraints.', level: 'Beginner', duration: 25, order: 3,
    objectives: ['Distinguish geometry from constraints', 'Use dimensions to capture design intent', 'Check degrees of freedom'],
    content: `## Why constraints matter\nA parametric sketch describes both geometry and relationships. Dimensions define size; geometric constraints define relationships such as horizontal, concentric, or equal.\n\n## Workflow\nStart from a meaningful reference plane, add the minimum necessary geometry, constrain relationships, then dimension the sketch. A fully constrained sketch has no unintended degrees of freedom.\n\n## Design intent\nUse dimensions that reflect how a part should change. Avoid duplicate constraints and overly complex sketches. Validate units and manufacturing clearances before treating a model as production-ready.`,
  },
  {
    id: 'civil-load-path', subject: 'civil', title: 'Structural load paths', slug: 'civil-load-path', summary: 'Trace how loads move through structural elements to the ground.', level: 'Beginner', duration: 25, order: 1,
    objectives: ['Identify dead and live loads', 'Trace a load path', 'Explain why assumptions need code review'],
    content: `## A load path is a system\nLoads transfer through connected structural elements to the foundation and soil. A floor load may pass to a slab, beams, columns or walls, foundations, and finally the ground.\n\n## Start with a free-body diagram\nDraw the system boundary, show applied forces and support reactions, and check equilibrium. Distinguish dead load from occupancy, environmental, and construction loads.\n\n## Responsible practice\nReal designs must follow the applicable local building code, verified material properties, and qualified engineering review. A learning example is not a construction design.`,
  },
  {
    id: 'ml-train-test', subject: 'ai-data-science', title: 'Train, validation, and test splits', slug: 'ml-train-test', summary: 'Evaluate generalization without leaking information from the test set.', level: 'Beginner', duration: 25, order: 1,
    objectives: ['Explain the purpose of each split', 'Recognize data leakage', 'Choose a metric that fits the task'],
    content: `## Separate learning from evaluation\nA training set fits model parameters. A validation set supports model and hyperparameter choices. A test set estimates performance on data kept untouched until final evaluation.\n\n## Leakage\nLeakage occurs when information from the future or target enters training features or preprocessing. Fit preprocessing on training data only, then apply it to validation and test sets. For time-series data, use chronological splits.\n\n## Metrics and uncertainty\nChoose metrics based on the task and error costs. Accuracy can be misleading for imbalanced classes. Report the split strategy, data limitations, and uncertainty.`,
  },
  {
    id: 'chemical-mass-balance', subject: 'chemical', title: 'Material balance fundamentals', slug: 'chemical-mass-balance', summary: 'Apply conservation of mass around a process boundary.', level: 'Beginner', duration: 25, order: 1,
    objectives: ['Draw a process boundary', 'Write input-output-accumulation balance', 'Use consistent units'],
    content: `## Conservation statement\nFor a chosen system, \`input − output + generation − consumption = accumulation\`. At steady state, accumulation is zero. For a nonreactive process, generation and consumption terms are zero.\n\n## A structured approach\nChoose a basis, draw and label the boundary, list known flow rates and compositions, write component balances, then solve. Keep mass and molar units distinct.\n\n## Engineering caution\nFor reacting systems, use stoichiometry and account for all species. Real process design also requires safety, energy, and regulatory analysis.`,
  },
] as const;

const questions = [
  { id: 'q-python-1', topic: 'python-functions', prompt: 'What does a Python function use to send a value back to its caller?', choices: ['print', 'return', 'break', 'import'], answer: 'return', explanation: 'return produces a value for the caller. print only writes output.', difficulty: 1 },
  { id: 'q-python-2', topic: 'python-functions', prompt: 'What is the value of area(4, 3) for `def area(w, h): return w * h`?', choices: ['7', '12', '1', 'None'], answer: '12', explanation: 'The function multiplies width by height: 4 × 3 = 12.', difficulty: 1 },
  { id: 'q-python-3', topic: 'python-functions', prompt: 'Why is a mutable default such as `items=[]` usually avoided?', choices: ['It is invalid syntax', 'The same list can be reused across calls', 'It prevents imports', 'Lists cannot be returned'], answer: 'The same list can be reused across calls', explanation: 'Default objects are created once when the function is defined, so a mutated list can persist between calls.', difficulty: 2 },
  { id: 'q-http-1', topic: 'http-rest', prompt: 'Which status code normally indicates a resource was created successfully?', choices: ['200', '201', '401', '404'], answer: '201', explanation: '201 Created is the conventional response after successful resource creation.', difficulty: 1 },
  { id: 'q-http-2', topic: 'http-rest', prompt: 'Which method is most appropriate to partially update an existing resource?', choices: ['GET', 'POST', 'PATCH', 'OPTIONS'], answer: 'PATCH', explanation: 'PATCH applies a partial modification; PUT is commonly used for replacement.', difficulty: 2 },
  { id: 'q-http-3', topic: 'http-rest', prompt: 'An unauthenticated request to a protected endpoint usually receives which status?', choices: ['201', '401', '204', '301'], answer: '401', explanation: '401 indicates authentication is required or missing. 403 means the user is authenticated but forbidden.', difficulty: 2 },
  { id: 'q-sql-1', topic: 'sql-joins', prompt: 'Which join keeps every row from the left table, even when there is no match?', choices: ['INNER JOIN', 'LEFT JOIN', 'CROSS JOIN', 'NATURAL JOIN'], answer: 'LEFT JOIN', explanation: 'LEFT JOIN preserves all left-side rows and uses NULL for unmatched right-side columns.', difficulty: 1 },
  { id: 'q-sql-2', topic: 'sql-joins', prompt: 'A join unexpectedly duplicates each project. What should you inspect first?', choices: ['The sort order', 'Whether the join key is unique on the related side', 'The font size', 'The database timezone'], answer: 'Whether the join key is unique on the related side', explanation: 'A one-to-many or many-to-many match can multiply rows; verify the relationship and expected cardinality.', difficulty: 3 },
  { id: 'q-sql-3', topic: 'sql-joins', prompt: 'A foreign key typically references a row identified by a table’s…', choices: ['CSS class', 'Primary key', 'Index name only', 'Column comment'], answer: 'Primary key', explanation: 'A foreign key maintains referential integrity by referencing a unique key, commonly the primary key.', difficulty: 2 },
  { id: 'q-git-1', topic: 'git-workflow', prompt: 'What is a Git commit?', choices: ['A saved project snapshot', 'A remote server', 'A programming language', 'A code editor'], answer: 'A saved project snapshot', explanation: 'A commit records a project snapshot with metadata and a message.', difficulty: 1 },
  { id: 'q-git-2', topic: 'git-workflow', prompt: 'Why should secrets be excluded from Git?', choices: ['They make branches slower', 'A repository history can retain leaked credentials', 'Git cannot store text', 'It disables tests'], answer: 'A repository history can retain leaked credentials', explanation: 'Removing a secret from the latest file does not remove it from repository history; rotate leaked credentials.', difficulty: 2 },
  { id: 'q-thermo-1', topic: 'thermodynamics-first-law', prompt: 'Using ΔU = Q − W, what is ΔU if 500 J enters as heat and the system does 120 J of work?', choices: ['620 J', '380 J', '-380 J', '0 J'], answer: '380 J', explanation: 'With heat into the system positive and work by the system positive, ΔU = 500 − 120 = 380 J.', difficulty: 1 },
  { id: 'q-fluid-1', topic: 'fluid-continuity', prompt: 'For steady incompressible flow in a pipe, if area halves, what happens to average velocity?', choices: ['It halves', 'It doubles', 'It stays the same', 'It becomes zero'], answer: 'It doubles', explanation: 'Continuity gives A₁v₁ = A₂v₂. Halving area requires velocity to double for conserved flow rate.', difficulty: 1 },
  { id: 'q-electronics-1', topic: 'circuit-ohms-law', prompt: 'A 1 kΩ resistor has 5 V across it. What current flows?', choices: ['5 A', '50 mA', '5 mA', '0.2 mA'], answer: '5 mA', explanation: 'I = V/R = 5/1000 A = 0.005 A = 5 mA.', difficulty: 1 },
  { id: 'q-embedded-1', topic: 'embedded-sensors', prompt: 'Before connecting a sensor output to a microcontroller input, what should you verify?', choices: ['The project’s logo', 'Voltage and logic-level compatibility', 'The dashboard theme', 'The filename'], answer: 'Voltage and logic-level compatibility', explanation: 'An incompatible voltage can damage an input. Check the sensor data sheet and board limits.', difficulty: 1 },
  { id: 'q-electrical-1', topic: 'ac-power-basics', prompt: 'For a sinusoidal single-phase load, real power is commonly written as…', choices: ['VI cos φ', 'VI sin φ', 'V/R²', 'I + R'], answer: 'VI cos φ', explanation: 'Using RMS voltage and current, real power is P = Vᵣₘₛ Iᵣₘₛ cos φ.', difficulty: 2 },
  { id: 'q-cad-1', topic: 'cad-design-intro', prompt: 'What does a geometric constraint do in a parametric sketch?', choices: ['Defines a relationship such as horizontal or concentric', 'Exports a PDF', 'Changes the material', 'Adds a manufacturing tolerance automatically'], answer: 'Defines a relationship such as horizontal or concentric', explanation: 'Geometric constraints capture relationships; dimensions capture sizes.', difficulty: 1 },
  { id: 'q-civil-1', topic: 'civil-load-path', prompt: 'A structural load path describes…', choices: ['How loads transfer through elements to the ground', 'How a CAD file is exported', 'How concrete is colored', 'A road map for pedestrians'], answer: 'How loads transfer through elements to the ground', explanation: 'Loads pass through connected structural elements to foundations and supporting soil.', difficulty: 1 },
  { id: 'q-ml-1', topic: 'ml-train-test', prompt: 'Which data split should remain untouched until final model evaluation?', choices: ['Training', 'Test', 'Feature', 'Cache'], answer: 'Test', explanation: 'Repeated use of test results influences choices and makes the final estimate optimistic.', difficulty: 2 },
  { id: 'q-chemical-1', topic: 'chemical-mass-balance', prompt: 'At steady state, the accumulation term in a material balance is…', choices: ['Zero', 'Always equal to input', 'Always negative', 'Undefined'], answer: 'Zero', explanation: 'Steady state means quantities within the chosen boundary are not changing with time.', difficulty: 1 },
] as const;

const skillList = [
  ['Python', 'Programming', 'Write and reason about Python programs.'],
  ['JavaScript', 'Programming', 'Build interactive web and server-side features.'],
  ['SQL', 'Data', 'Model and query relational data.'],
  ['Git', 'Tools', 'Track changes and collaborate through version control.'],
  ['API Design', 'Software Engineering', 'Design validated, secure service interfaces.'],
  ['Problem Solving', 'Core Engineering', 'Break problems into testable, systematic steps.'],
  ['IoT', 'Embedded & Systems', 'Connect physical devices, sensors, and software.'],
  ['Embedded Systems', 'Electronics', 'Build software that interacts with constrained hardware.'],
  ['Sensors', 'Electronics', 'Measure physical signals and reason about calibration.'],
  ['Thermodynamics', 'Mechanical', 'Analyze heat, work, and energy conversion.'],
  ['Fluid Mechanics', 'Mechanical', 'Analyze fluids at rest and in motion.'],
  ['Circuit Analysis', 'Electrical & Electronics', 'Analyze voltage, current, and circuit behavior.'],
  ['CAD', 'Mechanical', 'Create constrained parametric engineering models.'],
  ['Structural Analysis', 'Civil', 'Reason about structural systems and load paths.'],
  ['Machine Learning', 'AI & Data', 'Build and evaluate machine-learning systems.'],
  ['Project Planning', 'Engineering Practice', 'Break work into milestones, risks, and tests.'],
] as const;

const resources = [
  ['MDN Web Docs: HTTP', 'Documentation', 'http-rest', 'All levels', 'https://developer.mozilla.org/en-US/docs/Web/HTTP', 'A maintained reference for HTTP concepts, methods, status codes, and headers.'],
  ['PostgreSQL: Joins Between Tables', 'Documentation', 'sql-joins', 'Intermediate', 'https://www.postgresql.org/docs/current/tutorial-join.html', 'Official PostgreSQL tutorial for combining related rows.'],
  ['Python: Defining Functions', 'Documentation', 'python-functions', 'Beginner', 'https://docs.python.org/3/tutorial/controlflow.html#defining-functions', 'Official Python tutorial covering function definitions and control flow.'],
  ['Git: Book', 'Book', 'git-workflow', 'All levels', 'https://git-scm.com/book/en/v2', 'The Pro Git book, published by the Git project.'],
  ['Arduino Documentation', 'Documentation', 'embedded-sensors', 'Beginner', 'https://docs.arduino.cc/', 'Official Arduino documentation and reference material.'],
  ['NASA Glenn: Beginner’s Guide to Aeronautics', 'Learning resource', 'thermodynamics-first-law', 'Beginner', 'https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/', 'NASA educational material for aerospace and fluid/thermal concepts.'],
  ['NIST Engineering Metrology Toolbox', 'Reference', 'circuit-ohms-law', 'All levels', 'https://www.nist.gov/pml/owm/metric-si/si-units', 'Authoritative SI units and measurement references.'],
] as const;

export async function seedDatabase(query: SeedQuery): Promise<void> {
  for (const [id, name, branch, description, icon] of subjects) {
    await query('INSERT INTO subjects (id,name,branch,description,icon) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING', [id, name, branch, description, icon]);
  }
  for (const topic of topics) {
    await query('INSERT INTO topics (id,subject_id,title,slug,summary,level,duration_minutes,content,objectives,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING', [topic.id, topic.subject, topic.title, topic.slug, topic.summary, topic.level, topic.duration, topic.content, JSON.stringify(topic.objectives), topic.order]);
  }
  for (const [id, topic, prompt, choices, answer, explanation, difficulty] of questions.map((q) => [q.id, q.topic, q.prompt, q.choices, q.answer, q.explanation, q.difficulty] as const)) {
    await query('INSERT INTO questions (id,topic_id,prompt,choices,answer,explanation,difficulty) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING', [id, topic, prompt, JSON.stringify(choices), answer, explanation, difficulty]);
  }
  for (const [name, category, description] of skillList) {
    await query('INSERT INTO skills (id,name,category,description) VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING', [`skill-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, name, category, description]);
  }
  for (let i = 0; i < resources.length; i += 1) {
    const [title, kind, slug, difficulty, url, description] = resources[i];
    const topic = await query<{ id: string }>('SELECT id FROM topics WHERE slug=$1', [slug]);
    await query('INSERT INTO resources (id,title,kind,topic_id,difficulty,url,description,is_verified) VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) ON CONFLICT (id) DO NOTHING', [`resource-${i + 1}`, title, kind, topic.rows[0]?.id ?? null, difficulty, url, description]);
  }
  const plans = [
    ['free', 'Free', 0, 25, 3, ['Starter learning library', 'Adaptive practice', '3 active projects', 'Basic skill evidence']],
    ['pro', 'Pro', 14900, 500, null, ['Everything in Free', 'AI learning assistant', 'Unlimited projects', 'AI project planning', 'Resume and portfolio builder']],
    ['career', 'Career', 29900, 1500, null, ['Everything in Pro', 'AI project analyzer', 'Interview simulator', 'Career readiness insights', 'Advanced skill analytics']],
  ] as const;
  for (let i = 0; i < plans.length; i += 1) {
    const [id, name, monthlyPrice, aiLimit, activeLimit, features] = plans[i];
    await query('INSERT INTO plans (id,name,monthly_price_paise,ai_request_limit,active_projects_limit,features,sort_order) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING', [id, name, monthlyPrice, aiLimit, activeLimit, JSON.stringify(features), i]);
  }
}
