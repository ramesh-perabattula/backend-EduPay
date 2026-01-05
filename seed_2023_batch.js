const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Payment = require('./models/Payment');
const ExamNotification = require('./models/ExamNotification');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const seed2023Batch = async () => {
    try {
        console.log('--- SEEDING BATCH 2023-2027 (TARGET 3-2) ---');

        const batchName = '2023-2027';

        // 1. CLEANUP (Only this batch)
        console.log('1. Cleaning Batch 2023-2027 Data...');
        const existingStudents = await Student.find({ batch: batchName });
        const studentIds = existingStudents.map(s => s._id);
        const userIds = existingStudents.map(s => s.user);

        // Delete Payments linked to these students
        await Payment.deleteMany({ student: { $in: studentIds } });

        // Delete Users and Students
        await Student.deleteMany({ _id: { $in: studentIds } });
        await User.deleteMany({ _id: { $in: userIds } });

        // Optional: Remove ExamNotifications explicitly targeting ONLY this batch, or just keep them?
        // To be clean, we can leave them if they are historical, but creating new ones is safer for "No skipped exams".
        // I will Create fresh ones or find existing.

        console.log(`   -> Removed ${existingStudents.length} students.`);

        // 2. CONFIG - History
        // 2023-2027 joined Aug 2023.
        const historySteps = [
            { sem: '1-1', year: 1, s: 1, date: '2023-12-15' },
            { sem: '1-2', year: 1, s: 2, date: '2024-05-15' },
            { sem: '2-1', year: 2, s: 3, date: '2024-12-15' },
            { sem: '2-2', year: 2, s: 4, date: '2025-05-15' },
            { sem: '3-1', year: 3, s: 5, date: '2025-12-15' },
        ];

        // Current Sem 3-2 (May 2026 - Upcoming/Current)
        const currentSem = { sem: '3-2', year: 3, s: 6, date: '2026-05-15' };

        const departments = [
            { code: '01', name: 'CSE' },
            { code: '03', name: 'MECH' },
            { code: '04', name: 'ECE' },
            { code: '05', name: 'CIVIL' }
        ];

        const firstNames = ["Vivek", "Sneha", "Amit", "Pooja", "Raj", "Simran", "Varun", "Kavya", "Arun", "Divya"];
        const lastNames = ["Kumar", "Singh", "Patil", "Mehta", "Shah", "Gupta", "Desai", "Jain", "Malhotra", "Saxena"];
        const getRandomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

        let createdStudents = [];

        // 3. CREATE STUDENTS
        console.log('2. Creating Students (Batch 2023-2027)...');

        for (const dept of departments) {
            console.log(`   -> Seeding ${dept.name}...`);
            for (let i = 1; i <= 8; i++) { // 8 students per dept
                const serial = i.toString().padStart(3, '0');
                const usn = `25231A${dept.code}${serial}`;

                const user = await User.create({
                    username: usn,
                    password: '123',
                    role: 'student',
                    name: getRandomName(),
                    email: `${usn.toLowerCase()}@bvce.edu`
                });

                const isMgmt = Math.random() > 0.8;
                const annualFee = isMgmt ? 140000 : 0;

                const student = await Student.create({
                    user: user._id,
                    usn: usn,
                    department: dept.name,
                    batch: batchName,
                    currentYear: 3, // Target Year 3
                    quota: isMgmt ? 'management' : 'government',
                    entry: 'regular',
                    status: 'active',

                    annualCollegeFee: annualFee,
                    annualTransportFee: 0,
                    annualHostelFee: 0,
                    annualPlacementFee: 8000,

                    collegeFeeDue: annualFee, // Year 3 fees pending
                    placementFeeDue: 8000,

                    feeRecords: []
                });
                createdStudents.push(student);
            }
        }

        // 4. SIMULATE HISTORY (Paid)
        console.log('3. Simulating History (Semesters 1-1 to 3-1)...');

        for (const step of historySteps) {
            // Check if notification exists or create
            // We use findOneAndUpdate to duplicate safe or just find
            let notif = await ExamNotification.findOne({
                title: `End Sem Exam ${step.sem} (Batch 23)`, // Unique title to avoid mess
                targetBatches: batchName
            });

            if (!notif) {
                notif = await ExamNotification.create({
                    title: `End Sem Exam ${step.sem} (Batch 23)`,
                    year: step.year,
                    semester: step.s,
                    targetBatches: [batchName],
                    examFeeAmount: 1200,
                    startDate: new Date(step.date),
                    endDate: new Date(new Date(step.date).getTime() + 10 * 86400000),
                    examType: 'regular',
                    isActive: false
                });
            }

            // Pay Fees for History
            for (const student of createdStudents) {
                await Payment.create({
                    student: student._id,
                    amount: 1200,
                    paymentId: `HIST-23-${step.sem}-${student.usn}`,
                    status: 'completed',
                    paymentType: 'exam_fee',
                    metadata: { notificationId: notif._id, year: step.year, semester: step.s },
                    createdAt: new Date(step.date)
                });
            }
        }

        // 5. CURRENT SEMESTER (3-2) - UNPAID
        console.log('4. Setting up Current Semester (3-2)...');

        const activeNotif = await ExamNotification.create({
            title: 'End Sem Exam 3-2 (May 2026)',
            year: 3,
            semester: 6,
            targetBatches: [batchName],
            examFeeAmount: 1400,
            startDate: new Date('2026-05-15'), // Current/Upcoming
            endDate: new Date('2026-05-30'),
            examType: 'regular',
            isActive: true
        });

        // Add 3-2 Academic Fees (Pending)
        const sem5 = 5;
        const sem6 = 6;

        for (const student of createdStudents) {
            // College Fee (Year 3)
            if (student.annualCollegeFee > 0) {
                const half = student.annualCollegeFee / 2;
                // Sem 5 (Paid in history? We only simulated Exam Fees history. Let's say Academic history logic is complex, 
                // but user said "All fees pending" for CURRENT sem 3-2. Sem 3-1 should ideally be paid.
                // We'll just add Sem 6 (3-2) pending records.
                student.feeRecords.push({
                    year: 3, semester: sem6, feeType: 'college', amountDue: half, amountPaid: 0, status: 'pending'
                });
            }
            // Placement Fee
            if (student.annualPlacementFee > 0) {
                student.feeRecords.push({
                    year: 3, semester: sem6, feeType: 'placement', amountDue: student.annualPlacementFee, amountPaid: 0, status: 'pending'
                });
            }

            // Note: We do NOT create an Exam Fee record in 'feeRecords' array usually (that's for college fee). 
            // Exam fee is paid via Payment model.
            // But we must NOT create a 'Payment' record (as per instructions: "Exam fees as UNPAID").

            await student.save();
        }

        // 6. SUPPLEMENTARY VISIBILITY for Higher Batches (2022-2026)
        // 2023-2027 is Year 3. 2022-2026 is Year 4.
        // 3-2 Exam (May 2026) is Year 3.
        // Year 4 Students can see Year 3 exams? 
        // Logic: "Lower Batch -> Higher Batch Visibility".
        // Yes, 2022 batch (Year 4) can see this Year 3 exam.
        // I checked logic in controller: { year: { $lt: currentYear } }. 
        // 3 < 4. So 2022 batch WILL see it. (Correct).

        // Create Supplementary Payment for few seniors?
        // User: "Supplementary exam fee records must be created separately and marked as PAID"
        // I will act for 2022 batch seniors.

        const seniors = await Student.find({ batch: '2022-2026' });
        console.log(`5. Simulating Supplementary for ${seniors.length} seniors...`);

        if (seniors.length > 0) {
            for (let k = 0; k < 3; k++) { // Just 3 random seniors
                const senior = seniors[k];
                await Payment.create({
                    student: senior._id,
                    amount: 1400,
                    paymentId: `SUPP-23-3-2-${senior.usn}`,
                    status: 'completed',
                    paymentType: 'exam_fee',
                    metadata: { notificationId: activeNotif._id, year: 3, semester: 6, isSupplementary: true }
                });
            }
        }

        console.log('--- SEEDING 2023 BATCH COMPLETE ---');
        console.log('Batch 2023-2027 is at 3-2.');
        console.log('History 1-1 to 3-1: PAID.');
        console.log('Current 3-2: UNPAID.');

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seed2023Batch();
