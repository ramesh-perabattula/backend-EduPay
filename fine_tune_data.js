const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Student = require('./models/Student');
const Payment = require('./models/Payment');
const ExamNotification = require('./models/ExamNotification');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const fineTuneData = async () => {
    try {
        console.log('--- STARTING FINE-TUNING SIMULATION ---');

        // 1. Current Semester Exam Fee Rule (Revert Payment if Paid)
        console.log('1. Enforcing Unpaid Status for Active Semester Exams...');

        // Find Active Notifications (These represent current/upcoming exams)
        const activeNotifications = await ExamNotification.find({ isActive: true });

        for (const notif of activeNotifications) {
            console.log(`   Processing Active Notif: ${notif.title} (Year ${notif.year})`);

            // Find payments linked to this notification
            const invalidPayments = await Payment.find({
                paymentType: 'exam_fee',
                'metadata.notificationId': notif._id,
                status: 'completed'
            });

            if (invalidPayments.length > 0) {
                console.log(`      Reverting ${invalidPayments.length} paid records to PENDING (Unpaid)...`);
                // Actually, we delete the PAYMENT record (because "Unpaid" means no record exists or pending status).
                // But my Payment model represents a Transaction. If it's done, it's done.
                // However, the rule is "Exam fee is NOT PAID".
                // So, these students should NOT have a 'completed' payment record for this Notification.

                await Payment.deleteMany({
                    paymentType: 'exam_fee',
                    'metadata.notificationId': notif._id
                });
            }
        }

        // 2. Varied Fee Structure (Admission, Training, etc.)
        console.log('2. Diversifying Student Fee Structures...');
        const students = await Student.find({});

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            let modified = false;

            // Varied Logic based on serial number (deterministically random)
            const seed = parseInt(student.usn.slice(-3));

            // Admission Fee (Only for ~20%)
            const hasAdmissionFee = (seed % 5 === 0);

            // Training Fee (Only for ~60%)
            const hasTrainingFee = (seed % 10 <= 6);

            // Update Annual Fee Configuration
            if (!hasTrainingFee) {
                if (student.annualPlacementFee > 0) {
                    student.annualPlacementFee = 0;
                    student.placementFeeDue = 0;
                    // Remove placement fee records
                    student.feeRecords = student.feeRecords.filter(r => r.feeType !== 'placement');
                    modified = true;
                }
            }

            // Update Transport/Hostel Consistency
            // If they are Day Scholar (Transport Opted = true OR false, Hostel = false)
            // If they are Hosteller (Hostel = true, Transport = false - typically)

            if (student.hostelOpted && student.transportOpted) {
                // Unlikely to have both. Remove Transport.
                student.transportOpted = false;
                student.annualTransportFee = 0;
                student.transportFeeDue = 0;
                student.feeRecords = student.feeRecords.filter(r => r.feeType !== 'transport');
                modified = true;
            }

            if (modified) {
                await student.save();
            }
        }

        // 3. Supplementary Exam Simulation
        console.log('3. Simulating Supplementary Exams for Upper Batches...');
        // Rule: Notification for Lower Batch -> Visible to Upper Batch -> Upper Batch takes Supplementary

        // Find Past Notifications (Year 1, Year 2...)
        const pastNotifications = await ExamNotification.find({ isActive: false });

        for (const notif of pastNotifications) {
            // Target Year of this exam
            const examYear = notif.year;

            // Who is an "Upper Batch"? Anyone currently in a higher year than the exam year.
            // e.g. Exam is Year 1. Upper batches are currently Year 2, 3, 4.

            const upperBatchStudents = await Student.find({
                currentYear: { $gt: examYear }
                // Note: strict logic would be students who were "senior" at the time, 
                // but for demo, we pick current seniors who effectively "missed" this back then or retaking.
            });

            // Randomly select ~10% of seniors to have taken this as supplementary
            for (const senior of upperBatchStudents) {
                if (Math.random() < 0.10) {
                    // Check if they already paid this (regular attempt)
                    const existingRegular = await Payment.findOne({
                        student: senior._id,
                        'metadata.notificationId': notif._id
                    });

                    if (!existingRegular) {
                        // They took it as supplementary
                        await Payment.create({
                            student: senior._id,
                            amount: notif.examFeeAmount, // Full fee or partial? Assuming full.
                            paymentId: `SUPP-EXAM-${notif.year}-${senior.usn}`,
                            status: 'completed',
                            paymentType: 'exam_fee',
                            description: `Supplementary Exam Fee - ${notif.title}`,
                            metadata: {
                                notificationId: notif._id,
                                year: notif.year,
                                isSupplementary: true
                            }
                        });
                        // Do NOT promote. Just paid.
                    }
                }
            }
        }

        console.log('--- ENHANCEMENTS APPLIED ---');
        console.log('1. Active Exam Payments Reverted (Students must pay now).');
        console.log('2. Fee Structures Varied (Training removed for 40%, Transport/Hostel fixed).');
        console.log('3. Supplementary Payments created for 10% of seniors.');

        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fineTuneData();
