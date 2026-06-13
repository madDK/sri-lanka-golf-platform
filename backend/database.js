const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'srilankagolf.db');
const db = new sqlite3.Database(dbPath);

// Initialize DB schema
function initDb() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'Customer', -- 'Customer', 'Operator', 'Admin'
        phone TEXT,
        favorite_courses TEXT DEFAULT '[]', -- JSON array of course IDs
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Courses table
    db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL, -- 'Kandy', 'Colombo', 'Nuwara Eliya', 'Hambantota', 'Trincomalee'
        rating REAL DEFAULT 5.0,
        description TEXT,
        starting_price REAL NOT NULL,
        image_url TEXT,
        gallery TEXT DEFAULT '[]', -- JSON array of image URLs
        holes INTEGER DEFAULT 18,
        par INTEGER DEFAULT 72,
        length_yards INTEGER,
        facilities TEXT DEFAULT '[]', -- JSON array of facilities
        dress_code TEXT,
        latitude REAL,
        longitude REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tee Times table
    db.run(`
      CREATE TABLE IF NOT EXISTS tee_times (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        time TEXT NOT NULL, -- HH:MM
        price REAL NOT NULL,
        max_players INTEGER DEFAULT 4,
        available_slots INTEGER DEFAULT 4,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // Bookings table
    db.run(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        tee_time_id INTEGER NOT NULL,
        booking_date TEXT NOT NULL, -- YYYY-MM-DD
        tee_time_string TEXT NOT NULL, -- HH:MM
        players_count INTEGER NOT NULL,
        cart_rental INTEGER DEFAULT 0, -- 0 or 1
        club_rental INTEGER DEFAULT 0, -- 0 or 1
        caddie_booking INTEGER DEFAULT 0, -- 0 or 1
        total_price REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'Confirmed', -- 'Confirmed', 'Cancelled'
        promo_code TEXT,
        payment_gateway TEXT, -- 'PayHere', 'Stripe', 'Genie', 'Visa', 'Mastercard'
        transaction_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
        FOREIGN KEY(tee_time_id) REFERENCES tee_times(id) ON DELETE SET NULL
      )
    `);

    // Reviews table
    db.run(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        user_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
      )
    `);

    // Destinations table
    db.run(`
      CREATE TABLE IF NOT EXISTS destinations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        course_count INTEGER DEFAULT 0,
        image_url TEXT,
        description TEXT
      )
    `);

    // Packages table
    db.run(`
      CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT,
        inclusions TEXT DEFAULT '[]', -- JSON array of strings
        duration TEXT NOT NULL
      )
    `);

    // Seeding default users
    db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (row && row.count === 0) {
        const passHash = bcrypt.hashSync('golf123', 10);
        
        // Admin user
        db.run(`
          INSERT INTO users (name, email, password, role, phone) 
          VALUES ('Sri Lanka Golf Admin', 'admin@srilankagolf.com', ?, 'Admin', '+94771234567')
        `, [passHash]);

        // Operator user (representing course manager)
        db.run(`
          INSERT INTO users (name, email, password, role, phone) 
          VALUES ('Victoria Course Manager', 'operator@victoria.com', ?, 'Operator', '+94772345678')
        `, [passHash]);

        // Standard golfer customer
        db.run(`
          INSERT INTO users (name, email, password, role, phone) 
          VALUES ('Dushmantha Perera', 'dushmantha@gmail.com', ?, 'Customer', '+94773456789')
        `, [passHash]);

        console.log('Seeded default users.');
      }
    });

    // Seeding Destinations
    db.get("SELECT COUNT(*) as count FROM destinations", (err, row) => {
      if (row && row.count === 0) {
        const destinations = [
          { name: 'Kandy', count: 1, img: '/courses/victoria.png', desc: 'Misty hills, historical heritage, and scenic highland golf by the reservoir.' },
          { name: 'Colombo', count: 1, img: '/courses/royal_colombo.png', desc: 'Urban golf heritage and high-end city club life in the historic capital.' },
          { name: 'Nuwara Eliya', count: 1, img: '/courses/nuwara_eliya.png', desc: 'Little England tea trails, pine forests, and cool mountain golfing climates.' },
          { name: 'Trincomalee', count: 1, img: '/courses/eagles_links.png', desc: 'Coastal links, white sand bays, and breeze-driven ocean golf challenges.' },
          { name: 'Hambantota', count: 1, img: '/courses/shangrila.png', desc: 'Sun-drenched southern coast, coconut grove hazards, and beach resort golf.' }
        ];

        const stmt = db.prepare(`INSERT INTO destinations (name, course_count, image_url, description) VALUES (?, ?, ?, ?)`);
        destinations.forEach(d => {
          stmt.run(d.name, d.count, d.img, d.desc);
        });
        stmt.finalize();
        console.log('Seeded destinations.');
      }
    });

    // Seeding Packages
    db.get("SELECT COUNT(*) as count FROM packages", (err, row) => {
      if (row && row.count === 0) {
        const packages = [
          {
            name: 'Kandy Hills Luxury Escape',
            description: 'Experience 5-star accommodation at Victoria Golf chalet, 2 rounds of championship golf, private transfers, and a gourmet dining experience.',
            price: 75000,
            image_url: '/courses/victoria.png',
            inclusions: JSON.stringify(['2 Rounds of 18-Hole Golf', 'Luxury Chalet Stay (1 Night)', 'Airport Round-Trip Transfer', 'Premium Caddie & GPS Cart included', 'Gourmet Dinner & Breakfast']),
            duration: '2 Days / 1 Night'
          },
          {
            name: 'Tea Country Heritage Golf Tour',
            description: 'Step back in time at Nuwara Eliya Golf Club. Play on the colonial pine-lined fairway and stay at a luxury tea resort.',
            price: 98000,
            image_url: '/courses/nuwara_eliya.png',
            inclusions: JSON.stringify(['3 Rounds of Highland Golf', 'Colonial Boutique Suite (2 Nights)', 'Tea Estate Private Tour & Tea Tasting', 'Dedicated Tour Guide', 'Half-Board Meals included']),
            duration: '3 Days / 2 Nights'
          },
          {
            name: 'Southern Beach & Play Vacation',
            description: 'Luxury vacation at Shangri-La Hambantota. Unlimited golf on the signature course, oceanside dining, and premium spa credits.',
            price: 135000,
            image_url: '/courses/shangrila.png',
            inclusions: JSON.stringify(['Unlimited Tee Times (3 Days)', '5-Star Beach Resort Sea View Room', 'Premium Spa Ritual (90 mins)', 'Airport Luxury SUV Transfer', 'All-inclusive Dining & Beverage Plan']),
            duration: '4 Days / 3 Nights'
          }
        ];

        const stmt = db.prepare(`INSERT INTO packages (name, description, price, image_url, inclusions, duration) VALUES (?, ?, ?, ?, ?, ?)`);
        packages.forEach(p => {
          stmt.run(p.name, p.description, p.price, p.image_url, p.inclusions, p.duration);
        });
        stmt.finalize();
        console.log('Seeded packages.');
      }
    });

    // Seeding Courses
    db.get("SELECT COUNT(*) as count FROM courses", (err, row) => {
      if (row && row.count === 0) {
        const courses = [
          {
            name: 'Victoria Golf & Country Resort',
            location: 'Kandy',
            rating: 4.9,
            description: 'Nestled in the hills of Digana, Kandy, this championship course was designed by Donald Steel. It features magnificent views of the Victoria Reservoir and Knuckles Mountain Range. It is regularly voted one of the most scenic courses in Asia.',
            starting_price: 12000,
            image_url: '/courses/victoria.png',
            gallery: JSON.stringify(['/courses/victoria.png']),
            holes: 18,
            par: 73,
            length_yards: 6945,
            facilities: JSON.stringify(['Pro Shop', 'Driving Range', 'Locker Rooms', 'Fine Dining Restaurant', 'Swimming Pool', 'Tennis Courts']),
            dress_code: 'Collared shirt with sleeves, golf slacks or tailored shorts. No denim, tracksuits, or round-neck t-shirts. Soft spikes required.',
            latitude: 7.2989,
            longitude: 80.7811
          },
          {
            name: 'Royal Colombo Golf Club',
            location: 'Colombo',
            rating: 4.7,
            description: 'Established in 1880, this historic club offers a lush, tranquil oasis within the busy capital city. The 18-hole course is cut through by the Kelani Valley railway line, adding a unique charm that requires strategic play around water hazards.',
            starting_price: 9500,
            image_url: '/courses/royal_colombo.png',
            gallery: JSON.stringify(['/courses/royal_colombo.png']),
            holes: 18,
            par: 71,
            length_yards: 6560,
            facilities: JSON.stringify(['Clubhouse', 'Pro Shop', 'Bar & Lounge', 'Locker Rooms', 'Practice Putting Green', 'Caddie Hire']),
            dress_code: 'Smart casual golf attire. Collared shirts must be tucked in. Tailored shorts or trousers. No sand sandals or athletic wear.',
            latitude: 6.9189,
            longitude: 79.8794
          },
          {
            name: 'Nuwara Eliya Golf Club',
            location: 'Nuwara Eliya',
            rating: 4.8,
            description: 'One of the oldest golf clubs in Asia, founded in 1889. Located in the misty highlands at 6,000 feet, it features narrow pine-lined fairways and fast greens, requiring precision play in a cool, colonial atmosphere.',
            starting_price: 8000,
            image_url: '/courses/nuwara_eliya.png',
            gallery: JSON.stringify(['/courses/nuwara_eliya.png']),
            holes: 18,
            par: 71,
            length_yards: 6070,
            facilities: JSON.stringify(['Historic Clubhouse', 'Billiard Room', 'Bar & Fireplace Lounge', 'Pro Shop', 'Locker Rooms', 'Accommodation']),
            dress_code: 'Traditional golf wear. Collared shirts, trousers, or tailored shorts. Warm layers recommended due to highland climate.',
            latitude: 6.9736,
            longitude: 80.7656
          },
          {
            name: 'Eagles Golf Links',
            location: 'Trincomalee',
            rating: 4.6,
            description: 'Located at China Bay on the scenic east coast, Eagles Golf Links offers a picturesque 18-hole course with views of the Trincomalee harbor and the Indian Ocean. The sea breeze offers an exciting challenge for golfers of all levels.',
            starting_price: 8500,
            image_url: '/courses/eagles_links.png',
            gallery: JSON.stringify(['/courses/eagles_links.png']),
            holes: 18,
            par: 72,
            length_yards: 6710,
            facilities: JSON.stringify(['Clubhouse', 'Pro Shop', 'Locker Rooms', 'Restaurant', 'Cart Rental', 'Putting Green']),
            dress_code: 'Standard golf attire. Collared shirts and tailored shorts/slacks. Soft spike shoes only.',
            latitude: 8.5385,
            longitude: 81.1894
          },
          {
            name: 'Shangri-La Hambantota Golf Resort',
            location: 'Hambantota',
            rating: 4.9,
            description: 'Sri Lanka’s only resort golf course, set within a 145-acre coconut plantation on the pristine southern coast. Designed by Rodney Wright, it offers spectacular views of the Indian Ocean and challenging water hazards.',
            starting_price: 15000,
            image_url: '/courses/shangrila.png',
            gallery: JSON.stringify(['/courses/shangrila.png']),
            holes: 18,
            par: 70,
            length_yards: 6100,
            facilities: JSON.stringify(['Luxury Resort Spa', 'Pro Shop', 'Putting Green', 'Locker Rooms', 'Golf Cart with GPS', 'Signature Restaurant']),
            dress_code: 'Golf collared shirts, tailored shorts or trousers. Soft spikes only. Swimwear is not permitted.',
            latitude: 6.1392,
            longitude: 81.0186
          }
        ];

        // Prepare insert statement
        const stmt = db.prepare(`
          INSERT INTO courses (name, location, rating, description, starting_price, image_url, gallery, holes, par, length_yards, facilities, dress_code, latitude, longitude)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        courses.forEach(c => {
          stmt.run(
            c.name, c.location, c.rating, c.description, c.starting_price,
            c.image_url, c.gallery, c.holes, c.par, c.length_yards,
            c.facilities, c.dress_code, c.latitude, c.longitude,
            function(err) {
              if (err) return console.error(err);
              const courseId = this.lastID;
              generateTeeTimesForCourse(courseId, c.starting_price);
              seedReviewsForCourse(courseId);
            }
          );
        });
        stmt.finalize();
        console.log('Seeded courses.');
      }
    });
  });
}

// Helper to generate dynamic tee times for a course for the next 14 days
function generateTeeTimesForCourse(courseId, startingPrice) {
  const times = ['07:00', '08:30', '10:00', '11:30', '13:00', '14:30', '16:00'];
  const today = new Date();
  
  const stmt = db.prepare(`
    INSERT INTO tee_times (course_id, date, time, price, max_players, available_slots)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < 14; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);
    const dateStr = futureDate.toISOString().split('T')[0];
    const isWeekend = futureDate.getDay() === 0 || futureDate.getDay() === 6;

    times.forEach(t => {
      const hour = parseInt(t.split(':')[0]);
      let multiplier = 1.0;

      // Dynamic pricing formula:
      // Morning slots (7:00, 8:30) are peak slots (100% price)
      // Mid-day slots (11:30, 13:00) are hot and cheaper (80% price)
      // Afternoon slots (14:30, 16:00) are twilight, moderate (90% price)
      if (hour >= 11 && hour <= 13) {
        multiplier = 0.8;
      } else if (hour >= 14) {
        multiplier = 0.9;
      }

      // Weekend markup (+20%)
      if (isWeekend) {
        multiplier += 0.2;
      }

      const price = Math.round(startingPrice * multiplier);
      // Max players is usually 4 for golf groups
      stmt.run(courseId, dateStr, t, price, 4, 4);
    });
  }
  stmt.finalize();
}

// Helper to seed realistic reviews
function seedReviewsForCourse(courseId) {
  const reviewsPool = [
    { rating: 5, comment: "Fabulous conditions. Greens are rolling beautifully and caddies are extremely helpful. Will book again!", name: "Sarah Jenkins" },
    { rating: 5, comment: "Breathtaking views and top-notch service. The clubhouse dining was outstanding.", name: "Dr. Ravi Fernando" },
    { rating: 4, comment: "A very challenging course layout. A bit windy in the afternoon but definitely worth playing.", name: "James Anderson" },
    { rating: 5, comment: "Amazing luxury golfing experience in Sri Lanka. Booking tee times was smooth and instant.", name: "Yuki Tanaka" }
  ];

  const stmt = db.prepare(`
    INSERT INTO reviews (user_id, course_id, rating, comment, user_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  // Randomly select 2 reviews to seed per course
  const firstIdx = Math.floor(Math.random() * 2);
  const secondIdx = 2 + Math.floor(Math.random() * 2);

  [reviewsPool[firstIdx], reviewsPool[secondIdx]].forEach(rev => {
    stmt.run(3, courseId, rev.rating, rev.comment, rev.name); // user_id 3 is default golfer
  });
  stmt.finalize();
}

initDb();

// Promisify database operations for async/await usage
const dbQuery = {
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }
};

module.exports = {
  db,
  dbQuery
};
