require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Student = require('./models/Student');
const SystemConfig = require('./models/SystemConfig');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const students = await Student.find({}).populate('user');
        console.log(`Processing ${students.length} students...`);

        for (const student of students) {
            let modified = false;

            // 1. Merge Duplicates (Same Year, Sem, Type)
            const signatureMap = new Map();
            const uniqueRecords = [];

            // Sort to prefer records with Due > 0
            student.feeRecords.sort((a, b) => b.amountDue - a.amountDue);

            student.feeRecords.forEach(r => {
                const key = `${r.year}-${r.semester}-${r.feeType}`;
                if (signatureMap.has(key)) {
                    // Merge!
                    const existing = signatureMap.get(key);
                    console.log(`[${student.usn}] Merging duplicate for ${key}`);

                    existing.amountPaid += (r.amountPaid || 0);
                    // Merge transactions
                    if (r.transactions && r.transactions.length > 0) {
                        existing.transactions.push(...r.transactions);
                    }
                    if (r.amountDue > existing.amountDue) existing.amountDue = r.amountDue; // Take max due

                    modified = true;
                } else {
                    signatureMap.set(key, r);
                    uniqueRecords.push(r);
                }
            });

            student.feeRecords = uniqueRecords;

            // 2. Redistribute Excess Payments to Missing History
            // Calculate Total Paid vs Total Due per type
            // Identify Excess

            // We focus on 'college' fee mainly
            const records = student.feeRecords.filter(r => r.feeType === 'college');

            // Check for negative pending (Paid > Due) in specific records
            records.forEach(r => {
                if (r.amountPaid > r.amountDue) {
                    const excess = r.amountPaid - r.amountDue;
                    console.log(`[${student.usn}] Found excess payment of ${excess} in Y${r.year}S${r.semester}`);

                    // Look for unpaid past records OR create them
                    // We need to look at entire history up to Current Year
                    const currentYear = student.currentYear;

                    // Iterate years from 1 to currentYear
                    for (let y = 1; y <= currentYear; y++) {
                        const semA = (y * 2) - 1;
                        const semB = y * 2;

                        [semA, semB].forEach(sem => {
                            // Don't redistribute to the SAME record that has excess
                            if (y === r.year && sem === r.semester) return;

                            // Find or Create Record
                            let targetRecord = student.feeRecords.find(tr => tr.year === y && tr.semester === sem && tr.feeType === 'college');

                            if (!targetRecord) {
                                // Create Missing Record
                                // Default Fee?
                                const feeAmount = student.annualCollegeFee ? Math.ceil(student.annualCollegeFee / 2) : 35000; // Fallback

                                targetRecord = {
                                    year: y,
                                    semester: sem,
                                    feeType: 'college',
                                    amountDue: feeAmount,
                                    amountPaid: 0,
                                    status: 'pending',
                                    transactions: []
                                };
                                student.feeRecords.push(targetRecord);
                                console.log(`[${student.usn}] Created missing record Y${y}S${sem}`);
                                modified = true;
                            }

                            // Check if target needs payment
                            const pending = targetRecord.amountDue - targetRecord.amountPaid;
                            if (pending > 0 && r.amountPaid > r.amountDue) {
                                // Move excess from 'r' to 'targetRecord'
                                const availableExcess = r.amountPaid - r.amountDue;
                                const toTransfer = Math.min(pending, availableExcess);

                                r.amountPaid -= toTransfer;
                                targetRecord.amountPaid += toTransfer;
                                targetRecord.status = targetRecord.amountPaid >= targetRecord.amountDue ? 'paid' : 'partial';

                                // Move transaction (symbolic - creating a transfer log)
                                targetRecord.transactions.push({
                                    amount: toTransfer,
                                    mode: 'Auto-Transfer',
                                    date: new Date(),
                                    reference: `Transfer from Y${r.year}S${r.semester}`
                                });

                                console.log(`[${student.usn}] Transferred ${toTransfer} from Y${r.year}S${r.semester} to Y${y}S${sem}`);
                                modified = true;
                            }
                        });
                    }

                    // Normalize the source record status
                    r.status = r.amountPaid >= r.amountDue ? 'paid' : (r.amountPaid > 0 ? 'partial' : 'pending');
                }
            });

            // Re-calculate top level totals
            if (modified) {
                const totalCollegeDue = student.feeRecords
                    .filter(r => r.feeType === 'college' && r.year === student.currentYear)
                    .reduce((sum, r) => sum + r.amountDue, 0);

                student.collegeFeeDue = totalCollegeDue;
                // Note: collegeFeeDue usually tracks current outstanding balance or current year due? 
                // In this system it seems to track Current Year Total Fee.

                await student.save();
                console.log(`Saved changes for ${student.user?.name}`);
            }
        }

        console.log('Fix complete.');

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
