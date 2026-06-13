const express = require('express');
const router = express.Router();
const { dbQuery } = require('./database');

// POST /api/ai/chat - AI trip assistant chat handler
router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const query = message.toLowerCase();
  let reply = '';

  try {
    const courses = await dbQuery.all('SELECT name, location, starting_price, rating FROM courses');

    if (query.includes('recommend') || query.includes('suggest') || query.includes('best') || query.includes('where should I play')) {
      reply = "I highly recommend the following depending on your preferences:\n\n" +
        "1. **Victoria Golf Resort (Kandy)**: Best for breathtaking mountain views & scenic championship play.\n" +
        "2. **Shangri-La Hambantota**: Best for a luxury beach vacation combined with tropical resort golf.\n" +
        "3. **Nuwara Eliya Golf Club**: Best if you prefer cool highland climates and historic, tight pine-lined fairways.\n" +
        "4. **Royal Colombo Golf Club**: Best if you are staying in the capital city and want a historic, classic club experience.\n" +
        "5. **Eagles Golf Links (Trinco)**: Best for coastal play bordering a natural blue ocean harbor.";
    } 
    else if (query.includes('kandy') || query.includes('victoria')) {
      const v = courses.find(c => c.name.includes('Victoria') || c.location === 'Kandy');
      reply = `**Victoria Golf Resort** is located in Kandy (Digana). It is a world-class par-73 course designed by Donald Steel, offering stunning views of the Victoria Reservoir. Starting price is LKR ${v ? v.starting_price.toLocaleString() : '12,000'} per slot. Would you like me to book a morning tee-time there?`;
    } 
    else if (query.includes('colombo') || query.includes('royal')) {
      const c = courses.find(c => c.name.includes('Colombo') || c.location === 'Colombo');
      reply = `**Royal Colombo Golf Club** is a historic course established in 1880, acting as a green oasis right in the center of Colombo. It has a par-71 layout crossed by a scenic train line. Starting price is LKR ${c ? c.starting_price.toLocaleString() : '9,500'}. Great for playing right after you land in Sri Lanka!`;
    } 
    else if (query.includes('nuwara eliya') || query.includes('misty') || query.includes('mountain') || query.includes('negc')) {
      const n = courses.find(c => c.name.includes('Nuwara') || c.location === 'Nuwara Eliya');
      reply = `**Nuwara Eliya Golf Club** is situated at 6,000 feet in the central tea country highlands. Founded in 1889, it offers a cool climate (often around 16°C) and narrow pine forest fairways. Starting price is LKR ${n ? n.starting_price.toLocaleString() : '8,000'}. Perfect if you want to escape the tropical heat!`;
    } 
    else if (query.includes('hambantota') || query.includes('shangri') || query.includes('resort')) {
      const s = courses.find(c => c.name.includes('Shangri') || c.location === 'Hambantota');
      reply = `**Shangri-La Hambantota Golf Resort** is our premier resort course, winding through a 145-acre coconut plantation on the south coast with dramatic views of the Indian Ocean. Starting price is LKR ${s ? s.starting_price.toLocaleString() : '15,000'}. Perfect for luxury stays and family beach trips!`;
    } 
    else if (query.includes('trincomalee') || query.includes('eagles') || query.includes('trinco') || query.includes('sea')) {
      const e = courses.find(c => c.name.includes('Eagles') || c.location === 'Trincomalee');
      reply = `**Eagles Golf Links** in Trincomalee is a beautiful seaside course overlooking China Bay on the east coast. Playing alongside the bay is scenic, but the coastal wind adds an interesting challenge. Starting price is LKR ${e ? e.starting_price.toLocaleString() : '8,500'}.`;
    } 
    else if (query.includes('weather') || query.includes('climate') || query.includes('best time')) {
      reply = "Sri Lanka has beautiful golfing weather year-round! \n\n" +
        "- Central Highlands (Nuwara Eliya) offer a cool, misty climate (15-20°C), ideal for playing during midday.\n" +
        "- Coastal regions (Hambantota, Trincomalee) are sunny and warm (28-32°C), best for early morning tee times when the ocean breeze is soft.\n" +
        "- Colombo and Kandy are warm and tropical (25-28°C). We recommend morning tee times between 7 AM and 10 AM.";
    } 
    else if (query.includes('book') || query.includes('how to') || query.includes('reserve')) {
      reply = "Booking is very easy! \n\n1. Select your desired course from the homepage.\n2. Choose a date and pick an available tee-time slot.\n3. Enter the number of players, add rentals (clubs, cart, or caddie if needed).\n4. Apply promo codes (try 'WELCOME20' for 20% off!) and complete checkout instantly. You will receive an instant confirmation ticket!";
    } 
    else if (query.includes('package') || query.includes('stay and play') || query.includes('hotel')) {
      reply = "We offer premium **Stay & Play Packages** that bundle golf rounds, 5-star resort accommodation, airport transfers, and private dining. Check out the 'Stay & Play' tab in the navigation menu to explore packages starting from LKR 75,000!";
    } 
    else {
      reply = "Greetings from SriLankaGolf.com! I am your luxury golf travel assistant. \n\nI can recommend courses, explain dress codes, suggest ideal tee times, and help organize your golf tour around Sri Lanka. What course or region are you interested in?";
    }

    res.json({ reply });
  } catch(err) {
    res.status(500).json({ error: 'AI Assistant encountered an error' });
  }
});

module.exports = router;
