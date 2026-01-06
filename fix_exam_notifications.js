const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ExamNotification = require('./models/ExamNotification');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const fixExamNotifications = async () => {
    try {
        console.log('--- EXAM NOTIFICATION CORRECTION SCRIPT ---');
        console.log('Applying strict Batch-Year Mapping rules...');

        // MAPPING: Year -> Regular Batch
        // Current Time: Jan 2026
        // Year 4: Batch 2022-2026
        // Year 3: Batch 2023-2027
        // Year 2: Batch 2024-2028
        // Year 1: Batch 2025-2029

        const yearToBatch = {
            4: '2022-2026',
            3: '2023-2027',
            2: '2024-2028',
            1: '2025-2029'
        };

        const notifications = await ExamNotification.find({});
        console.log(`Found ${notifications.length} notifications to review.`);

        for (const notif of notifications) {
            const examYear = notif.year;

            // 1. Determine Correct Regular Batch
            const regularBatch = yearToBatch[examYear];
            if (!regularBatch) {
                console.warn(`[WARN] Notification ${notif.title} has invalid year: ${examYear}. Skipping.`);
                continue;
            }

            // 2. Identify Current Target Batches
            let currentTargets = notif.targetBatches || [];

            // 3. APPLY RULES
            // Rule: Must include Regular Batch
            let newTargets = [regularBatch];

            // Rule: Supplementary Batches (Explicitly add higher years if needed, or rely on implicit logic)
            // The User Request says: "Add missing eligible higher-year batches where supplementary is allowed"
            // If the backend has implicit `year < currentYear` logic, we technically don't NEED to add them here.
            // HOWEVER, adding them makes it explicit and clear in the DB.
            // BUT, if we add them, we must ensure we don't violate "Visible ONLY to 4th year" for 4th year exams.

            if (examYear === 4) {
                // EXCEPTION: Final Year Exams -> ONLY Regular Batch (2022)
                // No higher batch exists.
                newTargets = [regularBatch];
            } else {
                // Lower Year Exams (1, 2, 3) -> Visible to Regular + Seniors
                // We add seniors to targetBatches explicitly to be safe and compliant with "Add missing" instruction.
                // Loop through years > examYear up to 4
                for (let y = examYear + 1; y <= 4; y++) {
                    const seniorBatch = yearToBatch[y];
                    if (seniorBatch) {
                        newTargets.push(seniorBatch);
                    }
                }
            }

            // Remove duplicates
            newTargets = [...new Set(newTargets)];

            // Check if changed
            const isChanged = JSON.stringify(currentTargets.sort()) !== JSON.stringify(newTargets.sort());

            if (isChanged) {
                console.log(`[FIX] Updating ${notif.title} (Year ${examYear})`);
                console.log(`       Old: ${JSON.stringify(currentTargets)}`);
                console.log(`       New: ${JSON.stringify(newTargets)}`);

                notif.targetBatches = newTargets;
                await notif.save();
            } else {
                console.log(`[OK] ${notif.title} (Year ${examYear}) matches rules.`);
            }
        }

        console.log('--- CORRECTION COMPLETE ---');
        process.exit();

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixExamNotifications();
