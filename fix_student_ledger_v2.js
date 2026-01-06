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

            // 0. Recalculate amountPaid from Transactions (Sanity Check)
            student.feeRecords.forEach(r => {
                if (r.transactions && r.transactions.length > 0) {
                    const realPaid = r.transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
                    // Filter out auto-transfers that are NEGATIVE? No, my transfer logic reduced amountPaid directly.
                    // Wait, if I reduce amountPaid, I should ADD a negative transaction?
                    // In previous script: r.amountPaid -= toTransfer; target.amountPaid += toTransfer;
                    // I did NOT add a negative transaction to source.
                    // So if I recalculate from transactions (which are 70k + 140k), I will restore 210k.
                    // This is correct.

                    if (r.amountPaid !== realPaid) {
                        console.log(`[${student.usn}] Fixed mismatch in Y${r.year}S${r.semester}: Paid ${r.amountPaid} -> ${realPaid}`);
                        r.amountPaid = realPaid;
                        modified = true;
                    }
                }
            });

            // 1. Redistribute Excess Payments
            const records = student.feeRecords.filter(r => r.feeType === 'college');

            records.forEach(r => {
                if (r.amountPaid > r.amountDue) {
                    const currentYear = student.currentYear;

                    for (let y = 1; y <= currentYear; y++) {
                        const semA = (y * 2) - 1;
                        const semB = y * 2;

                        [semA, semB].forEach(sem => {
                            if (y === r.year && sem === r.semester) return;

                            // Find or Create Record
                            let targetRecord = student.feeRecords.find(tr => tr.year === y && tr.semester === sem && tr.feeType === 'college');

                            if (!targetRecord) {
                                const feeAmount = student.annualCollegeFee ? Math.ceil(student.annualCollegeFee / 2) : 35000;
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

                            const pending = targetRecord.amountDue - targetRecord.amountPaid;
                            // Check source Excess again (it decreases as we transfer)
                            const sourceExcess = r.amountPaid - r.amountDue;

                            if (pending > 0 && sourceExcess > 0) {
                                const toTransfer = Math.min(pending, sourceExcess);

                                r.amountPaid -= toTransfer;
                                targetRecord.amountPaid += toTransfer;
                                targetRecord.status = targetRecord.amountPaid >= targetRecord.amountDue ? 'paid' : 'partial';

                                // Add transfer transactions
                                targetRecord.transactions.push({
                                    amount: toTransfer,
                                    mode: 'Auto-Transfer',
                                    date: new Date(),
                                    reference: `Transfer from Y${r.year}S${r.semester}`
                                });

                                // IMPORTANT: Add NEGATIVE transaction to source to keep history consistent?
                                // If we don't, next recalculation will restore excess.
                                r.transactions.push({
                                    amount: -toTransfer, // Negative amount
                                    mode: 'Auto-Transfer-Out',
                                    date: new Date(),
                                    reference: `Transfer to Y${targetRecord.year}S${targetRecord.semester}`
                                });

                                console.log(`[${student.usn}] Transferred ${toTransfer} from Y${r.year}S${r.semester} to Y${y}S${sem}`);
                                modified = true;
                            }
                        });
                    }

                    r.status = r.amountPaid >= r.amountDue ? 'paid' : (r.amountPaid > 0 ? 'partial' : 'pending');
                }
            });

            if (modified) {
                const totalCollegeDue = student.feeRecords
                    .filter(r => r.feeType === 'college' && r.year === student.currentYear)
                    .reduce((sum, r) => sum + r.amountDue, 0);

                student.collegeFeeDue = totalCollegeDue;
                student.markModified('feeRecords'); // Crucial

                await student.save();
                console.log(`Saved changes for ${student.user?.name}`);
            }
        }

        console.log('Fix V2 complete.');

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
