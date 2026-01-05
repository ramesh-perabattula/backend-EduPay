const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const ExamNotification = require('./models/ExamNotification');
const LibraryRecord = require('./models/LibraryRecord');
const Payment = require('./models/Payment');
const connectDB = require('./config/db');

dotenv.config();

connectDB();

const importData = async () => {
    try {
        const rolesToReset = [
            'admin', 'admission_officer', 'hostel_manager', 'librarian',
            'placement_officer', 'transport_dept', 'registrar', 'exam_head', 'student'
        ];

        console.log('Clearing database...');
        await User.deleteMany({ role: { $in: rolesToReset } });
        await Student.deleteMany({});
        await ExamNotification.deleteMany({});
        await LibraryRecord.deleteMany({});
        await Payment.deleteMany({});
        console.log('All data cleared.');

        const newUsers = [
            { username: 'admin', password: '123', role: 'admin', name: 'System Admin', email: 'admin@college.edu' },
            { username: 'admission_officer', password: '123', role: 'admission_officer', name: 'Admission Officer', email: 'admission@college.edu' },
            { username: 'hostel_admin', password: '123', role: 'hostel_manager', name: 'Hostel Admin', email: 'hostel@college.edu' },
            { username: 'librarian', password: '123', role: 'librarian', name: 'Librarian', email: 'librarian@college.edu' },
            { username: 'training_dept', password: '123', role: 'placement_officer', name: 'Training Department', email: 'training@college.edu' },
            { username: 'transport', password: '123', role: 'transport_dept', name: 'Transport', email: 'transport@college.edu' },
            { username: 'enrollment_help_desk', password: '123', role: 'registrar', name: 'Student Enrollment Help Desk', email: 'enrollment@college.edu' },
            { username: 'exam_head', password: '123', role: 'exam_head', name: 'Chief of Examinations', email: 'examhead@college.edu' }
        ];

        console.log('Creating admin users...');
        await User.create(newUsers);

        // ---------------------------------------------------------
        // Bulk Student Generation
        // ---------------------------------------------------------
        console.log('Seeding 10 Students per Department...');

        const departments = [
            { code: '01', name: 'CSE', mgmtFee: 220000 },
            { code: '02', name: 'ISE', mgmtFee: 200000 },
            { code: '03', name: 'MECH', mgmtFee: 120000 },
            { code: '04', name: 'ECE', mgmtFee: 150000 },
            { code: '05', name: 'CIVIL', mgmtFee: 120000 }
        ];

        const firstNames = [
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
            "Diya", "Saanvi", "Ananya", "Aadhya", "Pari", "Anika", "Navya", "Angel", "Shruti", "Riya",
            "Manish", "Rahul", "Priya", "Sneha", "Karthik", "Deepak", "Sanjay", "Vikram", "Neha", "Pooja",
            "Rohan", "Suresh", "Ramesh", "Gita", "Sita", "Lakshmi", "Bhavya", "Divya", "Swati", "Kavya",
            "Arun", "Varun", "Tarun", "Kiran", "Suman", "Amit", "Sumit", "Anil", "Sunil", "Raj"
        ];

        const lastNames = [
            "Sharma", "Verma", "Gupta", "Malhotra", "Bhat", "Rao", "Reddy", "Nair", "Patel", "Mehta",
            "Singh", "Yadav", "Kumar", "Das", "Banerjee", "Chatterjee", "Iyer", "Gowda", "Hegde", "Shetty",
            "Desai", "Joshi", "Kulkarni", "Naik", "Kamath", "Prabhu", "Shenoy", "Pai", "Acharya", "Bhandary"
        ];

        const getRandomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        const getRandomBook = (dept) => {
            const common = ["Engineering Mathematics", "Constitution of India", "Environmental Studies"];
            const specific = {
                'CSE': ["C Programming", "Data Structures", "Operating Systems"],
                'ISE': ["File Structures", "Unix Programming", "Web Technology"],
                'ECE': ["Analog Circuits", "Digital Electronics", "Signal Processing"],
                'MECH': ["Thermodynamics", "Fluid Mechanics", "Kinematics"],
                'CIVIL': ["Strength of Materials", "Surveying", "Concrete Technology"]
            };
            const pool = [...common, ...(specific[dept] || [])];
            return pool[Math.floor(Math.random() * pool.length)];
        };

        const currentYear = 1;
        const trainingFee = 15000;

        for (const dept of departments) {
            console.log(`Generating students for ${dept.name}...`);

            for (let i = 1; i <= 10; i++) {
                // Determine Quota & Attributes based on index to ensure variety
                // 1-4: Gov Free, 5-6: Gov Paid, 7-9: Mgmt, 10: NRI
                let quota = 'government';
                let collegeFee = 0;

                if (i <= 4) {
                    quota = 'government';
                    collegeFee = 0;
                } else if (i <= 6) {
                    quota = 'government';
                    collegeFee = 45000;
                } else if (i <= 9) {
                    quota = 'management';
                    collegeFee = dept.mgmtFee;
                } else {
                    quota = 'nri';
                    collegeFee = dept.mgmtFee * 2.5;
                }

                // Randomize Hostel/Transport
                const transportOpted = Math.random() > 0.5;
                const hostelOpted = !transportOpted && Math.random() > 0.3; // If not transport, likely hostel

                const transportFee = transportOpted ? (25000 + Math.floor(Math.random() * 10) * 1000) : 0;
                const hostelFee = hostelOpted ? (75000 + Math.floor(Math.random() * 40) * 1000) : 0;

                const serial = i.toString().padStart(2, '0');
                const usn = `25221A${dept.code}${serial}`; // e.g., 25221A0401
                const name = getRandomName();

                // Create User
                const user = await User.create({
                    username: usn,
                    password: '123',
                    role: 'student',
                    name: name,
                    email: `${name.toLowerCase().replace(/\s/g, '.')}@bvce.edu`
                });

                // Fee Records (Split by Sem)
                const feeRecords = [];
                const addFeeLog = (type, amount) => {
                    const split = Math.ceil(amount / 2);
                    feeRecords.push({ year: currentYear, semester: 1, feeType: type, amountDue: split, amountPaid: 0, status: 'pending' });
                    feeRecords.push({ year: currentYear, semester: 2, feeType: type, amountDue: amount - split, amountPaid: 0, status: 'pending' });
                };

                if (collegeFee > 0) addFeeLog('college', collegeFee);
                if (transportOpted) addFeeLog('transport', transportFee);
                if (hostelOpted) addFeeLog('hostel', hostelFee);
                addFeeLog('placement', trainingFee);

                const student = await Student.create({
                    user: user._id,
                    usn: usn,
                    department: dept.name,
                    currentYear: currentYear,
                    quota: quota,
                    entry: 'regular',
                    status: 'active',

                    transportOpted,
                    transportRoute: transportOpted ? ['Majestic', 'Silk Board', 'Whitefield', 'Kengeri'][Math.floor(Math.random() * 4)] : '',
                    hostelOpted,
                    placementOpted: true,

                    annualCollegeFee: collegeFee,
                    annualTransportFee: transportFee,
                    annualHostelFee: hostelFee,
                    annualPlacementFee: trainingFee,

                    collegeFeeDue: collegeFee,
                    transportFeeDue: transportFee,
                    hostelFeeDue: hostelFee,
                    placementFeeDue: trainingFee,

                    feeRecords: feeRecords
                });

                // Random Library Books (50% chance)
                if (Math.random() > 0.5) {
                    const bookCount = Math.floor(Math.random() * 3) + 1;
                    for (let b = 1; b <= bookCount; b++) {
                        await LibraryRecord.create({
                            student: student._id,
                            usn: usn,
                            bookTitle: getRandomBook(dept.name),
                            bookId: `LIB-${usn.slice(-4)}-${b}`,
                            borrowedDate: new Date(),
                            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
                            status: 'borrowed'
                        });
                    }
                }
            }
        }

        console.log('Seeder completed successfully: 10 Students per Department generated.');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

importData();
