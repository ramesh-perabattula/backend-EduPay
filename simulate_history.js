const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const ExamNotification = require('./models/ExamNotification');
const Payment = require('./models/Payment');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const simulateHistory = async () => {
    try {
        console.log('Starting Historical Simulation...');

        // 1. Define Batch Targets
        // 2022-2026: Target Year 4 (Needs Y1, Y2, Y3 Completed)
        // 2023-2027: Target Year 3 (Needs Y1, Y2 Completed)
        // 2024-2028: Target Year 2 (Needs Y1 Completed)
        // 2025-2029: Target Year 1 (Fresh start)

        const batches = [
            { id: '2022-2026', targetYear: 4, history: [1, 2, 3] },
            { id: '2023-2027', targetYear: 3, history: [1, 2] },
            { id: '2024-2028', targetYear: 2, history: [1] },
            { id: '2025-2029', targetYear: 1, history: [] }
        ];

        // 2. Clear Existing Exam Notifications & Payments to avoid duplicates if re-run
        await ExamNotification.deleteMany({});
        await Payment.deleteMany({ paymentType: 'exam_fee' });

        // Also reset all students to Year 1 (clean slate assumption, though seeder did this)
        // We will trust the seeder just ran and everyone is at Year 1 with Year 1 fees pending.

        // Helpe: Pay Fees for a specific Year
        const payAcademicFees = async (student, year) => {
            if (!student.feeRecords) student.feeRecords = [];

            // Find records for this year
            const records = student.feeRecords.filter(r => r.year === year);

            for (const record of records) {
                if (record.status !== 'paid') {
                    record.status = 'paid';
                    record.amountPaid = record.amountDue;
                    record.transactions.push({
                        amount: record.amountDue,
                        date: new Date(new Date().setFullYear(new Date().getFullYear() - (4 - year))), // Backdate roughly
                        mode: 'Online',
                        reference: `SIM-AUTO-PAY-Y${year}`
                    });
                }
            }

            // Clear Top Level Dues for this year context (simulated)
            // In reality, dues are strictly current, but we zero them out before promoting
            student.collegeFeeDue = 0;
            student.transportFeeDue = 0;
            student.hostelFeeDue = 0;
            student.placementFeeDue = 0;
        };

        // Helper: Generate Next Year Fees
        const generateNextYearFees = (student, nextYear) => {
            const semA = (nextYear * 2) - 1;
            const semB = nextYear * 2;

            const addRecord = (type, annualAmount) => {
                const amount = Number(annualAmount) || 0;
                const split = Math.ceil(amount / 2);
                student.feeRecords.push({ year: nextYear, semester: semA, feeType: type, amountDue: split, status: 'pending', amountPaid: 0, transactions: [] });
                student.feeRecords.push({ year: nextYear, semester: semB, feeType: type, amountDue: amount - split, status: 'pending', amountPaid: 0, transactions: [] });
            };

            addRecord('college', student.annualCollegeFee);
            if (student.transportOpted) addRecord('transport', student.annualTransportFee);
            if (student.hostelOpted) addRecord('hostel', student.annualHostelFee);
            if (student.placementOpted) addRecord('placement', student.annualPlacementFee);

            // Set Dues
            student.collegeFeeDue = student.annualCollegeFee;
            student.transportFeeDue = student.annualTransportFee || 0;
            student.hostelFeeDue = student.annualHostelFee || 0;
            student.placementFeeDue = student.annualPlacementFee || 0;
        };

        // 3. Create Past Exam Notifications (One per year level)
        // We create them once, globally, targeted at batches that would have taken them.

        const exams = [
            { year: 1, date: '2023-05-15', batches: ['2022-2026', '2023-2027', '2024-2028'] },
            { year: 2, date: '2024-05-15', batches: ['2022-2026', '2023-2027'] },
            { year: 3, date: '2025-05-15', batches: ['2022-2026'] }
        ];

        for (const exam of exams) {
            console.log(`Creating Past Exam Notification: Year ${exam.year} for batches ${exam.batches.join(', ')}`);
            const notif = await ExamNotification.create({
                title: `End Semester Exam (Year ${exam.year})`,
                year: exam.year,
                targetBatches: exam.batches, // Multi-batch support
                semester: exam.year * 2,
                examFeeAmount: 1200,
                startDate: new Date(exam.date),
                endDate: new Date(new Date(exam.date).getTime() + 10 * 24 * 60 * 60 * 1000),
                description: `Regular Annual Exam for Year ${exam.year}`,
                examType: 'regular',
                isActive: false // Expired
            });

            // process students for this exam level
            // We find students who belong to these batches AND are currently at or below this level (physically in DB they are Y1, so we check batch)
            const students = await Student.find({ batch: { $in: exam.batches } });

            for (const student of students) {
                // 1. Pay Academic Fees for this Level (Year 1, 2, or 3)
                await payAcademicFees(student, exam.year);

                // 2. Pay Exam Fee
                await Payment.create({
                    student: student._id,
                    amount: 1200,
                    currency: 'INR',
                    paymentId: `PAY_EXAM_Y${exam.year}_${student.usn}`,
                    orderId: `ORD_EXAM_Y${exam.year}_${student.usn}`,
                    status: 'completed',
                    paymentType: 'exam_fee',
                    description: `Exam Fee for Year ${exam.year}`,
                    metadata: {
                        notificationId: notif._id,
                        year: exam.year
                    }
                });

                // 3. Promote to Next Year (if not already there)
                // Since this runs sequentially (Exam Y1, then Exam Y2...), we can just increment.
                // But we must check if this student SHOULD be promoted further.
                // E.g. 2024-2028 student takes Y1 exam -> promotes to Y2. STOP.
                // E.g. 2022-2026 student takes Y1 exam -> promotes to Y2. Next loop takes Y2 exam -> promotes to Y3...

                const nextYear = exam.year + 1;
                student.currentYear = nextYear;

                // Initialize fees for the NEW year they just entered
                generateNextYearFees(student, nextYear);

                await student.save();
            }
        }

        // 4. Create ACTIVE Current Exams for each batch (optional, to see something on dashboard)
        console.log('Creating Active Exams for current standing...');

        const activeConfigs = [
            { batch: '2022-2026', currentYear: 4, sem: 7 },
            { batch: '2023-2027', currentYear: 3, sem: 5 },
            { batch: '2024-2028', currentYear: 2, sem: 3 },
            { batch: '2025-2029', currentYear: 1, sem: 1 }
        ];

        for (const config of activeConfigs) {
            await ExamNotification.create({
                title: `Upcoming Winter Exams (Year ${config.currentYear})`,
                year: config.currentYear,
                targetBatches: [config.batch],
                semester: config.sem,
                examFeeAmount: 1500,
                startDate: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000), // Starts in 2 days
                endDate: new Date(new Date().getTime() + 15 * 24 * 60 * 60 * 1000),
                description: `Mandatory end semester exams for Batch ${config.batch}`,
                examType: 'regular',
                isActive: true
            });
        }

        console.log('Simulation Complete!');
        process.exit();

    } catch (error) {
        console.error('Simulation Failed:', error);
        process.exit(1);
    }
};

simulateHistory();
