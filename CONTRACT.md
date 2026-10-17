# ProctorVision API Contract

This document provides exact JSON request and response contracts for all endpoints in the ProctorVision platform.

Base URL: `http://localhost:5000/api`

---

## 1. System Health

### `GET /api/health`
Check if the API server is alive.

- **Auth Required**: None
- **Response `200 OK`**:
```json
{
  "status": "ok",
  "service": "ProctorVision API",
  "timestamp": "2026-10-17T12:00:00.000Z"
}
```

---

## 2. Authentication

### `POST /api/auth/login`
Authenticates a teacher or student and issues a JWT token.

- **Auth Required**: None
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "teacher@proctorvision.local",
  "password": "teacher123"
}
```
- **Response `200 OK`**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "6710ea12b598d1a1c8901234",
    "name": "Dr. Sarah Connor (Demo Teacher)",
    "email": "teacher@proctorvision.local",
    "role": "TEACHER"
  }
}
```
- **Response `401 Unauthorized`**:
```json
{
  "error": "Invalid email or password"
}
```

---

### `GET /api/auth/me`
Returns current authenticated user details.

- **Auth Required**: `Bearer <token>`
- **Response `200 OK`**:
```json
{
  "user": {
    "id": "6710ea12b598d1a1c8901234",
    "name": "Dr. Sarah Connor (Demo Teacher)",
    "email": "teacher@proctorvision.local",
    "role": "TEACHER"
  }
}
```

---

## 3. Exams (Teacher & Student)

### `POST /api/exams`
Teacher creates a new exam in `DRAFT` status.

- **Auth Required**: `Bearer <teacher_token>` (Teacher only)
- **Request Body**:
```json
{
  "title": "CS 101: Fundamentals of Privacy & Computer Architecture",
  "description": "A 10-minute assessment testing edge AI proctoring.",
  "durationSeconds": 600,
  "questions": [
    {
      "question": "What is the primary benefit of client-side edge AI processing?",
      "options": [
        "Raw video frames are never stored or transmitted to remote servers",
        "It eliminates all testing",
        "It guarantees 100% automated cheating detection",
        "Zero memory usage"
      ],
      "correctAnswer": 0
    }
  ]
}
```
- **Response `201 Created`**:
```json
{
  "exam": {
    "_id": "6710ea12b598d1a1c8905678",
    "title": "CS 101: Fundamentals of Privacy & Computer Architecture",
    "description": "A 10-minute assessment testing edge AI proctoring.",
    "durationSeconds": 600,
    "questions": [
      {
        "_id": "6710ea12b598d1a1c8905679",
        "question": "What is the primary benefit of client-side edge AI processing?",
        "options": [
          "Raw video frames are never stored or transmitted to remote servers",
          "It eliminates all testing",
          "It guarantees 100% automated cheating detection",
          "Zero memory usage"
        ],
        "correctAnswer": 0
      }
    ],
    "createdBy": "6710ea12b598d1a1c8901234",
    "status": "DRAFT",
    "createdAt": "2026-10-17T12:00:00.000Z"
  }
}
```

---

### `GET /api/exams`
Lists exams. If requester is a Teacher, returns teacher's created exams. If Student, returns published exams with `correctAnswer` omitted.

- **Auth Required**: `Bearer <token>`
- **Response for Teacher `200 OK`**:
```json
{
  "exams": [
    {
      "_id": "6710ea12b598d1a1c8905678",
      "title": "CS 101: Fundamentals of Privacy & Computer Architecture",
      "description": "A 10-minute assessment testing edge AI proctoring.",
      "durationSeconds": 600,
      "status": "PUBLISHED",
      "createdAt": "2026-10-17T12:00:00.000Z"
    }
  ]
}
```
- **Response for Student `200 OK`** (No `correctAnswer` exposed):
```json
{
  "exams": [
    {
      "_id": "6710ea12b598d1a1c8905678",
      "title": "CS 101: Fundamentals of Privacy & Computer Architecture",
      "description": "A 10-minute assessment testing edge AI proctoring.",
      "durationSeconds": 600,
      "questions": [
        {
          "_id": "6710ea12b598d1a1c8905679",
          "question": "What is the primary benefit of client-side edge AI processing?",
          "options": [
            "Raw video frames are never stored or transmitted to remote servers",
            "It eliminates all testing",
            "It guarantees 100% automated cheating detection",
            "Zero memory usage"
          ]
        }
      ],
      "status": "PUBLISHED",
      "createdAt": "2026-10-17T12:00:00.000Z"
    }
  ]
}
```

---

### `GET /api/exams/:id`
Retrieves a single exam. Enforces role security: students only see published exams and never see answers.

- **Auth Required**: `Bearer <token>`
- **Response `200 OK`**:
```json
{
  "exam": {
    "_id": "6710ea12b598d1a1c8905678",
    "title": "CS 101: Fundamentals of Privacy & Computer Architecture",
    "description": "A 10-minute assessment testing edge AI proctoring.",
    "durationSeconds": 600,
    "questions": [
      {
        "_id": "6710ea12b598d1a1c8905679",
        "question": "What is the primary benefit of client-side edge AI processing?",
        "options": [
          "Raw video frames are never stored or transmitted to remote servers",
          "It eliminates all testing",
          "It guarantees 100% automated cheating detection",
          "Zero memory usage"
        ]
      }
    ],
    "status": "PUBLISHED",
    "createdAt": "2026-10-17T12:00:00.000Z"
  }
}
```

---

### `PATCH /api/exams/:id/publish`
Teacher publishes an exam so students can begin taking attempts.

- **Auth Required**: `Bearer <teacher_token>` (Teacher only, must own exam)
- **Response `200 OK`**:
```json
{
  "message": "Exam successfully published",
  "exam": {
    "_id": "6710ea12b598d1a1c8905678",
    "status": "PUBLISHED"
  }
}
```

---

## 4. Student Attempts

### `POST /api/attempts`
Student starts an exam attempt. Explicit camera consent is mandatory. Server assigns official countdown deadline.

- **Auth Required**: `Bearer <student_token>` (Student only)
- **Request Body**:
```json
{
  "examId": "6710ea12b598d1a1c8905678",
  "cameraConsent": true
}
```
- **Response `201 Created`**:
```json
{
  "attempt": {
    "_id": "6710ea12b598d1a1c8909999",
    "exam": "6710ea12b598d1a1c8905678",
    "student": "6710ea12b598d1a1c8901235",
    "status": "IN_PROGRESS",
    "startedAt": "2026-10-17T12:05:00.000Z",
    "deadlineAt": "2026-10-17T12:15:00.000Z",
    "riskScore": 0,
    "riskLevel": "LOW",
    "eventCount": 0
  },
  "exam": {
    "_id": "6710ea12b598d1a1c8905678",
    "title": "CS 101: Fundamentals of Privacy & Computer Architecture",
    "durationSeconds": 600,
    "questions": [
      {
        "_id": "6710ea12b598d1a1c8905679",
        "question": "What is the primary benefit of client-side edge AI processing?",
        "options": [
          "Raw video frames are never stored or transmitted to remote servers",
          "It eliminates all testing",
          "It guarantees 100% automated cheating detection",
          "Zero memory usage"
        ]
      }
    ]
  },
  "serverTime": "2026-10-17T12:05:00.000Z"
}
```

---

### `GET /api/attempts/:id`
Retrieves an attempt. Only the student who owns it or the teacher who created the exam can access.

- **Auth Required**: `Bearer <token>`
- **Response `200 OK`**:
```json
{
  "attempt": {
    "_id": "6710ea12b598d1a1c8909999",
    "exam": "6710ea12b598d1a1c8905678",
    "student": "6710ea12b598d1a1c8901235",
    "status": "IN_PROGRESS",
    "startedAt": "2026-10-17T12:05:00.000Z",
    "deadlineAt": "2026-10-17T12:15:00.000Z",
    "riskScore": 10,
    "riskLevel": "LOW",
    "eventCount": 1
  },
  "exam": {
    "_id": "6710ea12b598d1a1c8905678",
    "title": "CS 101: Fundamentals of Privacy & Computer Architecture"
  }
}
```

---

### `POST /api/attempts/:id/submit`
Student submits finished answers before or at the deadline.

- **Auth Required**: `Bearer <student_token>`
- **Request Body**:
```json
{
  "answers": {
    "6710ea12b598d1a1c8905679": 0
  }
}
```
- **Response `200 OK`**:
```json
{
  "message": "Exam submitted successfully",
  "attempt": {
    "_id": "6710ea12b598d1a1c8909999",
    "status": "SUBMITTED",
    "submittedAt": "2026-10-17T12:14:30.000Z",
    "riskScore": 10,
    "riskLevel": "LOW"
  }
}
```

---

## 5. Browser-Generated Proctoring Events

### `POST /api/attempts/:id/events`
Student's browser posts a batch of metadata detection events. Backend validates types, calculates risk score, and updates attempt.

- **Auth Required**: `Bearer <student_token>` (Active attempt owner)
- **Request Body**:
```json
{
  "events": [
    {
      "type": "TAB_HIDDEN",
      "timestamp": "2026-10-17T12:07:30.000Z",
      "durationMs": 3500,
      "explanation": "Exam tab hidden for 3.5 seconds"
    },
    {
      "type": "HEAD_TURN",
      "timestamp": "2026-10-17T12:09:15.000Z",
      "durationMs": 4100,
      "confidence": 0.92,
      "explanation": "Head turned left beyond threshold for 4.1 seconds"
    }
  ]
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "count": 2,
  "riskScore": 15,
  "riskLevel": "LOW"
}
```

---

### `GET /api/attempts/:id/events`
Fetches all recorded events for an attempt in chronological order.

- **Auth Required**: `Bearer <token>` (Student owner or Teacher owner)
- **Response `200 OK`**:
```json
{
  "events": [
    {
      "_id": "6710ea12b598d1a1c8907771",
      "attempt": "6710ea12b598d1a1c8909999",
      "type": "TAB_HIDDEN",
      "timestamp": "2026-10-17T12:07:30.000Z",
      "durationMs": 3500,
      "severity": "MEDIUM",
      "explanation": "Exam tab hidden for 3.5 seconds",
      "reviewStatus": "PENDING",
      "createdAt": "2026-10-17T12:07:31.000Z"
    }
  ]
}
```

---

## 6. Teacher Review Dashboard & Decisions

### `GET /api/teacher/dashboard`
Returns live overview of active attempts, exams, recent review events, and risk distribution.

- **Auth Required**: `Bearer <teacher_token>` (Teacher only)
- **Response `200 OK`**:
```json
{
  "exams": [
    {
      "_id": "6710ea12b598d1a1c8905678",
      "title": "CS 101: Fundamentals of Privacy & Computer Architecture",
      "status": "PUBLISHED"
    }
  ],
  "activeAttempts": [
    {
      "_id": "6710ea12b598d1a1c8909999",
      "student": {
        "_id": "6710ea12b598d1a1c8901235",
        "name": "Alex Rivera (Demo Student)",
        "email": "student@proctorvision.local"
      },
      "exam": {
        "_id": "6710ea12b598d1a1c8905678",
        "title": "CS 101: Fundamentals of Privacy & Computer Architecture",
        "durationSeconds": 600
      },
      "riskScore": 25,
      "riskLevel": "MEDIUM",
      "startedAt": "2026-10-17T12:05:00.000Z",
      "deadlineAt": "2026-10-17T12:15:00.000Z"
    }
  ],
  "recentEvents": [
    {
      "_id": "6710ea12b598d1a1c8907771",
      "type": "TAB_HIDDEN",
      "severity": "MEDIUM",
      "timestamp": "2026-10-17T12:07:30.000Z",
      "reviewStatus": "PENDING"
    }
  ],
  "riskSummary": {
    "totalAttempts": 1,
    "low": 0,
    "medium": 1,
    "high": 0
  }
}
```

---

### `GET /api/teacher/attempts/:id/review`
Fetches complete forensic timeline, risk breakdown, and teacher review audit trail for a single student attempt.

- **Auth Required**: `Bearer <teacher_token>` (Must own exam)
- **Response `200 OK`**:
```json
{
  "attempt": {
    "_id": "6710ea12b598d1a1c8909999",
    "student": {
      "_id": "6710ea12b598d1a1c8901235",
      "name": "Alex Rivera (Demo Student)",
      "email": "student@proctorvision.local"
    },
    "riskScore": 25,
    "riskLevel": "MEDIUM",
    "status": "IN_PROGRESS"
  },
  "events": [
    {
      "_id": "6710ea12b598d1a1c8907771",
      "type": "TAB_HIDDEN",
      "timestamp": "2026-10-17T12:07:30.000Z",
      "durationMs": 3500,
      "severity": "MEDIUM",
      "explanation": "Exam tab hidden for 3.5 seconds",
      "reviewStatus": "PENDING"
    }
  ],
  "reviewDecisions": [],
  "riskDetails": {
    "riskScore": 25,
    "riskLevel": "MEDIUM",
    "breakdown": [
      {
        "type": "TAB_HIDDEN",
        "count": 1,
        "weight": 10,
        "points": 10
      },
      {
        "type": "PHONE_DETECTED",
        "count": 1,
        "weight": 15,
        "points": 15
      }
    ]
  }
}
```

---

### `PATCH /api/teacher/events/:id/review`
Teacher marks an event as `VALID_ACTIVITY` or `FALSE_ALARM`. Marking an event as `FALSE_ALARM` removes its weight and recalculates the student's risk score.

- **Auth Required**: `Bearer <teacher_token>` (Must own exam)
- **Request Body**:
```json
{
  "decision": "FALSE_ALARM",
  "note": "Student looked down to write on rough calculation paper"
}
```
- **Response `200 OK`**:
```json
{
  "message": "Review decision recorded and risk score updated",
  "reviewDecision": {
    "_id": "6710ea12b598d1a1c8908888",
    "event": "6710ea12b598d1a1c8907771",
    "attempt": "6710ea12b598d1a1c8909999",
    "reviewer": "6710ea12b598d1a1c8901234",
    "decision": "FALSE_ALARM",
    "note": "Student looked down to write on rough calculation paper",
    "createdAt": "2026-10-17T12:20:00.000Z"
  },
  "event": {
    "_id": "6710ea12b598d1a1c8907771",
    "reviewStatus": "FALSE_ALARM"
  },
  "attempt": {
    "id": "6710ea12b598d1a1c8909999",
    "riskScore": 15,
    "riskLevel": "LOW"
  }
}
```

---

### `GET /api/teacher/detection-stats`
Aggregated false alarm rates and event counts per detection type.

- **Auth Required**: `Bearer <teacher_token>` (Teacher only)
- **Response `200 OK`**:
```json
{
  "stats": {
    "totalEvents": 4,
    "falseAlarms": 1,
    "validActivities": 1,
    "pendingReviews": 2,
    "reviewedCount": 2,
    "falseAlarmRate": 0.5,
    "byType": {
      "NO_FACE": { "total": 1, "pending": 1, "valid": 0, "falseAlarm": 0 },
      "MULTIPLE_FACES": { "total": 0, "pending": 0, "valid": 0, "falseAlarm": 0 },
      "HEAD_TURN": { "total": 1, "pending": 0, "valid": 0, "falseAlarm": 1 },
      "PHONE_DETECTED": { "total": 1, "pending": 1, "valid": 0, "falseAlarm": 0 },
      "TAB_HIDDEN": { "total": 1, "pending": 0, "valid": 1, "falseAlarm": 0 },
      "CAMERA_UNAVAILABLE": { "total": 0, "pending": 0, "valid": 0, "falseAlarm": 0 }
    }
  }
}
```
