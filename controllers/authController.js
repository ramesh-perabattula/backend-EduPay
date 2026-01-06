const User = require('../models/User');
const jwt = require('jsonwebtoken');

const { createLog } = require('../utils/logger');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            // Audit Log for Non-Student Roles
            if (user.role !== 'student') {
                await createLog({
                    userId: user._id,
                    role: user.role,
                    action: 'LOGIN',
                    targetType: 'User',
                    targetId: user._id,
                    details: { username: user.username },
                    ipAddress: req.ip
                });
            }

            res.json({
                _id: user._id,
                username: user.username,
                name: user.name,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Should be Admin only in real app)
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public (Should be Admin only in real app)
const registerUser = async (req, res) => {
    res.status(403).json({ message: 'Access denied. Please contact Admin.' });
};

module.exports = { loginUser, registerUser };
