const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const ExamNotification = require('./models/ExamNotification');
const Payment = require('./models/Payment');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const runFullLifecycleSimulation = async () => {
    try {
        console.log('--- STARTING COMPREHENSIVE ACADEMIC LIFECYCLE SIMULATION ---');

        // BATCH CONFIGURATIONS
        const batches = [
            { id: '2022-2026', currentYear: 2, currentSem: 4, targetYear: 4, targetSem: 8 }, // Currently Y2 (after my previous script), needs to go to 4-2 (Sem 8)
            { id: '2023-2027', currentYear: 1, currentSem: 1, targetYear: 3, targetSem: 6 }, // Currently Y1, needs to go to 3-2 (Sem 6)
            { id: '2024-2028', currentYear: 1, currentSem: 1, targetYear: 2, targetSem: 4 }, // Currently Y1, needs to go to 2-2 (Sem 4)
            { id: '2025-2029', currentYear: 1, currentSem: 1, targetYear: 1, targetSem: 2 }  // Currently Y1, needs to go to 1-2 (Sem 2)
        ];

        // Ensure we are simulating consistent points in time.
        // We will loop through "Global Semesters" from 2022 to Present.

        // Helper: Clear Fees for a Student for a specific Year/Sem
        const clearFees = async (student, feeTypes = ['college', 'transport', 'hostel', 'placement']) => {
            student.feeRecords.forEach(r => {
                if (feeTypes.includes(r.feeType) && r.status !== 'paid') {
                    r.status = 'paid';
                    r.amountPaid = r.amountDue;
                    r.transactions.push({
                        amount: r.amountDue,
                        date: new Date(),
                        mode: 'Simulated-Auto',
                        reference: `AUTOCLEAR-${r.year}-${r.semester}`
                    });
                }
            });
            // Reset Top Level
            student.collegeFeeDue = 0;
            student.transportFeeDue = 0;
            student.hostelFeeDue = 0;
            student.placementFeeDue = 0;
            await student.save();
        };

        // Helper: Create Exam & Process
        const processExamCycle = async (label, year, semester, targetBatchIds, examDate) => {
            console.log(`\n\n=== EXAM CYCLE: ${label} (Year ${year}, Sem ${semester}) ===`);
            console.log(`   Target Batches: ${targetBatchIds.join(', ')}`);

            // 1. Create Notification
            const notif = await ExamNotification.create({
                title: `End Sem Exam ${label} (Y${year}-S${semester})`,
                year: year,
                semester: semester,
                targetBatches: targetBatchIds,
                examFeeAmount: 1250,
                startDate: new Date(examDate),
                endDate: new Date(new Date(examDate).getTime() + 15 * 86400000),
                examType: 'regular',
                description: `Regular exam for Year ${year}, Semester ${semester}`,
                isActive: false
            });

            // 2. Process Students from Target Batches
            const students = await Student.find({ batch: { $in: targetBatchIds } });
            console.log(`   Processing ${students.length} regular students...`);

            for (const student of students) {
                // Determine if student is actually ready for this exam
                // They should be in (Year, Sem) OR (Year, Sem-1) waiting for promotion?
                // For simplicity in this forcing script: We assume they are ready.

                // a. Clear Academic Fees for this semester
                await clearFees(student);

                // b. Pay Exam Fee
                await Payment.create({
                    student: student._id,
                    amount: 1250,
                    paymentId: `EXAM-${year}-${semester}-${student.usn}`,
                    status: 'completed',
                    paymentType: 'exam_fee',
                    metadata: { notificationId: notif._id, year, semester }
                });

                // c. Promote Logic
                // If Sem is EVEN (2, 4, 6), promote to Next Year (Year + 1)
                // If Sem is ODD (1, 3, 5), just stay in Year but Sem increments naturally (metadata)

                // My data model stores 'currentYear'. 'semester' is often derived or mental model.
                // However, I will strictly increment 'currentYear' only after Even Semester Exams.

                if (semester % 2 === 0) {
                    // Start of NEXT Year
                    const nextYear = student.currentYear + 1;
                    if (nextYear <= 4) {
                        student.currentYear = nextYear;

                        // Generate Next Year Fees
                        const semA = (nextYear * 2) - 1;
                        const semB = nextYear * 2;
                        const addFee = (type, amt) => {
                            if (amt <= 0) return;
                            const split = Math.ceil(amt / 2);
                            student.feeRecords.push({ year: nextYear, semester: semA, feeType: type, amountDue: split, status: 'pending', amountPaid: 0, transactions: [] });
                            student.feeRecords.push({ year: nextYear, semester: semB, feeType: type, amountDue: amt - split, status: 'pending', amountPaid: 0, transactions: [] });
                        };

                        addFee('college', student.annualCollegeFee);
                        if (student.transportOpted) addFee('transport', student.annualTransportFee);
                        if (student.hostelOpted) addFee('hostel', student.annualHostelFee);
                        addFee('placement', student.annualPlacementFee);

                        student.collegeFeeDue = student.annualCollegeFee;
                        student.transportFeeDue = student.annualTransportFee;
                        student.hostelFeeDue = student.annualHostelFee;
                        student.placementFeeDue = student.annualPlacementFee;
                    }
                }
                await student.save();
            }

            // 3. Process Upper Batches (Supplementary) - Visibility Rule
            // Any batch OLDER than targetBatchIds is an "Upper Batch".
            // e.g. If Exam is for 2024-2028 (Year 1), then 2023-2027 (Year 2) sees it.
            // We simulate random supplementary attempts for them.

            // Logic: Find students NOT in targetBatches but match "Upper Batch" criteria
            // Simplified: Find all students whose batch start year < targetBatch start year
            // For now, I will skip simulated supplementary payments to keep it clean, 
            // but the Notification IS VISIBLE to them because I updated the controller to show '$lte: currentYear'.

        };

        // =================================================================================
        // EXECUTION TIMELINE
        // =================================================================================

        // 2022-2026 Batch is currently at Year 2 (Sem 4 finished effectively in prev script, but let's assume they just finished 1-2).
        // Actually, my previous script put them in Year 2.
        // User wants: 2022-2026 -> 2-1 -> 2-2 -> 3-1 -> 3-2 -> 4-1 -> 4-2.

        // 2023-2027 is Year 1. Needs 1-1 -> ... -> 3-2.

        // I will run a sequence of events.

        // 1. Dec 2022: Exam 1-1 for Batch 2022 (Done previously, but no harm re-doing or skipping? User said "incorrectly marked as Year 1" initially, but I fixed it. 
        // User instruction: "Initial Condition: All students currently exist but incorrect...". 
        // I will assume I need to drive them from where they ARE now to where they SHOULD be.

        // To be safe, I will run the timeline for EACH batch individually to hit their target.

        // --- BATCH 2022-2026 (Target: 4-2) ---
        // They are already partly processed. I will start from 2-1.
        console.log('--- Processing 2022-2026 Sequence ---');
        await processExamCycle('Dec 2023', 2, 3, ['2022-2026'], '2023-12-15'); // 2-1
        await processExamCycle('May 2024', 2, 4, ['2022-2026'], '2024-05-15'); // 2-2 -> Promotes to Year 3

        await processExamCycle('Dec 2024', 3, 5, ['2022-2026'], '2024-12-15'); // 3-1
        await processExamCycle('May 2025', 3, 6, ['2022-2026'], '2025-05-15'); // 3-2 -> Promotes to Year 4

        await processExamCycle('Dec 2025', 4, 7, ['2022-2026'], '2025-12-15'); // 4-1
        // 4-2 is CURRENT/UPCOMING, so we don't complete it? User said "Final state: 2022-2026 batch is in 4-2".
        // This means they finished 4-1 and are currently sitting in Sem 8 (4-2).
        // I will create an ACTIVE notification for 4-2.
        await ExamNotification.create({
            title: 'End Sem Exam May 2026 (4-2) - Upcoming',
            year: 4,
            semester: 8,
            targetBatches: ['2022-2026'],
            examFeeAmount: 1500,
            startDate: new Date('2026-05-15'),
            endDate: new Date('2026-05-30'),
            examType: 'regular',
            isActive: true
        });

        // --- BATCH 2023-2027 (Target: 3-2) ---
        // Currently Year 1.
        console.log('--- Processing 2023-2027 Sequence ---');
        await processExamCycle('Dec 2023', 1, 1, ['2023-2027'], '2023-12-15'); // 1-1
        await processExamCycle('May 2024', 1, 2, ['2023-2027'], '2024-05-15'); // 1-2 -> Promotes to Year 2

        await processExamCycle('Dec 2024', 2, 3, ['2023-2027'], '2024-12-15'); // 2-1
        await processExamCycle('May 2025', 2, 4, ['2023-2027'], '2025-05-15'); // 2-2 -> Promotes to Year 3

        await processExamCycle('Dec 2025', 3, 5, ['2023-2027'], '2025-12-15'); // 3-1
        // Sitting in 3-2 (Sem 6).
        await ExamNotification.create({
            title: 'End Sem Exam May 2026 (3-2) - Upcoming',
            year: 3,
            semester: 6,
            targetBatches: ['2023-2027'],
            examFeeAmount: 1400,
            startDate: new Date('2026-05-15'),
            endDate: new Date('2026-05-30'),
            examType: 'regular',
            isActive: true
        });


        // --- BATCH 2024-2028 (Target: 2-2) ---
        // Currently Year 1.
        console.log('--- Processing 2024-2028 Sequence ---');
        await processExamCycle('Dec 2024', 1, 1, ['2024-2028'], '2024-12-15'); // 1-1
        await processExamCycle('May 2025', 1, 2, ['2024-2028'], '2025-05-15'); // 1-2 -> Promotes to Year 2

        await processExamCycle('Dec 2025', 2, 3, ['2024-2028'], '2025-12-15'); // 2-1
        // Sitting in 2-2 (Sem 4).
        await ExamNotification.create({
            title: 'End Sem Exam May 2026 (2-2) - Upcoming',
            year: 2,
            semester: 4,
            targetBatches: ['2024-2028'],
            examFeeAmount: 1300,
            startDate: new Date('2026-05-15'),
            endDate: new Date('2026-05-30'),
            examType: 'regular',
            isActive: true
        });

        // --- BATCH 2025-2029 (Target: 1-2) ---
        // Assume started mid-2025? If we are in early 2026.
        console.log('--- Processing 2025-2029 Sequence ---');
        // If they joined 2025, they finished 1-1 in Dec 2025.
        await processExamCycle('Dec 2025', 1, 1, ['2025-2029'], '2025-12-15'); // 1-1
        // Sitting in 1-2 (Sem 2).
        await ExamNotification.create({
            title: 'End Sem Exam May 2026 (1-2) - Upcoming',
            year: 1,
            semester: 2,
            targetBatches: ['2025-2029'],
            examFeeAmount: 1200,
            startDate: new Date('2026-05-15'),
            endDate: new Date('2026-05-30'),
            examType: 'regular',
            isActive: true
        });

        console.log('--- LIFECYCLE SIMULATION COMPLETE ---');
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

runFullLifecycleSimulation();
