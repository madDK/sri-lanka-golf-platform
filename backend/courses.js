const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');
const { authenticateToken, requireRole } = require('./auth');

// GET /api/courses - List all courses with search and filtering
router.get('/', async (req, res) => {
  const { search, location, maxPrice } = req.query;
  let query = 'SELECT * FROM courses WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (location && location !== 'All') {
    query += ' AND location = ?';
    params.push(location);
  }

  if (maxPrice) {
    query += ' AND starting_price <= ?';
    params.push(parseFloat(maxPrice));
  }

  try {
    const courses = await dbQuery.all(query, params);
    
    // Parse JSON arrays for each course
    courses.forEach(c => {
      try { c.gallery = JSON.parse(c.gallery || '[]'); } catch(e) { c.gallery = []; }
      try { c.facilities = JSON.parse(c.facilities || '[]'); } catch(e) { c.facilities = []; }
    });

    res.json(courses);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve courses' });
  }
});

// GET /api/courses/:id - Get specific course details with weather mock
router.get('/:id', async (req, res) => {
  try {
    const course = await dbQuery.get('SELECT * FROM courses WHERE id = ?', [req.params.id]);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    try { course.gallery = JSON.parse(course.gallery || '[]'); } catch(e) { course.gallery = []; }
    try { course.facilities = JSON.parse(course.facilities || '[]'); } catch(e) { course.facilities = []; }

    // Retrieve reviews for this course
    const reviews = await dbQuery.all('SELECT * FROM reviews WHERE course_id = ? ORDER BY created_at DESC', [course.id]);

    // Simulated Weather Widget based on location
    let weather = { temp: 29, condition: 'Sunny', wind: '14 km/h', humidity: '62%' };
    if (course.location === 'Nuwara Eliya') {
      weather = { temp: 16, condition: 'Misty & Cool', wind: '8 km/h', humidity: '85%' };
    } else if (course.location === 'Kandy') {
      weather = { temp: 26, condition: 'Partly Cloudy', wind: '10 km/h', humidity: '70%' };
    } else if (course.location === 'Trincomalee') {
      weather = { temp: 31, condition: 'Ocean Breeze / Sunny', wind: '18 km/h', humidity: '55%' };
    }

    res.json({
      course,
      reviews,
      weather
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve course details' });
  }
});

// GET /api/courses/:id/tee-times - Get tee-times list for a specific date
router.get('/:id/tee-times', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Date query parameter is required' });
  }

  try {
    const teeTimes = await dbQuery.all(
      'SELECT * FROM tee_times WHERE course_id = ? AND date = ? ORDER BY time ASC',
      [req.params.id, date]
    );

    res.json(teeTimes);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve tee times' });
  }
});

// POST /api/courses - Admin/Operator add new course
router.post('/', authenticateToken, requireRole(['Admin', 'Operator']), async (req, res) => {
  const { name, location, description, starting_price, image_url, gallery, holes, par, length_yards, facilities, dress_code, latitude, longitude } = req.body;

  if (!name || !location || !starting_price) {
    return res.status(400).json({ error: 'Name, location and starting price are required' });
  }

  try {
    const galleryStr = JSON.stringify(gallery || [image_url || '']);
    const facilitiesStr = JSON.stringify(facilities || []);

    const result = await dbQuery.run(`
      INSERT INTO courses (name, location, rating, description, starting_price, image_url, gallery, holes, par, length_yards, facilities, dress_code, latitude, longitude)
      VALUES (?, ?, 5.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, location, description || '', starting_price, image_url || '', galleryStr,
      holes || 18, par || 72, length_yards || 6500, facilitiesStr, dress_code || '',
      latitude || 7.0, longitude || 80.0
    ]);

    const newCourseId = result.lastID;
    
    // Seed default tee times for this new course for the next 14 days
    const times = ['07:00', '08:30', '10:00', '11:30', '13:00', '14:30', '16:00'];
    const today = new Date();
    const stmt = dbQuery.run; // we can insert them sequentially
    for (let i = 0; i < 14; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];
      const isWeekend = futureDate.getDay() === 0 || futureDate.getDay() === 6;

      for (let t of times) {
        const hour = parseInt(t.split(':')[0]);
        let multiplier = 1.0;
        if (hour >= 11 && hour <= 13) multiplier = 0.8;
        else if (hour >= 14) multiplier = 0.9;
        if (isWeekend) multiplier += 0.2;

        const price = Math.round(starting_price * multiplier);
        await dbQuery.run(
          'INSERT INTO tee_times (course_id, date, time, price, max_players, available_slots) VALUES (?, ?, ?, ?, 4, 4)',
          [newCourseId, dateStr, t, price]
        );
      }
    }

    res.status(201).json({ message: 'Course created successfully and tee times seeded', courseId: newCourseId });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT /api/courses/:id - Admin/Operator update course details
router.put('/:id', authenticateToken, requireRole(['Admin', 'Operator']), async (req, res) => {
  const { name, location, description, starting_price, image_url, gallery, holes, par, length_yards, facilities, dress_code, latitude, longitude } = req.body;

  try {
    const existing = await dbQuery.get('SELECT id FROM courses WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const galleryStr = gallery ? JSON.stringify(gallery) : undefined;
    const facilitiesStr = facilities ? JSON.stringify(facilities) : undefined;

    let updateQuery = 'UPDATE courses SET name = ?, location = ?, description = ?, starting_price = ?, holes = ?, par = ?, length_yards = ?, dress_code = ?, latitude = ?, longitude = ?';
    const params = [name, location, description, starting_price, holes, par, length_yards, dress_code, latitude, longitude];

    if (image_url) {
      updateQuery += ', image_url = ?';
      params.push(image_url);
    }
    if (galleryStr) {
      updateQuery += ', gallery = ?';
      params.push(galleryStr);
    }
    if (facilitiesStr) {
      updateQuery += ', facilities = ?';
      params.push(facilitiesStr);
    }

    updateQuery += ' WHERE id = ?';
    params.push(req.params.id);

    await dbQuery.run(updateQuery, params);
    res.json({ message: 'Course updated successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE /api/courses/:id - Admin/Operator delete course
router.delete('/:id', authenticateToken, requireRole(['Admin']), async (req, res) => {
  try {
    await dbQuery.run('DELETE FROM courses WHERE id = ?', [req.params.id]);
    res.json({ message: 'Course deleted successfully' });
  } catch(err) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

module.exports = router;
