require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const usn = '25231A01002';
        // Bypass Mongoose Model
        const student = await mongoose.connection.db.collection('students').findOne({ usn });

        let output = '';

        if (!student) {
            output += 'Student not found\n';
        } else {
            // Fetch User manually
            const user = await mongoose.connection.db.collection('users').findOne({ _id: student.user });

            output += `Student Found: ${user ? user.name : 'Unknown User'}\n`;
            output += `USN: ${student.usn}\n`;
            output += `Quota: ${student.quota}\n`;
            output += `Current Year: ${student.currentYear}\n`;
            output += `Top Level Dues: College=${student.collegeFeeDue}, Transport=${student.transportFeeDue}\n`;
            output += '--- Fee Records ---\n';

            if (student.feeRecords) {
                const sorted = student.feeRecords.sort((a, b) => a.year - b.year || a.semester - b.semester);

                sorted.forEach((r, idx) => {
                    output += `[${idx}] Y:${r.year} S:${r.semester} T:${r.feeType} Due:${r.amountDue} Paid:${r.amountPaid} St:${r.status}\n`;
                    if (r.transactions && r.transactions.length > 0) {
                        output += `    Tx: ${JSON.stringify(r.transactions.map(t => ({ amt: t.amount, mode: t.mode })))}\n`;
                    }
                });
            } else {
                output += 'No feeRecords found.\n';
            }
        }

        fs.writeFileSync('student_debug_raw.txt', output, { encoding: 'utf8' });
        console.log('Dumped to student_debug_raw.txt');

    } catch (error) {
        console.error(error);
        fs.writeFileSync('student_debug_error.txt', error.toString(), { encoding: 'utf8' });
    } finally {
        await mongoose.disconnect();
    }
};

run();
