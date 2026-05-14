import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Auth admin & get token
// @route   POST /api/admin/login
// @access  Public
export const adminLogin = async (req, res) => {
  const { username, dateOfBirth } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && (await user.matchDateOfBirth(dateOfBirth))) {
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Not an admin' });
      }

      res.json({
        _id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: `Server Error: ${error.message}` });
  }
};
