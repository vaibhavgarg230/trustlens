// backend/controllers/adminController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const Admin  = require('../models/Admin');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// POST /api/admin/login
exports.login = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email;
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Username/email and password are required' });
    }
    
    // Support both username and email for login
    const admin = await Admin.findOne({ 
      $or: [
        { username: loginIdentifier },
        { email: loginIdentifier }
      ]
    });
    
    if (!admin) {
      console.log(`❌ Admin login failed: No admin found with identifier "${loginIdentifier}"`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) {
      console.log(`❌ Admin login failed: Invalid password for "${loginIdentifier}"`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: admin._id, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' });
    
    const response = {
      token,
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        email: admin.email || admin.username
      }
    };
    
    console.log(`✅ Admin login successful: ${admin.username}`);
    res.json(response);
  } catch (err) {
    console.error('❌ Admin login error:', err);
    res.status(401).json({ error: err.message || 'Login failed' });
  }
};
