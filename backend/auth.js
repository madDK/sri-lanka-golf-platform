const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbQuery } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'srilankagolf_secret_key_987654';

// Authentication Middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await dbQuery.get('SELECT id, name, email, role, phone, favorite_courses FROM users WHERE id = ?', [decoded.userId]);
    
    if (!user) {
      return res.status(403).json({ error: 'Invalid token or user not found' });
    }

    try {
      user.favorite_courses = JSON.parse(user.favorite_courses || '[]');
    } catch(e) {
      user.favorite_courses = [];
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token expired or invalid' });
  }
}

// Check Role Middleware
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden: Insufficient permissions' });
    }
    next();
  };
}

// POST /api/auth/register - Register Golfer Customer
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // Check if email already exists
    const existingUser = await dbQuery.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create User (Default Customer role)
    const userResult = await dbQuery.run(
      'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'Customer', phone || '']
    );

    // Create token
    const token = jwt.sign({ userId: userResult.lastID }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: userResult.lastID,
        name,
        email,
        role: 'Customer',
        phone: phone || '',
        favorite_courses: []
      }
    });

  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login - Login Golfer
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await dbQuery.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });

    let favs = [];
    try {
      favs = JSON.parse(user.favorite_courses || '[]');
    } catch(e) {
      favs = [];
    }

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        favorite_courses: favs
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me - Retrieve Profile Information
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

// PUT /api/auth/me - Update profile
router.put('/me', authenticateToken, async (req, res) => {
  const { name, phone } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    await dbQuery.run('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || '', req.user.id]);
    res.json({ message: 'Profile updated successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/auth/favorites - Toggle favorite course
router.post('/favorites', authenticateToken, async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) {
    return res.status(400).json({ error: 'Course ID is required' });
  }

  try {
    const user = await dbQuery.get('SELECT favorite_courses FROM users WHERE id = ?', [req.user.id]);
    let favs = [];
    try {
      favs = JSON.parse(user.favorite_courses || '[]');
    } catch(e) {
      favs = [];
    }

    const cId = parseInt(courseId);
    if (favs.includes(cId)) {
      favs = favs.filter(id => id !== cId);
    } else {
      favs.push(cId);
    }

    await dbQuery.run('UPDATE users SET favorite_courses = ? WHERE id = ?', [JSON.stringify(favs), req.user.id]);
    res.json({ favorite_courses: favs });
  } catch(err) {
    res.status(500).json({ error: 'Failed to update favorites' });
  }
});

module.exports = {
  router,
  authenticateToken,
  requireRole
};
