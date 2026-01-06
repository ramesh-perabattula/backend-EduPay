const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ExamNotification = require('./models/ExamNotification');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const fixHistoricNotifications = async () => {
    try {
        console.log('--- HISTORIC EXAM NOTIFICATION FIX ---');
        console.log('Enforcing: Batch Existence Rule & Strict History');

        const notifications = await ExamNotification.find({});
        console.log(`Auditing ${notifications.length} notifications...`);

        let updatedCount = 0;

        for (const notif of notifications) {
            const startYear = notif.startDate.getFullYear();
            const startMonth = notif.startDate.getMonth(); // 0-11

            // Determine Academic Year Start for this notification
            // If month is Jan-July (0-6), it belongs to previous year's academic cycle started in Aug usually.
            // e.g. May 2026 belongs to 2025-2026 Acad Year.
            // e.g. Dec 2025 belongs to 2025-2026 Acad Year.
            const academicYearStart = startMonth < 7 ? startYear - 1 : startYear;

            const examYear = notif.year; // 1, 2, 3, 4

            // Calculate "Ideal" Regular Batch Start Year
            // Year 1 exam in 2025-26 -> Batch 2025
            // Year 4 exam in 2025-26 -> Batch 2022
            const regularBatchStartYear = academicYearStart - (examYear - 1);
            const regularBatchEndYear = regularBatchStartYear + 4;
            const regularBatchLabel = `${regularBatchStartYear}-${regularBatchEndYear}`;

            console.log(`\nReviewing: "${notif.title}"`);
            console.log(`   -> Date: ${notif.startDate.toISOString().split('T')[0]} (Acad Year: ${academicYearStart})`);
            console.log(`   -> Exam Year: ${examYear} => Regular Batch: ${regularBatchLabel}`);

            let newTargets = [];

            // 1. Always enforce the Regular Batch
            newTargets.push(regularBatchLabel);

            // 2. Process Existing Targets (Preserve Supplementary Logic, Remove Invalid Future Batches)
            // Existing targets might include seniors (supplementary).
            // We verify if they are valid "Seniors" (Start Year < Regular Batch Start Year)
            // And definitely NOT Juniors (Start Year > Regular Batch Start Year)

            // User Rule: "Only batches 2022-2026 and 2023-2027 can exist" (at time of notif)

            const existingTargets = notif.targetBatches || [];

            for (const batch of existingTargets) {
                if (batch === regularBatchLabel) continue; // Already added

                const batchStart = parseInt(batch.split('-')[0]);

                // Rule: Batch must have existed at Notification Time
                // Batch started in Aug `batchStart`. 
                // Notification is in `academicYearStart`.
                // If batchStart > academicYearStart, it's a FUTURE batch. INVALID.
                if (batchStart > academicYearStart) {
                    console.log(`   [REMOVE] ${batch} (Future batch relative to ${academicYearStart})`);
                    continue;
                }

                // Rule: Lower-year batches cannot see Higher-year exams
                // i.e. Batch logic check.
                // If I am Batch 2023. Regular is 2022.
                // I am Junior. I cannot take this exam.
                if (batchStart > regularBatchStartYear) {
                    console.log(`   [REMOVE] ${batch} (Junior batch for this exam)`);
                    continue;
                }

                // Rule: Higher-year batches (Seniors) can see it (Supplementary)
                if (batchStart < regularBatchStartYear) {
                    // Valid Senior
                    newTargets.push(batch);
                }
            }

            // Remove duplicates and sort
            newTargets = [...new Set(newTargets)].sort();

            // 3. User Requirement: "Update all existing notifications to remove invalid batch selections"
            // We have reconstructed newTargets based on Strict Existence + Hierarchy.

            const isChanged = JSON.stringify(notif.targetBatches.sort()) !== JSON.stringify(newTargets.sort());

            if (isChanged) {
                console.log(`   [UPDATE] Targets changed:`);
                console.log(`       Old: ${JSON.stringify(notif.targetBatches)}`);
                console.log(`       New: ${JSON.stringify(newTargets)}`);
                notif.targetBatches = newTargets;
                await notif.save();
                updatedCount++;
            } else {
                console.log(`   [OK] Targets valid: ${JSON.stringify(newTargets)}`);
            }
        }

        console.log(`\n--- FIXED ${updatedCount} NOTIFICATIONS ---`);
        process.exit();

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixHistoricNotifications();
