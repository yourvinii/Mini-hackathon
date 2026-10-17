import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { User, Exam, Attempt, ProctorEvent, ReviewDecision } from './models/index.js';
import { calculateRiskScore } from './utils/riskScoring.js';

dotenv.config();

export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing demo data...');
    await User.deleteMany({ email: { $in: ['teacher@proctorvision.local', 'student@proctorvision.local'] } });

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const teacherPasswordHash = await bcrypt.hash('teacher123', salt);
    const studentPasswordHash = await bcrypt.hash('student123', salt);

    // 1. Create Demo Users
    console.log('[Seed] Creating demo users...');
    const teacher = await User.create({
      name: 'Dr. Sarah Connor (Demo Teacher)',
      email: 'teacher@proctorvision.local',
      passwordHash: teacherPasswordHash,
      role: 'TEACHER',
    });

    const student = await User.create({
      name: 'Alex Rivera (Demo Student)',
      email: 'student@proctorvision.local',
      passwordHash: studentPasswordHash,
      role: 'STUDENT',
    });

    // Clean up any old attempts/exams created by demo users
    const oldExams = await Exam.find({ createdBy: teacher._id });
    const oldExamIds = oldExams.map(e => e._id);
    const oldAttempts = await Attempt.find({ exam: { $in: oldExamIds } });
    const oldAttemptIds = oldAttempts.map(a => a._id);

    await ProctorEvent.deleteMany({ attempt: { $in: oldAttemptIds } });
    await ReviewDecision.deleteMany({ attempt: { $in: oldAttemptIds } });
    await Attempt.deleteMany({ _id: { $in: oldAttemptIds } });
    await Exam.deleteMany({ createdBy: teacher._id });

    // 2. Create Published Exam
    console.log('[Seed] Creating sample published exam...');
    const exam = await Exam.create({
      title: 'CS 101: Fundamentals of Privacy & Computer Architecture',
      description: 'A 10-minute demonstration assessment designed for testing ProctorVision proctoring workflows.',
      durationSeconds: 600,
      createdBy: teacher._id,
      status: 'PUBLISHED',
      questions: [
        {
          question: 'What is the primary privacy benefit of in-browser client-side edge AI processing?',
          options: [
            'Raw video frames are never transmitted or stored on remote servers',
            'It eliminates all need for testing or proctoring',
            'It guarantees 100% automated cheating detection with zero false alarms',
            'It consumes zero client CPU and memory resources'
          ],
          correctAnswer: 0,
        },
        {
          question: 'In ProctorVision, what does a detection event represent?',
          options: [
            'Conclusive legal proof of academic dishonesty',
            'An explainable review event intended for human teacher evaluation',
            'An automatic trigger for immediate exam cancellation',
            'A penalty point automatically subtracted from exam score'
          ],
          correctAnswer: 1,
        },
        {
          question: 'Which browser API is utilized to detect when an exam taker switches away to another application window or tab?',
          options: [
            'Web Audio API',
            'Page Visibility API',
            'Battery Status API',
            'Clipboard API'
          ],
          correctAnswer: 1,
        },
        {
          question: 'Why should normal head movement or looking down not be automatically classified as cheating?',
          options: [
            'Students regularly look down at scrap paper or shift posture innocently',
            'Webcams are always completely accurate',
            'Because teachers prefer never reviewing student events',
            'Browsers do not support head pose estimation'
          ],
          correctAnswer: 0,
        },
      ],
    });

    // 3. Create Sample Attempt
    console.log('[Seed] Creating sample exam attempt...');
    const startedAt = new Date(Date.now() - 8 * 60 * 1000); // 8 minutes ago
    const deadlineAt = new Date(startedAt.getTime() + 600 * 1000);

    const attempt = await Attempt.create({
      exam: exam._id,
      student: student._id,
      status: 'IN_PROGRESS',
      startedAt,
      deadlineAt,
      cameraConsentGiven: true,
      answers: {
        0: 0,
        1: 1,
      },
      riskScore: 0,
      riskLevel: 'LOW',
      eventCount: 0,
    });

    // 4. Create Sample Proctor Events
    console.log('[Seed] Creating sample proctor events...');
    const event1 = await ProctorEvent.create({
      attempt: attempt._id,
      type: 'TAB_HIDDEN',
      timestamp: new Date(startedAt.getTime() + 60 * 1000),
      durationMs: 4200,
      severity: 'MEDIUM',
      explanation: 'Browser tab became hidden for 4.2 seconds',
      reviewStatus: 'VALID_ACTIVITY',
    });

    const event2 = await ProctorEvent.create({
      attempt: attempt._id,
      type: 'HEAD_TURN',
      timestamp: new Date(startedAt.getTime() + 180 * 1000),
      durationMs: 5100,
      severity: 'LOW',
      explanation: 'Sustained head orientation turned left for 5.1s',
      reviewStatus: 'FALSE_ALARM',
    });

    const event3 = await ProctorEvent.create({
      attempt: attempt._id,
      type: 'NO_FACE',
      timestamp: new Date(startedAt.getTime() + 300 * 1000),
      durationMs: 3800,
      severity: 'MEDIUM',
      explanation: 'No face detected in video frame for 3.8s',
      reviewStatus: 'PENDING',
    });

    const event4 = await ProctorEvent.create({
      attempt: attempt._id,
      type: 'PHONE_DETECTED',
      timestamp: new Date(startedAt.getTime() + 420 * 1000),
      durationMs: 2500,
      confidence: 0.89,
      severity: 'HIGH',
      explanation: 'Mobile phone detected with 89% confidence across consecutive frames',
      reviewStatus: 'PENDING',
    });

    // 5. Create Sample Review Decisions
    console.log('[Seed] Creating sample review decisions audit records...');
    await ReviewDecision.create({
      event: event1._id,
      attempt: attempt._id,
      reviewer: teacher._id,
      decision: 'VALID_ACTIVITY',
      note: 'Student switched away from browser during test window',
    });

    await ReviewDecision.create({
      event: event2._id,
      attempt: attempt._id,
      reviewer: teacher._id,
      decision: 'FALSE_ALARM',
      note: 'Student was looking down at scrap paper to calculate formula',
    });

    // 6. Calculate Risk Score based on active events
    const allEvents = await ProctorEvent.find({ attempt: attempt._id });
    const { riskScore, riskLevel } = calculateRiskScore(allEvents);

    attempt.riskScore = riskScore;
    attempt.riskLevel = riskLevel;
    attempt.eventCount = allEvents.length;
    await attempt.save();

    console.log('\n======================================================');
    console.log('✅ SEED COMPLETED SUCCESSFULLY');
    console.log('======================================================');
    console.log('Demo Credentials:');
    console.log('  Teacher:');
    console.log('    Email:    teacher@proctorvision.local');
    console.log('    Password: teacher123');
    console.log('  Student:');
    console.log('    Email:    student@proctorvision.local');
    console.log('    Password: student123');
    console.log('Sample Exam:');
    console.log(`    ID:       ${exam._id}`);
    console.log(`    Title:    ${exam.title}`);
    console.log('Sample Attempt:');
    console.log(`    ID:       ${attempt._id}`);
    console.log(`    Risk:     Score ${attempt.riskScore} (${attempt.riskLevel})`);
    console.log(`    Events:   ${attempt.eventCount} total`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error]: ${error.message}`);
    process.exit(1);
  }
};

// Run if called directly
seedDatabase();
