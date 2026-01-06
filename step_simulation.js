const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const ExamNotification = require('./models/ExamNotification');
const Payment = require('./models/Payment');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const stepByStepSimulation = async () => {
    try {
        console.log('--- STEP-BY-STEP SIMULATION (Batch 2022-2026) ---');

        const batchName = '2022-2026';

        // ---------------------------------------------------------
        // PHASE 1: YEAR 1, SEMESTER 1 (1-1)
        // ---------------------------------------------------------
        console.log('\nPHASE 1: Year 1, Semester 1 (1-1)');

        // 1. Clear Dues for Year 1 (Academic, Transport, etc.)
        console.log('   -> Clearing Academic Dues for Year 1...');
        let students = await Student.find({ batch: batchName });
        for (const student of students) {
            // Find pending Y1 records
            student.feeRecords.forEach(r => {
                if (r.year === 1 && r.status !== 'paid') {
                    r.status = 'paid';
                    r.amountPaid = r.amountDue;
                    r.transactions.push({
                        amount: r.amountDue,
                        date: new Date('2022-12-01'), // Backdated
                        mode: 'System-Auto',
                        reference: 'AUTO-CLEAR-Y1'
                    });
                }
            });
            // Reset top-level dues
            student.collegeFeeDue = 0;
            student.transportFeeDue = 0;
            student.hostelFeeDue = 0;
            student.placementFeeDue = 0;
            await student.save();
        }

        // 2. Create 1-1 Exam Notification
        console.log('   -> Creating Exam Notification (1-1)...');
        const exam1_1 = await ExamNotification.create({
            title: 'End Semester Exam Dec 2022 (1-1)',
            year: 1,
            semester: 1,
            targetBatches: [batchName],
            examFeeAmount: 1100,
            startDate: new Date('2022-12-15'),
            endDate: new Date('2022-12-30'),
            examType: 'regular',
            description: 'Regular exam for 1st Year, 1st Semester',
            isActive: false // Past exam
        });

        // 3. Pay Exam Fees for 1-1
        console.log('   -> Students paying Exam Fees (1-1)...');
        for (const student of students) {
            await Payment.create({
                student: student._id,
                amount: 1100,
                paymentId: `EXAM-1-1-${student.usn}`,
                status: 'completed',
                paymentType: 'exam_fee',
                metadata: { notificationId: exam1_1._id, year: 1, semester: 1 }
            });
        }


        // ---------------------------------------------------------
        // PHASE 2: YEAR 1, SEMESTER 2 (1-2)
        // ---------------------------------------------------------
        console.log('\nPHASE 2: Year 1, Semester 2 (1-2)');

        // 1. Create 1-2 Exam Notification
        console.log('   -> Creating Exam Notification (1-2)...');
        const exam1_2 = await ExamNotification.create({
            title: 'End Semester Exam May 2023 (1-2)',
            year: 1,
            semester: 2,
            targetBatches: [batchName],
            examFeeAmount: 1100,
            startDate: new Date('2023-05-15'),
            endDate: new Date('2023-05-30'),
            examType: 'regular',
            description: 'Regular exam for 1st Year, 2nd Semester',
            isActive: false // Past exam
        });

        // 2. Pay Exam Fees for 1-2
        console.log('   -> Students paying Exam Fees (1-2)...');
        for (const student of students) {
            await Payment.create({
                student: student._id,
                amount: 1100,
                paymentId: `EXAM-1-2-${student.usn}`,
                status: 'completed',
                paymentType: 'exam_fee',
                metadata: { notificationId: exam1_2._id, year: 1, semester: 2 }
            });
        }


        // ---------------------------------------------------------
        // PHASE 3: PROMOTION TO YEAR 2
        // ---------------------------------------------------------
        console.log('\nPHASE 3: Promotion to Year 2');

        console.log('   -> Promoting students to Year 2...');
        for (const student of students) {
            // Update Year
            student.currentYear = 2;

            // Generate Year 2 Fees
            const addFee = (type, amount) => {
                if (amount <= 0) return;
                const split = Math.ceil(amount / 2);
                student.feeRecords.push({ year: 2, semester: 3, feeType: type, amountDue: split, status: 'pending', amountPaid: 0, transactions: [] });
                student.feeRecords.push({ year: 2, semester: 4, feeType: type, amountDue: amount - split, status: 'pending', amountPaid: 0, transactions: [] });
            };

            addFee('college', student.annualCollegeFee);
            if (student.transportOpted) addFee('transport', student.annualTransportFee);
            if (student.hostelOpted) addFee('hostel', student.annualHostelFee);
            addFee('placement', student.annualPlacementFee);

            // Set Dues for Year 2
            student.collegeFeeDue = student.annualCollegeFee;
            student.transportFeeDue = student.annualTransportFee;
            student.hostelFeeDue = student.annualHostelFee;
            student.placementFeeDue = student.annualPlacementFee;

            await student.save();
        }

        console.log('--- SIMULATION COMPLETE ---');
        console.log('Batch 2022-2026 is now in YEAR 2.');
        console.log('Past Exams (1-1, 1-2) created and paid.');
        console.log('Year 1 Dues cleared.');
        console.log('Year 2 Dues generated and pending.');

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

stepByStepSimulation();
