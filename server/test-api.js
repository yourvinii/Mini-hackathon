import { connectDB } from './src/config/db.js';
import app from './src/app.js';
import mongoose from 'mongoose';

const runTests = async () => {
  console.log('\n🧪 [Test Suite] Starting ProctorVision Chunk 0 Verification...\n');
  await connectDB();

  const server = app.listen(5099, async () => {
    const baseUrl = 'http://localhost:5099/api';

    try {
      // 1. Health
      console.log('1. Testing GET /api/health...');
      const healthRes = await fetch(`${baseUrl}/health`);
      const healthJson = await healthRes.json();
      if (healthRes.status !== 200 || healthJson.status !== 'ok') {
        throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
      }
      console.log('   ✓ Health check passed');

      // 2. Teacher Login
      console.log('2. Testing POST /api/auth/login (Teacher)...');
      const teacherLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'teacher@proctorvision.local',
          password: 'teacher123',
        }),
      });
      const teacherLoginJson = await teacherLoginRes.json();
      if (teacherLoginRes.status !== 200 || !teacherLoginJson.token) {
        throw new Error(`Teacher login failed: ${JSON.stringify(teacherLoginJson)}`);
      }
      const teacherToken = teacherLoginJson.token;
      console.log('   ✓ Teacher login passed (Token received)');

      // 3. Student Login
      console.log('3. Testing POST /api/auth/login (Student)...');
      const studentLoginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'student@proctorvision.local',
          password: 'student123',
        }),
      });
      const studentLoginJson = await studentLoginRes.json();
      if (studentLoginRes.status !== 200 || !studentLoginJson.token) {
        throw new Error(`Student login failed: ${JSON.stringify(studentLoginJson)}`);
      }
      const studentToken = studentLoginJson.token;
      console.log('   ✓ Student login passed (Token received)');

      // 4. GET /api/auth/me
      console.log('4. Testing GET /api/auth/me...');
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const meJson = await meRes.json();
      if (meRes.status !== 200 || meJson.user.role !== 'TEACHER') {
        throw new Error(`Auth me check failed: ${JSON.stringify(meJson)}`);
      }
      console.log('   ✓ Authenticated user profile check passed');

      // 5. GET /api/exams for Student (Check that answers are never leaked)
      console.log('5. Testing GET /api/exams as Student (answer masking security)...');
      const examsStudentRes = await fetch(`${baseUrl}/exams`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const examsStudentJson = await examsStudentRes.json();
      if (examsStudentRes.status !== 200 || !Array.isArray(examsStudentJson.exams)) {
        throw new Error(`Student exams retrieval failed: ${JSON.stringify(examsStudentJson)}`);
      }
      // Verify correctAnswer is NOT present in any question for student
      for (const ex of examsStudentJson.exams) {
        if (ex.questions) {
          for (const q of ex.questions) {
            if (q.correctAnswer !== undefined) {
              throw new Error(`CRITICAL SECURITY FAILURE: correctAnswer leaked to student!`);
            }
          }
        }
      }
      console.log('   ✓ Answer key safely masked from student responses');

      // 6. GET /api/teacher/dashboard
      console.log('6. Testing GET /api/teacher/dashboard...');
      const dashRes = await fetch(`${baseUrl}/teacher/dashboard`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const dashJson = await dashRes.json();
      if (dashRes.status !== 200 || !dashJson.exams || !dashJson.riskSummary) {
        throw new Error(`Teacher dashboard retrieval failed: ${JSON.stringify(dashJson)}`);
      }
      console.log(`   ✓ Teacher dashboard passed (Attempts: ${dashJson.riskSummary.totalAttempts})`);

      // 7. GET /api/teacher/detection-stats
      console.log('7. Testing GET /api/teacher/detection-stats...');
      const statsRes = await fetch(`${baseUrl}/teacher/detection-stats`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const statsJson = await statsRes.json();
      if (statsRes.status !== 200 || !statsJson.stats) {
        throw new Error(`Detection stats retrieval failed: ${JSON.stringify(statsJson)}`);
      }
      console.log(`   ✓ Detection stats passed (Total Events: ${statsJson.stats.totalEvents})`);

      // 8. Role Enforcement: Student cannot access teacher dashboard
      console.log('8. Testing Role Security: Student accessing /teacher/dashboard (Expect 403)...');
      const forbiddenRes = await fetch(`${baseUrl}/teacher/dashboard`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      if (forbiddenRes.status !== 403) {
        throw new Error(`Role enforcement failed: Expected 403, got ${forbiddenRes.status}`);
      }
      console.log('   ✓ Role enforcement correctly returned 403 Forbidden for Student');

      // 9. Student Starts Attempt / Resumes Attempt
      console.log('9. Testing POST /api/attempts (Student start attempt)...');
      const publishedExam = examsStudentJson.exams[0];
      const attemptRes = await fetch(`${baseUrl}/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          examId: publishedExam._id,
          cameraConsent: true,
        }),
      });
      const attemptJson = await attemptRes.json();
      if (attemptRes.status !== 200 && attemptRes.status !== 201) {
        throw new Error(`Attempt creation failed: ${JSON.stringify(attemptJson)}`);
      }
      const attemptId = attemptJson.attempt._id;
      console.log(`   ✓ Attempt started/resumed successfully (ID: ${attemptId})`);

      // 10. Student Ingests Batch of Detection Events
      console.log('10. Testing POST /api/attempts/:id/events (Ingest batch & calculate risk)...');
      const eventsRes = await fetch(`${baseUrl}/attempts/${attemptId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({
          events: [
            {
              type: 'PHONE_DETECTED',
              confidence: 0.94,
              durationMs: 3000,
              explanation: 'Mobile phone detected in frame',
            },
            {
              type: 'TAB_HIDDEN',
              durationMs: 4000,
              explanation: 'Tab switched away during test',
            },
          ],
        }),
      });
      const eventsJson = await eventsRes.json();
      if (eventsRes.status !== 201 || !eventsJson.success) {
        throw new Error(`Event recording failed: ${JSON.stringify(eventsJson)}`);
      }
      console.log(`   ✓ Events ingested (New Risk Score: ${eventsJson.riskScore}, Level: ${eventsJson.riskLevel})`);

      // 11. Teacher Reviews Attempt
      console.log('11. Testing GET /api/teacher/attempts/:id/review...');
      const reviewRes = await fetch(`${baseUrl}/teacher/attempts/${attemptId}/review`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const reviewJson = await reviewRes.json();
      if (reviewRes.status !== 200 || !reviewJson.events) {
        throw new Error(`Attempt review fetch failed: ${JSON.stringify(reviewJson)}`);
      }
      console.log(`   ✓ Attempt review retrieved (Total Events: ${reviewJson.events.length})`);

      // 12. Teacher Marks Event as FALSE_ALARM and lowers Risk Score
      const targetEvent = reviewJson.events.find(e => e.reviewStatus === 'PENDING') || reviewJson.events[0];
      console.log(`12. Testing PATCH /api/teacher/events/:id/review (Mark event FALSE_ALARM)...`);
      const prevScore = reviewJson.attempt.riskScore;
      const patchReviewRes = await fetch(`${baseUrl}/teacher/events/${targetEvent._id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          decision: 'FALSE_ALARM',
          note: 'Confirmed false detection during automated verification test',
        }),
      });
      const patchReviewJson = await patchReviewRes.json();
      if (patchReviewRes.status !== 200 || !patchReviewJson.reviewDecision) {
        throw new Error(`Review decision PATCH failed: ${JSON.stringify(patchReviewJson)}`);
      }
      console.log(`   ✓ Event marked FALSE_ALARM. Previous Score: ${prevScore} -> Updated Score: ${patchReviewJson.attempt.riskScore}`);

      // 13. Teacher Creates a New Draft Exam
      console.log('13. Testing POST /api/exams (Teacher authoring new draft exam)...');
      const createExamRes = await fetch(`${baseUrl}/exams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: 'Chunk 1 Verification Quiz',
          description: 'Testing exam creation & editing flow.',
          durationSeconds: 900,
          questions: [
            {
              question: 'Is client-side AI more privacy preserving than cloud streaming?',
              options: ['Yes, absolutely', 'No', 'Makes no difference', 'Only on Sundays'],
              correctAnswer: 0,
            },
          ],
        }),
      });
      const createExamJson = await createExamRes.json();
      if (createExamRes.status !== 201 || !createExamJson.exam?._id) {
        throw new Error(`Teacher exam creation failed: ${JSON.stringify(createExamJson)}`);
      }
      const newExamId = createExamJson.exam._id;
      console.log(`   ✓ Draft exam created (ID: ${newExamId})`);

      // 14. Teacher Edits the Draft Exam (PUT /api/exams/:id)
      console.log('14. Testing PUT /api/exams/:id (Teacher editing draft exam)...');
      const updateExamRes = await fetch(`${baseUrl}/exams/${newExamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${teacherToken}`,
        },
        body: JSON.stringify({
          title: 'Chunk 1 Verification Quiz (Updated Title)',
          durationSeconds: 1200,
        }),
      });
      const updateExamJson = await updateExamRes.json();
      if (updateExamRes.status !== 200 || updateExamJson.exam.title !== 'Chunk 1 Verification Quiz (Updated Title)') {
        throw new Error(`Teacher exam update failed: ${JSON.stringify(updateExamJson)}`);
      }
      console.log('   ✓ Exam updated successfully');

      // 15. Teacher Publishes the Exam
      console.log('15. Testing PATCH /api/exams/:id/publish (Publishing exam)...');
      const publishRes = await fetch(`${baseUrl}/exams/${newExamId}/publish`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${teacherToken}` },
      });
      const publishJson = await publishRes.json();
      if (publishRes.status !== 200 || publishJson.exam.status !== 'PUBLISHED') {
        throw new Error(`Exam publish failed: ${JSON.stringify(publishJson)}`);
      }
      console.log('   ✓ Exam published successfully');

      // 16. Student Fetches Their Attempts List (GET /api/attempts)
      console.log('16. Testing GET /api/attempts (Student retrieving their attempts)...');
      const studentAttemptsRes = await fetch(`${baseUrl}/attempts`, {
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const studentAttemptsJson = await studentAttemptsRes.json();
      if (studentAttemptsRes.status !== 200 || !Array.isArray(studentAttemptsJson.attempts)) {
        throw new Error(`Student attempts list failed: ${JSON.stringify(studentAttemptsJson)}`);
      }
      console.log(`   ✓ Student attempts list retrieved (${studentAttemptsJson.attempts.length} attempts found)`);

      console.log('\n======================================================');
      console.log('🎉 ALL 16 VERIFICATION TESTS (CHUNK 0 + CHUNK 1) PASSED!');
      console.log('======================================================\n');

      server.close(async () => {
        await mongoose.connection.close();
        process.exit(0);
      });
    } catch (err) {
      console.error('\n❌ Test failure:', err.message);
      server.close(async () => {
        await mongoose.connection.close();
        process.exit(1);
      });
    }
  });
};

runTests();
