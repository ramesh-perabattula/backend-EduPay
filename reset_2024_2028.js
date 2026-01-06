const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Payment = require('./models/Payment');
const ExamNotification = require('./models/ExamNotification');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const resetAndSeed2024Batch = async () => {
    try {
        console.log('--- RESET & SEED: BATCH 2024-2028 (TARGET 2-2) ---');

        const BATCH = '2024-2028';
        const CURRENT_YEAR = 2; // 2nd Year

        // Departments Mapping
        const DEPARTMENTS = [
            { code: 'CS', name: 'CSE' },
            { code: 'EC', name: 'ECE' },
            { code: 'CV', name: 'CIVIL' },
            { code: 'ME', name: 'MECH' }
        ];

        // 1. CLEANUP
        console.log('1. Cleaning Database for Batch 2024-2028...');

        // Find students to delete
        const studentsToDelete = await Student.find({ batch: BATCH });
        const studentUserIds = studentsToDelete.map(s => s.user);
        const studentIds = studentsToDelete.map(s => s._id);

        // Delete Users
        if (studentUserIds.length > 0) {
            await User.deleteMany({ _id: { $in: studentUserIds } });
        }

        // Delete Payments
        if (studentIds.length > 0) {
            await Payment.deleteMany({ student: { $in: studentIds } });
        }

        // Delete Students
        await Student.deleteMany({ batch: BATCH });

        // Delete Notifications specific to this batch (Optional but cleaner)
        // We delete notifications that have this batch in target and are created by this seeder logic (simplification)
        // To be safe, we just remove this batch from any notification, or delete if it's the only target.
        const notifications = await ExamNotification.find({ targetBatches: BATCH });
        for (const notif of notifications) {
            if (notif.targetBatches.length === 1 && notif.targetBatches[0] === BATCH) {
                await notif.deleteOne();
            } else {
                notif.targetBatches = notif.targetBatches.filter(b => b !== BATCH);
                await notif.save();
            }
        }

        console.log('   -> Cleaned up existing data for 2024-2028.');

        // 2. CONFIGURATION & NAMES
        const southIndianNames = [
            "Aditya", "Sai", "Karthik", "Ramesh", "Suresh", "Lakshmi", "Priya", "Swathi", "Ananya", "Rahul",
            "Vijay", "Arjun", "Deepak", "Sneha", "Divya", "Manish", "Varun", "Shruti", "Meghana", "Naveen", "Krishna"
        ];
        const northIndianNames = [
            "Aarav", "Vihaan", "Vivaan", "Adhik", "Rohan", "Sidharth", "Kiara", "Diya", "Ananya", "Riya",
            "Ishaan", "Dhruv", "Kabir", "Simran", "Pooja", "Neha", "Amit", "Raj", "Vikas", "Sanjay", "Ankit"
        ];

        const lastNames = [
            "Reddy", "Rao", "Nair", "Iyer", "Gowda", "Patil", "Sharma", "Verma", "Singh", "Gupta", "Kumar", "Mishra", "Joshi", "Mehta"
        ];

        const getRandomName = () => {
            const first = Math.random() > 0.5
                ? southIndianNames[Math.floor(Math.random() * southIndianNames.length)]
                : northIndianNames[Math.floor(Math.random() * northIndianNames.length)];
            const last = lastNames[Math.floor(Math.random() * lastNames.length)];
            return `${first} ${last}`;
        };

        // Semesters
        // Batch 2024-2028 Started in ~Aug 2024
        // 1-1: Aug 2024 - Dec 2024 (Exam Jan 2025)
        // 1-2: Jan 2025 - May 2025 (Exam Jun 2025)
        // 2-1: Aug 2025 - Dec 2025 (Exam Jan 2026) -> JUST FINISHED/CLEARED
        // 2-2: Jan 2026 - May 2026 (CURRENT)

        const historySteps = [
            { sem: 1, label: '1-1', examDate: '2025-01-10' },
            { sem: 2, label: '1-2', examDate: '2025-06-15' },
            { sem: 3, label: '2-1', examDate: '2025-12-20' }
        ];

        const currentSemStep = { sem: 4, label: '2-2', examDate: '2026-05-15' };
        // Note: 2-2 Exam Notification is 'Current', so date must be in future relative to "Now" (Jan 2026)
        // Actually, Exam Notification usually comes a month before.
        // If we render it as "ACTIVE", it should be open now.
        // Let's set start date to Jan 1st 2026, End date Feb 20th 2026.
        const currentNotificationConfig = {
            startDate: new Date('2026-01-02'),
            endDate: new Date('2026-02-15')
        };

        // 3. CREATE STUDENTS
        console.log('2. Creating Students...');
        let allStudents = [];

        for (const dept of DEPARTMENTS) {
            console.log(`   -> Seeding ${dept.name}...`);
            // Create 10 Students
            for (let i = 1; i <= 10; i++) {
                const serial = i.toString().padStart(3, '0');
                const usn = `1BV24${dept.code}${serial}`; // e.g., 1BV24CS001

                // Create User
                const user = await User.create({
                    username: usn,
                    password: '123', // Default Password
                    role: 'student',
                    name: getRandomName(),
                    email: `${usn.toLowerCase()}@bvce.edu`
                });

                // Quota Logic (Random)
                const rand = Math.random();
                let quota = 'government';
                let collegeFee = 25000; // Gov
                if (rand > 0.7) {
                    quota = 'management';
                    collegeFee = 150000;
                } else if (rand > 0.95) {
                    quota = 'nri';
                    collegeFee = 300000;
                }

                // Opt-ins
                const transportOpted = Math.random() > 0.6;
                const hostelOpted = Math.random() > 0.8;
                const placementOpted = false; // Usually not for 2nd year, mostly final year

                const transportFee = transportOpted ? 25000 : 0;
                const hostelFee = hostelOpted ? 80000 : 0;
                const placementFee = 0;

                // Create Student
                const student = await Student.create({
                    user: user._id,
                    usn: usn,
                    department: dept.name,
                    batch: BATCH,
                    currentYear: CURRENT_YEAR, // 2
                    quota: quota,
                    entry: 'regular',
                    status: 'active',

                    transportOpted,
                    hostelOpted,
                    placementOpted,

                    annualCollegeFee: collegeFee,
                    annualTransportFee: transportFee,
                    annualHostelFee: hostelFee,
                    annualPlacementFee: placementFee,

                    // Dues will be calculated/populated below
                    collegeFeeDue: 0,
                    transportFeeDue: 0,
                    hostelFeeDue: 0,
                    placementFeeDue: 0, // Will update based on 2-2 status

                    feeRecords: []
                });

                allStudents.push(student);
            }
        }

        // 4. GENERATE HISTORY (Sems 1, 2, 3 -> PAID)
        console.log('3. Generating History (Sems 1-1, 1-2, 2-1)...');

        for (const step of historySteps) {
            // A. Exam Notification (Past)
            const notif = await ExamNotification.create({
                title: `End Sem Exam ${step.label} (${step.examDate.split('-')[0]})`,
                year: Math.ceil(step.sem / 2),
                semester: step.sem,
                targetBatches: [BATCH],
                examFeeAmount: 1200,
                startDate: new Date(new Date(step.examDate).getTime() - 30 * 86400000), // 30 days before exam
                endDate: new Date(new Date(step.examDate).getTime() - 5 * 86400000), // 5 days before exam
                examType: 'regular',
                isActive: false
            });

            // B. Update Each Student
            for (const student of allStudents) {
                // 1. Exam Fee Payment (Completed)
                await Payment.create({
                    student: student._id,
                    amount: notif.examFeeAmount,
                    paymentType: 'exam_fee',
                    examNotificationId: notif._id,
                    status: 'completed',
                    transactionDate: notif.startDate,
                    razorpayPaymentId: `pay_hist_${step.sem}_${student.usn}`,
                    razorpayOrderId: `order_hist_${step.sem}_${student.usn}`
                });

                // 2. Academic Fees (College, Transport, etc.) -> PAID for these semesters
                // We assume Academic Fees are split by semester or just create records to show history.
                // College Fee Split
                const collegeSplit = student.annualCollegeFee / 2;
                student.feeRecords.push({
                    year: Math.ceil(step.sem / 2),
                    semester: step.sem,
                    feeType: 'college',
                    amountDue: collegeSplit,
                    amountPaid: collegeSplit,
                    status: 'paid',
                    transactions: [{ amount: collegeSplit, date: notif.startDate, mode: 'Online', reference: 'Historic' }]
                });

                // Transport (if opted)
                if (student.transportOpted) {
                    const transportSplit = student.annualTransportFee / 2;
                    student.feeRecords.push({
                        year: Math.ceil(step.sem / 2),
                        semester: step.sem,
                        feeType: 'transport',
                        amountDue: transportSplit,
                        amountPaid: transportSplit,
                        status: 'paid',
                        transactions: [{ amount: transportSplit, date: notif.startDate, mode: 'Online', reference: 'Historic' }]
                    });
                }
                // Hostel (if opted)
                if (student.hostelOpted) {
                    const hostelSplit = student.annualHostelFee / 2;
                    student.feeRecords.push({
                        year: Math.ceil(step.sem / 2),
                        semester: step.sem,
                        feeType: 'hostel',
                        amountDue: hostelSplit,
                        amountPaid: hostelSplit,
                        status: 'paid',
                        transactions: [{ amount: hostelSplit, date: notif.startDate, mode: 'Online', reference: 'Historic' }]
                    });
                }
            }
        }

        // 5. CURRENT SEMESTER (2-2) -> UNPAID
        console.log('4. Setting up Current Semester 2-2 (UNPAID)...');

        // A. Exam Notification (Active, Current)
        const activeNotif = await ExamNotification.create({
            title: `End Sem Exam 2-2 (May 2026)`,
            year: 2,
            semester: 4,
            targetBatches: [BATCH],
            examFeeAmount: 1500,
            startDate: currentNotificationConfig.startDate,
            endDate: currentNotificationConfig.endDate,
            examType: 'regular',
            description: 'Regular End Semester Examinations for 2nd Year, Semester 2. Fees must be paid before deadline.',
            isActive: true
        });

        // B. Update Each Student with Pending Fees
        for (const student of allStudents) {
            // NO Exam Payment created (So it appears as Unpaid/Pay Now)

            // Academic Fees for Sem 4 (Pending)
            const sem = 4;
            let totalPending = 0;

            // College
            const collegeSplit = student.annualCollegeFee / 2;
            student.feeRecords.push({
                year: 2, semester: sem, feeType: 'college', amountDue: collegeSplit, amountPaid: 0, status: 'pending'
            });
            student.collegeFeeDue += collegeSplit; // Update top level due

            // Transport
            if (student.transportOpted) {
                const transportSplit = student.annualTransportFee / 2;
                student.feeRecords.push({
                    year: 2, semester: sem, feeType: 'transport', amountDue: transportSplit, amountPaid: 0, status: 'pending'
                });
                student.transportFeeDue += transportSplit;
            }

            // Hostel
            if (student.hostelOpted) {
                const hostelSplit = student.annualHostelFee / 2;
                student.feeRecords.push({
                    year: 2, semester: sem, feeType: 'hostel', amountDue: hostelSplit, amountPaid: 0, status: 'pending'
                });
                student.hostelFeeDue += hostelSplit;
            }

            // Save Student
            await student.save();
        }

        console.log('--- RESET COMPLETE ---');
        console.log(`Generated ${allStudents.length} students for Batch 2024-2028.`);
        console.log('History (Sem 1, 2, 3) mapped as PAID.');
        console.log('Current Sem (Sem 4 / 2-2) mapped as PENDING.');

        process.exit();

    } catch (error) {
        console.error('Error in Reset Script:', error);
        process.exit(1);
    }
};

resetAndSeed2024Batch();
