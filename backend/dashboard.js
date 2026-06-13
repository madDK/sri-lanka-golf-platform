const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');
const { authenticateToken, requireRole } = require('./auth');

// GET /api/dashboard/stats - Fetch stats and chart datasets for Admin
router.get('/stats', authenticateToken, requireRole(['Admin', 'Operator']), async (req, res) => {
  try {
    // 1. KPI Metrics
    const bookingsCount = await dbQuery.get("SELECT COUNT(*) as count FROM bookings WHERE status = 'Confirmed'");
    const revenueRes = await dbQuery.get("SELECT SUM(total_price) as total FROM bookings WHERE status = 'Confirmed'");
    const usersCount = await dbQuery.get("SELECT COUNT(*) as count FROM users");
    const coursesCount = await dbQuery.get("SELECT COUNT(*) as count FROM courses");

    const totalBookings = bookingsCount ? bookingsCount.count : 0;
    const totalRevenue = revenueRes && revenueRes.total ? revenueRes.total : 0.0;
    const totalUsers = usersCount ? usersCount.count : 0;
    const totalCourses = coursesCount ? coursesCount.count : 0;

    // 2. Chart: Bookings Over Time (Last 7 Days)
    const bookingsOverTime = await dbQuery.all(`
      SELECT booking_date as date, COUNT(*) as count, SUM(total_price) as revenue
      FROM bookings
      WHERE booking_date >= date('now', '-7 days') AND status = 'Confirmed'
      GROUP BY booking_date
      ORDER BY booking_date ASC
    `);

    // Pad last 7 days to avoid empty values in chart
    const dailyChartData = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const match = bookingsOverTime.find(b => b.date === dateStr);
      dailyChartData.push({
        date: dateStr.substring(5), // MM-DD
        Bookings: match ? match.count : 0,
        Revenue: match ? Math.round(match.revenue) : 0
      });
    }

    // 3. Chart: Revenue By Course
    const revenueByCourse = await dbQuery.all(`
      SELECT c.name as courseName, SUM(b.total_price) as revenue
      FROM bookings b
      JOIN courses c ON b.course_id = c.id
      WHERE b.status = 'Confirmed'
      GROUP BY b.course_id
      ORDER BY revenue DESC
    `);

    // 4. Chart: Booking Success Rate (Confirmed vs Cancelled)
    const statusStats = await dbQuery.all(`
      SELECT status, COUNT(*) as count
      FROM bookings
      GROUP BY status
    `);

    const successChartData = statusStats.map(row => ({
      name: row.status,
      value: row.count
    }));

    if (successChartData.length === 0) {
      successChartData.push({ name: 'Confirmed', value: 0 }, { name: 'Cancelled', value: 0 });
    }

    res.json({
      stats: {
        totalBookings,
        totalRevenue,
        totalUsers,
        totalCourses
      },
      charts: {
        daily: dailyChartData,
        revenueByCourse,
        success: successChartData
      }
    });

  } catch (err) {
    console.error('Fetch dashboard stats error:', err);
    res.status(500).json({ error: 'Failed to compile dashboard metrics' });
  }
});

// GET /api/dashboard/users - List all users in system (Admin only)
router.get('/users', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    const users = await dbQuery.all('SELECT id, name, email, role, phone, created_at FROM users ORDER BY role DESC, name ASC');
    res.json(users);
  } catch(err) {
    res.status(500).json({ error: 'Failed to retrieve users list' });
  }
});

// PUT /api/dashboard/users/:id/role - Update user role (Admin only)
router.put('/users/:id/role', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { role } = req.body;
  if (!role || !['Admin', 'Operator', 'Customer'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required' });
  }

  try {
    await dbQuery.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'User role updated successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

module.exports = router;
