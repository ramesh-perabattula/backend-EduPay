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
        console.log('Seeding Students for multiple batches (All starting at Year 1)...');

        const departments = [
            { code: '01', name: 'CSE', mgmtFee: 220000 },
            { code: '03', name: 'MECH', mgmtFee: 120000 },
            { code: '04', name: 'ECE', mgmtFee: 150000 },
            { code: '05', name: 'CIVIL', mgmtFee: 120000 }
        ];

        const firstNames = [
            "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
            "Diya", "Saanvi", "Ananya", "Aadhya", "Pari", "Anika", "Navya", "Angel", "Shruti", "Riya",
            "Manish", "Rahul", "Priya", "Sneha", "Karthik", "Deepak", "Sanjay", "Vikram", "Neha", "Pooja",
            "Rohan", "Suresh", "Ramesh", "Gita", "Sita", "Lakshmi", "Bhavya", "Divya", "Swati", "Kavya",
            "Arun", "Varun", "Tarun", "Kiran", "Suman", "Amit", "Sumit", "Anil", "Sunil", "Raj",
            "Nikhil", "Akash", "Vikas", "Vishal", "Ashish", "Abhishek", "Rakesh", "Mukesh", "Naresh", "Suresh"
        ];

        const lastNames = [
            "Sharma", "Verma", "Gupta", "Malhotra", "Bhat", "Rao", "Reddy", "Nair", "Patel", "Mehta",
            "Singh", "Yadav", "Kumar", "Das", "Banerjee", "Chatterjee", "Iyer", "Gowda", "Hegde", "Shetty",
            "Desai", "Joshi", "Kulkarni", "Naik", "Kamath", "Prabhu", "Shenoy", "Pai", "Acharya", "Bhandary",
            "Jain", "Agarwal", "Mishra", "Dubey", "Pandey", "Tiwari", "Chopra", "Kapoor", "Khan", "Ali"
        ];

        const getRandomName = () => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;

        const getRandomBook = (dept) => {
            const common = ["Engineering Mathematics", "Constitution of India", "Environmental Studies"];
            const specific = {
                'CSE': ["C Programming", "Data Structures", "Operating Systems", "Algorithms", "Database Management"],
                'ISE': ["File Structures", "Unix Programming", "Web Technology", "Software Architectures", "Cloud Computing"],
                'ECE': ["Analog Circuits", "Digital Electronics", "Signal Processing", "Communication Systems", "VLSI"],
                'MECH': ["Thermodynamics", "Fluid Mechanics", "Kinematics", "Machine Design", "Heat Transfer"],
                'CIVIL': ["Strength of Materials", "Surveying", "Concrete Technology", "Geotech", "Hydraulics"]
            };
            const pool = [...common, ...(specific[dept] || [])];
            return pool[Math.floor(Math.random() * pool.length)];
        };

        const batchConfigs = [
            { batch: '2022-2026', currentYear: 1, usnPrefix: '22' },
            { batch: '2023-2027', currentYear: 1, usnPrefix: '23' },
            { batch: '2024-2028', currentYear: 1, usnPrefix: '24' },
            { batch: '2025-2029', currentYear: 1, usnPrefix: '25' }
        ];

        const trainingFee = 15000;
        const admissionFee = 5000;

        for (const config of batchConfigs) {
            console.log(`Generating students for Batch ${config.batch} (Starting at Year 1)...`);

            const batchUSNCode = config.usnPrefix;

            for (const dept of departments) {
                // console.log(`  - Processing ${dept.name}...`);

                for (let i = 1; i <= 25; i++) { // 25 students per dept per batch
                    // Determine Quota & Attributes based on index for balanced variety
                    let quota = 'government';
                    let collegeFee = 0;

                    if (i <= 8) {
                        quota = 'government';
                        collegeFee = 0; // Eligible
                    } else if (i <= 13) {
                        quota = 'government';
                        collegeFee = 45000; // Not Eligible
                    } else if (i <= 23) {
                        quota = 'management';
                        collegeFee = dept.mgmtFee;
                    } else {
                        quota = 'nri';
                        collegeFee = dept.mgmtFee * 2.5;
                    }

                    // Randomize Hostel/Transport (Mutually Exclusive)
                    const randLogistics = Math.random();
                    let transportOpted = false;
                    let hostelOpted = false;

                    if (randLogistics < 0.4) {
                        transportOpted = true;
                    } else if (randLogistics < 0.7) {
                        hostelOpted = true;
                    }

                    const transportFee = transportOpted ? (25000 + Math.floor(Math.random() * 10) * 1000) : 0;
                    const hostelFee = hostelOpted ? (75000 + Math.floor(Math.random() * 40) * 1000) : 0;

                    // Some students have admission fee (e.g. 50%)
                    const hasAdmissionFee = Math.random() > 0.5;
                    const finalAdmissionFee = hasAdmissionFee ? admissionFee : 0;

                    const serial = i.toString().padStart(3, '0'); // 001, 002...
                    // Format: 25 + usnPrefix + 1A + code + serial
                    const usn = `25${batchUSNCode}1A${dept.code}${serial}`;
                    const name = getRandomName();

                    // Create User
                    const user = await User.create({
                        username: usn,
                        password: '123',
                        role: 'student',
                        name: name,
                        email: `${name.toLowerCase().replace(/\s/g, '.')}@bvce.edu`
                    });

                    // Fee Records (Split by Sem) - STARTING YEAR 1 for ALL
                    const feeRecords = [];
                    const addFeeLog = (type, amount) => {
                        if (amount <= 0) return;
                        const split = Math.ceil(amount / 2);
                        // Always Sem 1 and 2 because we forced currentYear = 1
                        feeRecords.push({ year: 1, semester: 1, feeType: type, amountDue: split, amountPaid: 0, status: 'pending' });
                        feeRecords.push({ year: 1, semester: 2, feeType: type, amountDue: amount - split, amountPaid: 0, status: 'pending' });
                    };

                    // Add Fee Logs
                    if (collegeFee > 0) addFeeLog('college', collegeFee);
                    if (transportOpted) addFeeLog('transport', transportFee);
                    if (hostelOpted) addFeeLog('hostel', hostelFee);
                    addFeeLog('placement', trainingFee); // All students have training fee
                    if (finalAdmissionFee > 0) addFeeLog('other', finalAdmissionFee); // 'other' for admission/misc

                    const student = await Student.create({
                        user: user._id,
                        usn: usn,
                        department: dept.name,
                        batch: config.batch,
                        currentYear: 1, // FORCE YEAR 1
                        quota: quota,
                        entry: 'regular',
                        status: 'active',

                        transportOpted,
                        transportRoute: transportOpted ? ['Majestic', 'Silk Board', 'Whitefield', 'Kengeri', 'Hebbal', 'Yelahanka'][Math.floor(Math.random() * 6)] : '',
                        hostelOpted,
                        placementOpted: true, // Everyone has placement

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

                    // Random Library Books (70% chance)
                    if (Math.random() > 0.3) {
                        const bookCount = Math.floor(Math.random() * 3) + 1; // 1 to 3 books
                        for (let b = 1; b <= bookCount; b++) {
                            await LibraryRecord.create({
                                student: student._id,
                                usn: usn,
                                bookTitle: getRandomBook(dept.name),
                                bookId: `LIB-${usn.slice(-4)}-${b}`,
                                borrowedDate: new Date(),
                                dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks due
                                status: 'borrowed'
                            });
                        }
                    }
                }
            }
        }

        console.log('Seeder completed successfully. All batches generated at Year 1.');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

importData();
