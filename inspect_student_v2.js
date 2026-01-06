require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const fs = require('fs');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const usn = '25231A01002';
        const student = await Student.findOne({ usn }).populate('user');

        let output = '';

        if (!student) {
            output += 'Student not found\n';
        } else {
            output += `Student Found: ${student.user?.name}\n`;
            output += `USN: ${student.usn}\n`;
            output += `Quota: ${student.quota}\n`;
            output += `Current Year: ${student.currentYear}\n`;
            output += `Top Level Dues: College=${student.collegeFeeDue}, Transport=${student.transportFeeDue}\n`;
            output += '--- Fee Records ---\n';

            const sorted = student.feeRecords.sort((a, b) => a.year - b.year || a.semester - b.semester);

            sorted.forEach((r, idx) => {
                output += `[${idx}] Y:${r.year} S:${r.semester} T:${r.feeType} Due:${r.amountDue} Paid:${r.amountPaid} St:${r.status}\n`;
                if (r.transactions && r.transactions.length > 0) {
                    output += `    Tx: ${JSON.stringify(r.transactions.map(t => ({ amt: t.amount, mode: t.mode })))}\n`;
                }
            });
        }

        fs.writeFileSync('student_debug.txt', output, { encoding: 'utf8' });
        console.log('Dumped to student_debug.txt');

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
