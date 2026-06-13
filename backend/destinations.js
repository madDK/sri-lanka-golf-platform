const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');

// GET /api/destinations - Get all destinations
router.get('/destinations', async (req, res) => {
  try {
    const list = await dbQuery.all('SELECT * FROM destinations ORDER BY name ASC');
    res.json(list);
  } catch(err) {
    res.status(500).json({ error: 'Failed to retrieve destinations' });
  }
});

// GET /api/packages - Get all packages
router.get('/packages', async (req, res) => {
  try {
    const list = await dbQuery.all('SELECT * FROM packages');
    list.forEach(p => {
      try { p.inclusions = JSON.parse(p.inclusions || '[]'); } catch(e) { p.inclusions = []; }
    });
    res.json(list);
  } catch(err) {
    res.status(500).json({ error: 'Failed to retrieve packages' });
  }
});

module.exports = router;
