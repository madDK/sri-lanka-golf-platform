const express = require('express');
const cors = require('cors');
const path = require('path');

const { router: authRouter } = require('./auth');
const coursesRouter = require('./courses');
const bookingsRouter = require('./bookings');
const destinationsRouter = require('./destinations');
const aiRouter = require('./ai');
const dashboardRouter = require('./dashboard');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend client communication
app.use(cors());

// Parse JSON request payloads
app.use(express.json());

// Mount API routers
app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/travel', destinationsRouter); // destinations and packages
app.use('/api/ai', aiRouter); // trip assistant chat
app.use('/api/admin/dashboard', dashboardRouter); // dashboard analytics

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve static assets from the frontend build directory
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Catch-all route to serve index.html for client-side routing
app.get('*all', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log(`Sri Lanka Golf Express Server running on http://localhost:${PORT}`);
});
