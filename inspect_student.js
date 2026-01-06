require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('./models/Student');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const usn = '25231A01002';
        const student = await Student.findOne({ usn }).populate('user');

        if (!student) {
            console.log('Student not found with USN:', usn);
            // Try formatting? Or search by name
            const user = await User.findOne({ name: 'Simran Jain' });
            if (user) {
                const s = await Student.findOne({ user: user._id });
                if (s) {
                    console.log('Found by name Simran Jain -> USN:', s.usn);
                    printStudent(s);
                } else {
                    console.log('Found User Simran Jain but not Student profile');
                }
            }
            return;
        }

        printStudent(student);

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

function printStudent(student) {
    console.log('Student Found:', student.user?.name);
    console.log('USN:', student.usn);
    console.log('Quota:', student.quota);
    console.log('Current Year:', student.currentYear);
    console.log('Top Level Dues:', {
        collegeFeeDue: student.collegeFeeDue,
        transportFeeDue: student.transportFeeDue
    });

    console.log('--- Fee Records ---');
    // Sort records
    const sorted = student.feeRecords.sort((a, b) => a.year - b.year || a.semester - b.semester);

    sorted.forEach((r, idx) => {
        console.log(`[${idx}] Year: ${r.year}, Sem: ${r.semester}, Type: ${r.feeType}, Due: ${r.amountDue}, Paid: ${r.amountPaid}, Status: ${r.status}`);
        if (r.transactions && r.transactions.length > 0) {
            console.log('    Transactions:', r.transactions.map(t => ({ amount: t.amount, mode: t.mode })));
        }
    });
}

run();
