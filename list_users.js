require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const users = await User.find({}, 'name role username');
        console.log('--- Current Users ---');
        users.forEach(u => console.log(`${u.role.padEnd(15)} | ${u.username.padEnd(15)} | ${u.name}`));

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
