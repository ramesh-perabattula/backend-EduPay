const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Payment = require('./models/Payment');
const ExamNotification = require('./models/ExamNotification');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const resetAndSeed2025Batch = async () => {
    try {
        console.log('--- RESET & SEED: BATCH 2025-2029 (TARGET 1-2) ---');

        const BATCH = '2025-2029';
        const CURRENT_YEAR = 1; // 1st Year

        // Departments Mapping
        const DEPARTMENTS = [
            { code: 'CS', name: 'CSE' },
            { code: 'EC', name: 'ECE' },
            { code: 'CV', name: 'CIVIL' },
            { code: 'ME', name: 'MECH' }
        ];

        // 1. CLEANUP
        console.log('1. Cleaning Database for Batch 2025-2029...');

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

        // Delete Notifications specific to this batch
        const notifications = await ExamNotification.find({ targetBatches: BATCH });
        for (const notif of notifications) {
            if (notif.targetBatches.length === 1 && notif.targetBatches[0] === BATCH) {
                await notif.deleteOne();
            } else {
                notif.targetBatches = notif.targetBatches.filter(b => b !== BATCH);
                await notif.save();
            }
        }

        console.log('   -> Cleaned up existing data for 2025-2029.');

        // 2. CONFIGURATION & NAMES
        const southIndianNames = [
            "Arun", "Bala", "Chandra", "Deva", "Eswar", "Ganesh", "Hari", "Indra", "Jaya", "Kiran",
            "Lakshmi", "Madhav", "Nithin", "Omkar", "Prasad", "Raghu", "Siva", "Tharun", "Uma", "Venkatesh"
        ];
        const northIndianNames = [
            "Aadil", "Bhavesh", "Chirag", "Daksh", "Eshan", "Farhan", "Gourav", "Himanshu", "Ishwar", "Jatin",
            "Kunal", "Lalit", "Manav", "Naman", "Om", "Pranav", "Rajat", "Sahil", "Tushar", "Utkarsh"
        ];

        const lastNames = [
            "Acharya", "Bhat", "Chopra", "Desai", "Gupta", "Hegde", "Jain", "Kapoor", "Malhotra", "Nayak",
            "Patel", "Reddy", "Sharma", "Singh", "Tiwari", "Verma", "Yadav"
        ];

        const getRandomName = () => {
            const first = Math.random() > 0.5
                ? southIndianNames[Math.floor(Math.random() * southIndianNames.length)]
                : northIndianNames[Math.floor(Math.random() * northIndianNames.length)];
            const last = lastNames[Math.floor(Math.random() * lastNames.length)];
            return `${first} ${last}`;
        };

        // Semesters
        // Batch 2025-2029 Started in ~Aug 2025
        // Current Time: Jan 5, 2026
        // 1-1: Aug 2025 - Dec 2025 (Exam Dec 2025/Jan 2026) -> FINISHED
        // 1-2: Jan 2026 - May 2026 (CURRENT)

        const historySteps = [
            { sem: 1, label: '1-1', examDate: '2025-12-15' }
        ];

        // Current Exam Notification Config
        // Typically notifications come out a month before.
        // User wants it ACTIVE.
        const currentNotificationConfig = {
            startDate: new Date('2026-01-05'), // Started Today
            endDate: new Date('2026-02-28') // Due later
        };

        // 3. CREATE STUDENTS
        console.log('2. Creating Students...');
        let allStudents = [];

        for (const dept of DEPARTMENTS) {
            console.log(`   -> Seeding ${dept.name}...`);
            // Create 10 Students
            for (let i = 1; i <= 10; i++) {
                const serial = i.toString().padStart(3, '0');
                const usn = `1BV25${dept.code}${serial}`; // e.g., 1BV25CS001

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
                let collegeFee = 28000; // Gov (slightly higher for newer batch?)
                if (rand > 0.7) {
                    quota = 'management';
                    collegeFee = 160000;
                } else if (rand > 0.95) {
                    quota = 'nri';
                    collegeFee = 320000;
                }

                // Opt-ins
                const transportOpted = Math.random() > 0.5;
                const hostelOpted = Math.random() > 0.7;
                const placementOpted = false; // 1st year no placement

                const transportFee = transportOpted ? 26000 : 0;
                const hostelFee = hostelOpted ? 85000 : 0;
                const placementFee = 0;

                // Create Student
                const student = await Student.create({
                    user: user._id,
                    usn: usn,
                    department: dept.name,
                    batch: BATCH,
                    currentYear: CURRENT_YEAR, // 1
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
                    placementFeeDue: 0,

                    feeRecords: []
                });

                allStudents.push(student);
            }
        }

        // 4. GENERATE HISTORY (Sem 1-1 -> PAID)
        console.log('3. Generating History (Sem 1-1)...');

        for (const step of historySteps) {
            // A. Exam Notification (Past)
            const notif = await ExamNotification.create({
                title: `End Sem Exam ${step.label} (${step.examDate.split('-')[0]})`,
                year: Math.ceil(step.sem / 2),
                semester: step.sem,
                targetBatches: [BATCH],
                examFeeAmount: 1200,
                startDate: new Date(new Date(step.examDate).getTime() - 30 * 86400000),
                endDate: new Date(new Date(step.examDate).getTime() - 5 * 86400000),
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

                // 2. Academic Fees (College, Transport, etc.) -> PAID for Sem 1
                const collegeSplit = student.annualCollegeFee / 2;
                student.feeRecords.push({
                    year: Math.ceil(step.sem / 2),
                    semester: step.sem,
                    feeType: 'college',
                    amountDue: collegeSplit,
                    amountPaid: collegeSplit,
                    status: 'paid', // Paid
                    transactions: [{ amount: collegeSplit, date: notif.startDate, mode: 'Online', reference: 'Historic' }]
                });

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

        // 5. CURRENT SEMESTER (1-2) -> UNPAID
        console.log('4. Setting up Current Semester 1-2 (UNPAID)...');

        // A. Exam Notification (Active, Current)
        // User Requirement: "Create the exam notification as CURRENT"
        const activeNotif = await ExamNotification.create({
            title: `End Sem Exam 1-2 (May 2026)`,
            year: 1,
            semester: 2,
            targetBatches: [BATCH],
            examFeeAmount: 1300,
            startDate: currentNotificationConfig.startDate,
            endDate: currentNotificationConfig.endDate,
            examType: 'regular',
            description: 'Regular End Semester Examinations for 1st Year. Please pay before the deadline.',
            isActive: true
        });

        // B. Update Each Student with Pending Fees
        for (const student of allStudents) {
            // NO Exam Payment created (So it appears as Unpaid/Pay Now)

            // Academic Fees for Sem 2 (Pending)
            const sem = 2;

            // College
            const collegeSplit = student.annualCollegeFee / 2;
            student.feeRecords.push({
                year: 1, semester: sem, feeType: 'college', amountDue: collegeSplit, amountPaid: 0, status: 'pending'
            });
            student.collegeFeeDue += collegeSplit; // Update top level due

            // Transport
            if (student.transportOpted) {
                const transportSplit = student.annualTransportFee / 2;
                student.feeRecords.push({
                    year: 1, semester: sem, feeType: 'transport', amountDue: transportSplit, amountPaid: 0, status: 'pending'
                });
                student.transportFeeDue += transportSplit;
            }

            // Hostel
            if (student.hostelOpted) {
                const hostelSplit = student.annualHostelFee / 2;
                student.feeRecords.push({
                    year: 1, semester: sem, feeType: 'hostel', amountDue: hostelSplit, amountPaid: 0, status: 'pending'
                });
                student.hostelFeeDue += hostelSplit;
            }

            // Save Student
            await student.save();
        }

        console.log('--- RESET COMPLETE ---');
        console.log(`Generated ${allStudents.length} students for Batch 2025-2029.`);
        console.log('History (Sem 1-1) mapped as PAID.');
        console.log('Current Sem (Sem 1-2) mapped as PENDING.');

        process.exit();

    } catch (error) {
        console.error('Error in Reset Script:', error);
        process.exit(1);
    }
};

resetAndSeed2025Batch();
