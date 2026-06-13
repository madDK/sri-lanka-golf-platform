const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');
const { authenticateToken, requireRole } = require('./auth');

// POST /api/bookings - Create a new tee time booking
router.post('/', authenticateToken, async (req, res) => {
  const {
    courseId,
    teeTimeId,
    bookingDate,
    teeTimeString,
    playersCount,
    cartRental,
    clubRental,
    caddieBooking,
    promoCode,
    paymentGateway
  } = req.body;

  if (!courseId || !teeTimeId || !bookingDate || !teeTimeString || !playersCount) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  try {
    // 1. Verify tee time availability
    const teeTime = await dbQuery.get('SELECT * FROM tee_times WHERE id = ?', [teeTimeId]);
    if (!teeTime) {
      return res.status(404).json({ error: 'Selected tee time not found' });
    }

    if (teeTime.available_slots < playersCount) {
      return res.status(400).json({ error: `Not enough slots available. Only ${teeTime.available_slots} slots left.` });
    }

    // 2. Fetch course base pricing rules
    const course = await dbQuery.get('SELECT name, starting_price FROM courses WHERE id = ?', [courseId]);
    if (!course) {
      return res.status(404).json({ error: 'Selected course not found' });
    }

    // 3. Compute price details
    // Base tee time price is dynamic (already set in teeTime.price)
    const baseTeeTimePrice = teeTime.price;
    let golfersPrice = baseTeeTimePrice * playersCount;

    // Add-ons standard rates (in Sri Lankan Rupees - LKR)
    const CART_RATE = 5000;    // per cart (1 cart fits 2 golfers)
    const CLUB_RATE = 3000;    // per set of clubs (per golfer)
    const CADDIE_RATE = 4000;  // per caddie (per golfer)

    let cartCount = cartRental ? Math.ceil(playersCount / 2) : 0;
    let cartCost = cartCount * CART_RATE;
    let clubCost = clubRental ? playersCount * CLUB_RATE : 0;
    let caddieCost = caddieBooking ? playersCount * CADDIE_RATE : 0;

    let subTotal = golfersPrice + cartCost + clubCost + caddieCost;
    let discount = 0;

    // Promo code check
    if (promoCode) {
      const codeClean = promoCode.toUpperCase().trim();
      if (codeClean === 'GOLF10') {
        discount = subTotal * 0.10;
      } else if (codeClean === 'WELCOME20') {
        discount = subTotal * 0.20;
      } else if (codeClean === 'SLGOLF5000') {
        discount = Math.min(subTotal, 5000);
      }
    }

    let totalPrice = subTotal - discount;
    const transactionId = `${paymentGateway ? paymentGateway.toUpperCase() : 'MOCK'}-${Math.floor(100000 + Math.random() * 900000)}`;

    // 4. Update available slots in tee_times
    const newSlots = teeTime.available_slots - playersCount;
    await dbQuery.run('UPDATE tee_times SET available_slots = ? WHERE id = ?', [newSlots, teeTimeId]);

    // 5. Insert booking record
    const bookingResult = await dbQuery.run(`
      INSERT INTO bookings (
        user_id, course_id, tee_time_id, booking_date, tee_time_string,
        players_count, cart_rental, club_rental, caddie_booking,
        total_price, status, promo_code, payment_gateway, transaction_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Confirmed', ?, ?, ?)
    `, [
      req.user.id, courseId, teeTimeId, bookingDate, teeTimeString,
      playersCount, cartRental ? 1 : 0, clubRental ? 1 : 0, caddieBooking ? 1 : 0,
      totalPrice, promoCode || '', paymentGateway || 'Visa', transactionId
    ]);

    // Simulated email / SMS notifications
    console.log(`[NOTIFICATION] Tee time confirmed at ${course.name} on ${bookingDate} at ${teeTimeString} for ${req.user.name}. SMS/WhatsApp Mock dispatched.`);

    res.status(201).json({
      message: 'Booking completed successfully',
      bookingId: bookingResult.lastID,
      transactionId,
      totalPrice,
      playersCount,
      date: bookingDate,
      time: teeTimeString
    });

  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create booking. Please try again.' });
  }
});

// GET /api/bookings/history - Retrieve personal bookings history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const bookings = await dbQuery.all(`
      SELECT b.*, c.name as course_name, c.location as course_location, c.image_url as course_image
      FROM bookings b
      JOIN courses c ON b.course_id = c.id
      WHERE b.user_id = ?
      ORDER BY b.booking_date DESC, b.tee_time_string DESC
    `, [req.user.id]);

    res.json(bookings);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load booking history' });
  }
});

// POST /api/bookings/:id/cancel - User requests cancellation & refund routing
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    // Fetch booking
    const booking = await dbQuery.get('SELECT * FROM bookings WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found or access denied' });
    }

    if (booking.status === 'Cancelled') {
      return res.status(400).json({ error: 'Booking is already cancelled' });
    }

    // Restore tee time slots
    if (booking.tee_time_id) {
      const teeTime = await dbQuery.get('SELECT available_slots, max_players FROM tee_times WHERE id = ?', [booking.tee_time_id]);
      if (teeTime) {
        const restoredSlots = Math.min(teeTime.max_players, teeTime.available_slots + booking.players_count);
        await dbQuery.run('UPDATE tee_times SET available_slots = ? WHERE id = ?', [restoredSlots, booking.tee_time_id]);
      }
    }

    // Set status to Cancelled
    await dbQuery.run("UPDATE bookings SET status = 'Cancelled' WHERE id = ?", [req.params.id]);

    console.log(`[REFUND] Initiated refund of Rs. ${booking.total_price} to card/wallet via ${booking.payment_gateway}. Transaction ID: REF-${booking.transaction_id}`);

    res.json({ message: 'Booking cancelled successfully and refund initiated', refundAmount: booking.total_price });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

// POST /api/reviews - Add customer review for course
router.post('/reviews', authenticateToken, async (req, res) => {
  const { courseId, rating, comment } = req.body;
  if (!courseId || !rating) {
    return res.status(400).json({ error: 'Course ID and rating are required' });
  }

  try {
    // Add review
    await dbQuery.run(
      'INSERT INTO reviews (user_id, course_id, rating, comment, user_name) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, courseId, rating, comment || '', req.user.name]
    );

    // Recompute average rating for course
    const avgRow = await dbQuery.get('SELECT AVG(rating) as avgRating FROM reviews WHERE course_id = ?', [courseId]);
    if (avgRow && avgRow.avgRating) {
      const roundedRating = Math.round(avgRow.avgRating * 10) / 10;
      await dbQuery.run('UPDATE courses SET rating = ? WHERE id = ?', [roundedRating, courseId]);
    }

    res.status(201).json({ message: 'Review added successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to write review' });
  }
});

// GET /api/bookings/all - Admin and operator view all reservations
router.get('/all', authenticateToken, requireRole(['Admin', 'Operator']), async (req, res) => {
  try {
    const bookings = await dbQuery.all(`
      SELECT b.*, c.name as course_name, u.name as customer_name, u.email as customer_email
      FROM bookings b
      JOIN courses c ON b.course_id = c.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
    `);
    res.json(bookings);
  } catch(err) {
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

// PUT /api/bookings/:id/status - Admin manual status controller
router.put('/:id/status', authenticateToken, requireRole(['Admin']), async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    await dbQuery.run('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: `Booking marked as ${status}` });
  } catch(err) {
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

module.exports = router;
