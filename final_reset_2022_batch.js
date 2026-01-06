const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Payment = require('./models/Payment');
const ExamNotification = require('./models/ExamNotification');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const finalResetAndSeed = async () => {
    try {
        console.log('--- FINAL RESET & SEED: BATCH 2022-2026 (TARGET 4-1) ---');

        // 1. CLEANUP
        console.log('1. Cleaning Database...');
        await Student.deleteMany({});
        await User.deleteMany({ role: 'student' }); // Keep Admins
        await Payment.deleteMany({});
        await ExamNotification.deleteMany({});

        console.log('   -> Database cleared (Students, Payments, Notifications).');

        // 2. CONFIGURATION
        const batchName = '2022-2026'; // Target 4-1
        // Past Semesters to simulate
        const historySteps = [
            { sem: '1-1', year: 1, s: 1, date: '2022-12-15' },
            { sem: '1-2', year: 1, s: 2, date: '2023-05-15' },
            { sem: '2-1', year: 2, s: 3, date: '2023-12-15' },
            { sem: '2-2', year: 2, s: 4, date: '2024-05-15' },
            { sem: '3-1', year: 3, s: 5, date: '2024-12-15' },
            { sem: '3-2', year: 3, s: 6, date: '2025-05-15' },
        ];

        // Active Semester (4-1)
        const currentSem = { sem: '4-1', year: 4, s: 7, date: '2026-01-20' };

        const departments = [
            { code: '01', name: 'CSE' },
            { code: '03', name: 'MECH' },
            { code: '04', name: 'ECE' },
            { code: '05', name: 'CIVIL' }
        ];

        const firstNames = ["Aditya", "Rohan", "Sanya", "Karthik", "Priya", "Rahul", "Ananya", "Vikram", "Nisha", "Arjun"];
        const lastNames = ["Sharma", "Verma", "Reddy", "Nair", "Iyer", "Gowda", "Patel", "Singh", "Das", "Rao"];
        const getRandomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

        let createdStudents = [];

        // 3. CREATE STUDENTS
        console.log('2. Creating Students (Batch 2022-2026)...');

        for (const dept of departments) {
            console.log(`   -> Seeding ${dept.name}...`);
            for (let i = 1; i <= 8; i++) { // 8 students per dept
                const serial = i.toString().padStart(3, '0');
                const usn = `25221A${dept.code}${serial}`; // 2022 batch USN format assumption

                const user = await User.create({
                    username: usn,
                    password: '123',
                    role: 'student',
                    name: getRandomName(),
                    email: `${usn.toLowerCase()}@bvce.edu`
                });

                // Fee Config
                const isMgmt = Math.random() > 0.7;
                const annualFee = isMgmt ? 150000 : 0;

                const student = await Student.create({
                    user: user._id,
                    usn: usn,
                    department: dept.name,
                    batch: batchName,
                    currentYear: 4, // Initializing directly at year 4 to match target state conceptually, but we will backfill history
                    quota: isMgmt ? 'management' : 'government',
                    entry: 'regular',
                    status: 'active',

                    annualCollegeFee: annualFee,
                    annualTransportFee: 0,
                    annualHostelFee: 0,
                    annualPlacementFee: 10000,

                    collegeFeeDue: annualFee, // Current Year 4 dues pending
                    placementFeeDue: 10000,

                    feeRecords: [] // Will populate
                });
                createdStudents.push(student);
            }
        }

        // 4. SIMULATE HISTORY (Years 1, 2, 3)
        console.log('3. Simulating History (Semesters 1-1 to 3-2)...');

        for (const step of historySteps) {
            console.log(`   -> Processing ${step.sem} (${step.date})...`);

            // A. Create Notification
            const notif = await ExamNotification.create({
                title: `End Sem Exam ${step.sem}`,
                year: step.year,
                semester: step.s,
                targetBatches: [batchName],
                examFeeAmount: 1100 + (step.year * 100), // Increasing fee
                startDate: new Date(step.date),
                endDate: new Date(new Date(step.date).getTime() + 10 * 86400000),
                examType: 'regular',
                isActive: false // Past
            });

            // B. Update Student History
            for (const student of createdStudents) {
                // 1. Add Acad Fees for that past year (Paid)
                // We simplify: Just ensure NO DUES for past years.

                // 2. Add Exam Fee Payment (Paid)
                await Payment.create({
                    student: student._id,
                    amount: notif.examFeeAmount,
                    paymentId: `HIST-${step.sem}-${student.usn}`,
                    status: 'completed',
                    paymentType: 'exam_fee',
                    metadata: { notificationId: notif._id, year: step.year, semester: step.s },
                    createdAt: new Date(step.date) // Backdated
                });
            }
        }

        // 5. CURRENT SEMESTER (4-1)
        console.log('4. Setting up Current Semester (4-1)...');

        // Create Active Notification
        const activeNotif = await ExamNotification.create({
            title: 'End Sem Exam 4-1 (Jan 2026)',
            year: 4,
            semester: 7,
            targetBatches: [batchName],
            examFeeAmount: 1500,
            startDate: new Date(currentSem.date),
            endDate: new Date('2026-02-05'),
            examType: 'regular',
            description: 'Regular End Semester Examinations for 4th Year B.Tech',
            isActive: true
        });

        // Add 4-1 Academic Fees (Pending)
        for (const student of createdStudents) {
            // Add Fee Records for Year 4
            // Since it's 4-1, we assume full year fee is generated or half? Usually annual.
            // We set 'collegeFeeDue' in creation, now strictly add 'feeRecords'

            const sem7 = 7;
            const sem8 = 8;

            // College Fee
            if (student.annualCollegeFee > 0) {
                const half = student.annualCollegeFee / 2;
                student.feeRecords.push({
                    year: 4, semester: sem7, feeType: 'college', amountDue: half, amountPaid: 0, status: 'pending'
                });
                student.feeRecords.push({
                    year: 4, semester: sem8, feeType: 'college', amountDue: half, amountPaid: 0, status: 'pending'
                });
            }

            // Placement Fee (One time/Annual)
            if (student.annualPlacementFee > 0) {
                student.feeRecords.push({
                    year: 4, semester: sem7, feeType: 'placement', amountDue: student.annualPlacementFee, amountPaid: 0, status: 'pending'
                });
            }

            await student.save();
        }

        console.log('--- RESET & SEED COMPLETE ---');
        console.log('Batch 2022-2026 is at 4-1.');
        console.log('Past Exams (1-1 to 3-2) -> PAID.');
        console.log('Current Exam (4-1) -> UNPAID & ACTIVE.');

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

finalResetAndSeed();
