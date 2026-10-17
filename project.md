# PROJECT: ProctorVision — Privacy-First AI Exam Proctoring Platform (Hackathon MVP)

You are building a hackathon prototype. We have approximately 3 hours total and 2 developers, so prioritize a WORKING END-TO-END DEMO over completeness. Keep the code simple, readable, and runnable locally. DO NOT do deployment, Docker, or CI work. We will handle deployment at the end.

## THE IDEA

ProctorVision is a privacy-first online examination platform that helps teachers review potentially suspicious exam activity without watching hours of video.

Traditional online proctoring systems may upload continuous video to remote servers, raising privacy concerns. Automated systems can also flag innocent students for normal behavior, such as looking down to write notes or adjusting their seating position.

ProctorVision processes camera frames locally in the student's browser. The backend stores exam attempts, timestamps, detection events, risk scores, and teacher review decisions rather than continuous video.

The system assists teachers; it does NOT automatically determine that a student has cheated.

## CORE LOOP

Teacher creates an exam → student reads the privacy notice and consents to camera monitoring → student starts the timed exam → browser performs local face/head-pose and phone detection → rules generate timestamped events → backend records events and calculates an explainable session risk score → teacher reviews the event timeline → teacher marks events as valid or false alarms → dashboard updates risk summaries and detection statistics.

The student must be informed when camera monitoring is active. If consent is declined, the application must not start camera monitoring. Provide a clear way to stop monitoring and submit or exit the attempt.

For the demo, use a small set of sample multiple-choice questions and a short timer. The focus is the proctoring workflow, not building a full learning management system.

## TECH STACK (FIXED)

- Backend: Node.js + Express + Mongoose
- Database: MongoDB using a connection string in `.env`
- Frontend: React + Vite + React Router
- Styling: Tailwind CSS if already configured; otherwise plain CSS
- Camera processing: MediaPipe Face Landmarker running in the browser
- Phone detection: TensorFlow.js with a compatible pretrained COCO-SSD model, running in the browser
- Tab-switch detection: Browser Page Visibility API
- Charts: Recharts, only if time permits
- Authentication: JWT with teacher and student roles
- Password hashing: bcryptjs
- HTTP client: Axios
- Live updates: Polling every 5 seconds; NO WebSockets for the MVP
- File uploads: Multer only if needed for explicitly consented, minimal event snapshots

Use the existing compatible versions of libraries rather than upgrading the entire toolchain. Keep model processing on the client. Do not send camera streams or continuous video to the backend.

## EXPLICITLY OUT OF SCOPE

Do NOT build:

- Production-grade remote proctoring or a complete examination management system
- Continuous video recording or server-side video streaming
- Facial recognition or identity verification using biometric identity matching
- Emotion, attention, gaze-intent, or dishonesty detection
- Automatic cheating verdicts, automatic punishment, or automatic exam termination
- A custom AI model trained from scratch
- Multi-institution administration or complex organization management
- Real email/SMS notifications
- Payment systems
- Advanced anti-tampering or invasive device monitoring
- Docker, deployment configuration, CI/CD, or cloud infrastructure
- A complex real-time architecture with WebSockets or message queues

Important: A face turning away, a phone detection, or a tab switch is only a REVIEW EVENT. It is not proof of misconduct.

## PRIVACY AND FAIRNESS REQUIREMENTS

- Request camera permission only after the student understands the monitoring purpose and consents.
- Show a visible camera/monitoring indicator during the attempt.
- Process video frames in the browser; never upload raw video.
- Prefer storing event metadata without images. If snapshots are implemented, capture only a small, necessary frame for a specific event, inform the student beforehand, and use a short retention period.
- Provide a way for teachers to review and dismiss false alarms.
- Do not interpret looking down briefly, blinking, glasses, or normal head movement as proof of cheating.
- Use a configurable duration threshold for head-pose events.
- If the camera is unavailable or detection fails, show a technical warning rather than automatically marking the student suspicious.
- Do not use the risk score as an automatic decision of guilt.
- Clearly label the risk score as a review-priority indicator.
- Never expose passwords, JWT secrets, or private exam data to unauthorized users.

## DATA MODEL (MONGOOSE)

### 1. User

Fields:
- name: String
- email: String, unique and lowercase
- passwordHash: String
- role: enum `TEACHER | STUDENT`
- createdAt: Date

For the hackathon, seed a demo teacher and student account instead of building an elaborate registration flow.

### 2. Exam

Fields:
- title: String
- description: String
- questions: array of `{ question, options, correctAnswer }`
- durationSeconds: Number
- createdBy: ObjectId reference to User
- status: enum `DRAFT | PUBLISHED | CLOSED`
- createdAt: Date

For the MVP, use a small set of multiple-choice questions. Keep answer keys available only to authorized server-side routes; never return correct answers to students before submission.

### 3. Attempt

Fields:
- exam: ObjectId reference to Exam
- student: ObjectId reference to User
- status: enum `IN_PROGRESS | SUBMITTED | EXPIRED`
- startedAt: Date
- deadlineAt: Date
- submittedAt: Date, optional
- riskScore: Number, default 0
- riskLevel: enum `LOW | MEDIUM | HIGH`, default `LOW`
- eventCount: Number, default 0

The backend must determine the exam deadline. Do not trust the student's browser clock for remaining time or submission deadlines.

### 4. ProctorEvent

Fields:
- attempt: ObjectId reference to Attempt
- type: enum `NO_FACE | MULTIPLE_FACES | HEAD_TURN | PHONE_DETECTED | TAB_HIDDEN | CAMERA_UNAVAILABLE`
- timestamp: Date
- durationMs: Number, optional
- confidence: Number, optional
- severity: enum `LOW | MEDIUM | HIGH`
- explanation: String
- reviewStatus: enum `PENDING | VALID_ACTIVITY | FALSE_ALARM`
- createdAt: Date

Do not store full video. Avoid storing snapshots in the initial MVP. If snapshots are added, store only explicitly consented event snapshots, protect their access, and expire them after a defined short retention period.

### 5. ReviewDecision

Fields:
- event: ObjectId reference to ProctorEvent
- attempt: ObjectId reference to Attempt
- reviewer: ObjectId reference to User
- decision: enum `VALID_ACTIVITY | FALSE_ALARM`
- note: String, optional
- createdAt: Date

This collection provides an audit trail of teacher decisions.

## RISK SCORING

Implement a simple, documented, explainable scoring formula. Do not use an opaque AI-generated score.

Suggested initial weights:

- No face for a sustained interval: +10
- Multiple faces detected persistently: +15
- Sustained head turn beyond a configurable threshold: +5
- Phone detected with sufficient confidence in repeated frames: +15
- Exam tab hidden: +10 per recorded occurrence, with reasonable caps

Use configurable cooldowns and thresholds to prevent the same continuous event from generating dozens of duplicate records.

Suggested score bands:
- 0–19: LOW review priority
- 20–39: MEDIUM review priority
- 40+: HIGH review priority

These values are demonstration heuristics, not scientifically validated cheating probabilities. Display the reasons contributing to the score. Recalculate the score when events are added or a teacher marks an event as a false alarm. Keep scores capped at 100.

## AI DETECTION RULES

### Face detection
Use MediaPipe Face Landmarker in the browser.

- Detect whether a face is present.
- Treat multiple detected faces as a potential event only when detection is sufficiently stable.
- Apply a short grace period when a face disappears.
- Do not identify the person or perform facial recognition.

### Head-pose monitoring
Use face landmarks to estimate head orientation.

- Detect sustained head turns using configurable thresholds.
- Require a duration threshold before creating an event.
- Apply a cooldown to prevent repeated events during the same movement.
- Do not classify every downward glance as suspicious.

### Phone detection
Use a pretrained COCO-SSD-compatible TensorFlow.js model if it runs reliably in the available browser.

- Detect the `cell phone` class.
- Require a minimum confidence threshold.
- Prefer repeated detections across multiple frames to reduce false alarms.
- Do not upload frames to the server.

If the model is too slow on available laptops, disable phone detection gracefully and display its unavailable status. Do not replace real detection with fake live AI results.

### Tab switching
Use the Page Visibility API.

- Detect when the exam tab becomes hidden.
- Record a timestamped event.
- Avoid duplicate events for the same hidden interval.
- Explain that switching tabs can have legitimate causes and requires human review.

### Technical failures
If camera permission is denied, the device has no camera, or a model fails to load, show an understandable error and allow the student to exit or follow the teacher's published alternative procedure. Do not silently convert technical failures into misconduct events.

## API CONTRACT

Use JSON responses consistently. Protect private routes with JWT authentication and role authorization.

### Authentication

- `POST /api/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ token, user: { id, name, email, role } }`

- `GET /api/auth/me`
  - Returns the authenticated user.

### Teacher — exams

- `POST /api/exams`
  - Teacher only.
  - Body: `{ title, description, questions, durationSeconds }`
  - Creates a draft exam.

- `GET /api/exams`
  - Teacher sees their exams.
  - Student sees only published exams available to them.

- `GET /api/exams/:id`
  - Returns exam details authorized for the requesting role.
  - Never expose correct answers to a student.

- `PATCH /api/exams/:id/publish`
  - Teacher only.
  - Publishes the exam.

### Student — attempts

- `POST /api/attempts`
  - Student only.
  - Body: `{ examId, cameraConsent }`
  - Requires explicit camera consent for monitored attempts.
  - Creates an attempt and returns `{ attempt, exam, serverTime }`.
  - The returned exam must not include correct answers.

- `GET /api/attempts/:id`
  - Student can access only their own attempt.
  - Teacher can access attempts for exams they own.

- `POST /api/attempts/:id/submit`
  - Student only, for their own active attempt.
  - Body: `{ answers }`
  - Server enforces the deadline and records submission.

### Browser-generated events

- `POST /api/attempts/:id/events`
  - Student only, for their own active attempt.
  - Body: `{ events: [{ type, timestamp, durationMs?, confidence?, explanation? }] }`
  - Validate allowed event types and field ranges.
  - Apply server-side limits to event frequency and batch size.
  - Do not accept a client-provided risk score or arbitrary severity as authoritative.
  - Recalculate the risk score on the server.

- `GET /api/attempts/:id/events`
  - Authorized teacher or attempt-owning student.
  - Returns the event timeline with appropriate access controls.

### Teacher — review dashboard

- `GET /api/teacher/dashboard`
  - Teacher only.
  - Returns `{ exams, activeAttempts, recentEvents, riskSummary }`.

- `GET /api/teacher/attempts/:id/review`
  - Teacher only, for an exam they own.
  - Returns attempt details, score, risk level, events and review decisions.

- `PATCH /api/teacher/events/:id/review`
  - Teacher only.
  - Body: `{ decision, note? }`
  - `decision` must be `VALID_ACTIVITY` or `FALSE_ALARM`.
  - Stores the review decision, updates the event, and recalculates the attempt's score.

### Detection statistics

- `GET /api/teacher/detection-stats`
  - Teacher only.
  - Returns counts grouped by event type, total events, false alarms, pending reviews and review outcomes.

All teacher endpoints must verify exam ownership. Students must never be able to view another student's attempt or event history.

## BUILD ORDER

Build ONE chunk at a time. After each chunk, explain how to run and test it, then STOP. I will tell you which chunk to build next.

### CHUNK 0: FOUNDATION (BUILD THIS FIRST)

- Inspect the existing repository before changing files.
- Create `/server` and `/client` if they do not exist.
- Set up Express, CORS, dotenv, Mongoose connection, JSON parsing and centralized error handling.
- Set up React with Vite and React Router.
- Create `src/api.js` with one function per endpoint and a base URL from `VITE_API_URL`.
- Create Mongoose models for User, Exam, Attempt, ProctorEvent and ReviewDecision.
- Add JWT authentication middleware and teacher/student role authorization.
- Add request validation for critical endpoints.
- Create a seed script with demo teacher, demo student, one published exam and sample review events.
- Make all API routes exist with the correct response shapes; use minimal functional stubs where later chunks are responsible for the actual behavior.
- Write `CONTRACT.md` containing example JSON for every endpoint.
- Add npm scripts for starting the server, starting the client and seeding the database.

Do not implement the AI camera processing in this chunk.

### CHUNK 1: AUTHENTICATION AND EXAM MANAGEMENT

- Implement login with bcryptjs password verification and JWT issuance.
- Seed demo accounts and print their credentials in the local development instructions.
- Implement teacher exam creation, listing, editing if time permits, and publishing.
- Implement role-based route protection.
- Ensure correct answers are never returned in student-facing exam responses.
- Create basic teacher and student landing pages.

### CHUNK 2: STUDENT EXAM EXPERIENCE

- Build the student exam page.
- Show exam instructions, duration, monitoring requirements and privacy notice.
- Require explicit camera consent before requesting camera access.
- Add a visible monitoring status indicator.
- Display multiple-choice questions and answer selections.
- Start the attempt through the backend and use the server-issued deadline.
- Show the countdown based on the server deadline.
- Submit answers to the server when the student finishes or the deadline expires.
- Handle refreshes, expired attempts, camera errors and network failures gracefully.

### CHUNK 3: IN-BROWSER AI DETECTION

- Initialize MediaPipe Face Landmarker in the browser.
- Use face landmarks to estimate face presence, multiple-face status where supported, and head orientation.
- Initialize TensorFlow.js phone detection only if the pretrained model works on the available devices.
- Implement Page Visibility API monitoring.
- Keep all camera frame processing on the client.
- Add configurable confidence, duration and cooldown thresholds.
- Batch event metadata to the backend instead of sending a request on every frame.
- Provide clear status indicators for each detector.
- Handle slow model loading and failed camera/model initialization.
- Never fabricate successful detections when a model is unavailable.

### CHUNK 4: EVENT RECORDING AND RISK SCORING

- Implement the event ingestion endpoint.
- Validate event types, timestamps, confidence values and request size.
- Limit event frequency and duplicate records.
- Recalculate scores on the server using documented event weights.
- Cap the risk score at 100.
- Update the Attempt event count and risk level.
- Return the stored events and explainable risk summary.
- Keep client-provided risk scores and severity values untrusted.
- Ensure false-alarm reviews can lower the score.

### CHUNK 5: TEACHER REVIEW DASHBOARD

- Build `/teacher` for the teacher overview.
- Build `/teacher/attempts/:id` for individual attempt reviews.
- Show active attempts, event counts, risk bands and pending reviews.
- Display a timeline with event type, timestamp, confidence when available, duration and explanation.
- Provide `Valid activity` and `False alarm` actions with an optional note.
- Recalculate the score after every review decision.
- Show a breakdown of what contributed to the score.
- Poll dashboard data every 5 seconds while the page is active.
- Clearly distinguish model detections from teacher decisions.

### CHUNK 6: DETECTION TUNING AND SUMMARY

- Build a simple teacher-only detection statistics screen.
- Show counts by detection type and review status.
- Calculate the false-alarm rate using reviewed events only; clearly show the denominator.
- Allow adjustment of a small number of detection thresholds, such as sustained head-turn duration and phone confidence.
- Use the same threshold configuration in the browser detector.
- If persistent settings are too time-consuming, use a clearly labelled local development configuration.
- Use Recharts only if it improves clarity and is quick to implement.
- Do not claim that adjusting thresholds proves better real-world accuracy without a labelled test set.

### CHUNK 7: FINAL END-TO-END DEMO AND HARDENING

- Seed a ready-to-run demo exam.
- Test the complete flow: teacher login → publish exam → student login → consent → exam → detection events → submission → teacher review.
- Add a demo option for reviewing clearly labelled prerecorded/sample events if camera hardware or AI models are unavailable. Do not present sample events as live detections.
- Test student/teacher permissions.
- Test expired attempts and server-enforced deadlines.
- Confirm raw camera video is never sent to the backend.
- Confirm students cannot review other students' data.
- Add understandable loading, empty, error and unavailable-model states.
- Document known limitations in `README.md`.

## GENERAL RULES

- Keep the MVP small enough for two developers and approximately three hours.
- Build a functional vertical slice before adding optional AI features.
- Prefer one working detector plus the complete review workflow over several unreliable detectors.
- Keep names, routes, models and response fields consistent with `CONTRACT.md`.
- Avoid unnecessary abstractions and large dependency additions.
- Keep code readable and add comments only for non-obvious logic.
- Never hardcode secrets in source code.
- Never expose correct answers, JWT secrets, passwords or unauthorized student records.
- Every asynchronous model initialization and database/API operation must handle errors.
- If a feature cannot be completed, disable it gracefully and document the limitation instead of pretending it works.
- Do not let AI detections automatically accuse or penalize a student.
- After every chunk, tell me:
  1. Files created or modified.
  2. Commands to run.
  3. Quick tests to perform.
  4. Required `.env` variables.
  5. Known limitations and the next chunk.

## REQUIRED ENVIRONMENT VARIABLES

Server `.env`:

- `PORT=5000`
- `MONGO_URI=your_mongodb_connection_string`
- `JWT_SECRET=your_long_random_secret`
- `CLIENT_URL=http://localhost:5173`
- `JWT_EXPIRES_IN=1d`

Client `.env`:

- `VITE_API_URL=http://localhost:5000/api`

Use separate environment files for the server and client. Only expose non-secret variables with the `VITE_` prefix to the browser.

## FIRST ACTION

Start with CHUNK 0 only.

First inspect the current workspace and repository. If code already exists, preserve useful working files rather than replacing everything blindly.

Then scaffold the foundation, models, middleware, endpoint stubs, seed script and `CONTRACT.md`.

Do not start CHUNK 1 or later until I explicitly say to continue.

The priority is a reliable local demo that judges can understand in minutes: privacy-first monitoring, explainable events, human review and visible false-alarm handling.
