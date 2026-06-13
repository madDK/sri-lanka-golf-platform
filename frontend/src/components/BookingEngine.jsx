import React, { useState, useEffect } from 'react';
import { Calendar, Users, ShoppingBag, CreditCard, ChevronLeft, CheckCircle, Ticket, Receipt } from 'lucide-react';
import { API_BASE } from '../config';

export default function BookingEngine({ 
  courseId, 
  token, 
  user, 
  t, 
  onBack, 
  triggerAlert, 
  onBookingSuccess 
}) {
  const [selectedDate, setSelectedDate] = useState('');
  const [teeTimes, setTeeTimes] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Players and addons
  const [players, setPlayers] = useState(1);
  const [cartRental, setCartRental] = useState(false);
  const [clubRental, setClubRental] = useState(false);
  const [caddieBooking, setCaddieBooking] = useState(false);
  
  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  // Checkout and payment
  const [gateway, setGateway] = useState('Visa');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);



  // Rates in LKR
  const CART_RATE = 5000;
  const CLUB_RATE = 3000;
  const CADDIE_RATE = 4000;

  // Initialize date as tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // Fetch tee times when date changes
  useEffect(() => {
    if (courseId && selectedDate) {
      fetchTeeTimes();
    }
  }, [courseId, selectedDate]);

  const fetchTeeTimes = async () => {
    setLoadingTimes(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}/tee-times?date=${selectedDate}`);
      if (res.ok) {
        const slots = await res.json();
        setTeeTimes(slots);
      }
    } catch(err) {
      triggerAlert('error', 'Failed to retrieve available slots.');
    }
    setLoadingTimes(false);
  };

  // Pricing math
  const basePrice = selectedSlot ? selectedSlot.price * players : 0;
  const cartsNeeded = cartRental ? Math.ceil(players / 2) : 0;
  const cartCost = cartsNeeded * CART_RATE;
  const clubCost = clubRental ? players * CLUB_RATE : 0;
  const caddieCost = caddieBooking ? players * CADDIE_RATE : 0;
  const subTotal = basePrice + cartCost + clubCost + caddieCost;

  let discount = 0;
  if (appliedPromo === 'WELCOME20') discount = subTotal * 0.20;
  else if (appliedPromo === 'GOLF10') discount = subTotal * 0.10;
  else if (appliedPromo === 'SLGOLF5000') discount = Math.min(subTotal, 5000);

  const totalPrice = subTotal - discount;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const clean = promoCode.toUpperCase().trim();
    if (clean === 'WELCOME20' || clean === 'GOLF10' || clean === 'SLGOLF5000') {
      setAppliedPromo(clean);
      setPromoCode('');
      triggerAlert('success', `Promo code ${clean} applied successfully!`);
    } else {
      triggerAlert('error', 'Invalid or expired promotional code.');
    }
  };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!token) {
      triggerAlert('error', 'Please log in or register to book a tee time.');
      return;
    }
    if (!selectedSlot) {
      triggerAlert('error', 'Please select a tee time slot.');
      return;
    }
    if (selectedSlot.available_slots < players) {
      triggerAlert('error', `Only ${selectedSlot.available_slots} slots left for this tee time.`);
      return;
    }

    // Open checkout modal
    setShowPaymentModal(true);
  };

  const executePayment = async (e) => {
    e.preventDefault();
    setProcessingPayment(true);

    try {
      const res = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          teeTimeId: selectedSlot.id,
          bookingDate: selectedDate,
          teeTimeString: selectedSlot.time,
          playersCount: players,
          cartRental,
          clubRental,
          caddieBooking,
          promoCode: appliedPromo,
          paymentGateway: gateway
        })
      });

      if (res.ok) {
        const result = await res.json();
        setBookingResult(result);
        setShowPaymentModal(false);
        triggerAlert('success', 'Booking Confirmed!');
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Checkout transaction failed.');
      }
    } catch(err) {
      triggerAlert('error', 'Network connection failed.');
    }
    setProcessingPayment(false);
  };

  if (bookingResult) {
    return (
      <div className="max-w-xl mx-auto glass-panel p-8 rounded-3xl border border-golf-gold-500/30 text-center space-y-6 animate-slide-up py-10 my-10">
        <div className="w-16 h-16 bg-golf-green-900/40 text-golf-gold-400 border border-golf-gold-500/30 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
          ✓
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-white">Instant Booking Confirmed</h2>
          <p className="text-xs text-slate-400">
            A confirmation ticket has been dispatched to your email and phone.
          </p>
        </div>

        {/* Ticket Details */}
        <div className="bg-golf-charcoal-900/60 border border-golf-charcoal-800 rounded-2xl p-6 text-left space-y-4 text-xs">
          <div className="flex justify-between border-b border-golf-charcoal-800 pb-3">
            <span className="text-slate-400">Reservation Ticket</span>
            <span className="font-mono text-golf-gold-400 font-bold">{bookingResult.transactionId}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-slate-500 block">Date</span>
              <span className="text-white font-semibold">{bookingResult.date}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Tee Time</span>
              <span className="text-white font-semibold">{bookingResult.time}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Players</span>
              <span className="text-white font-semibold">{bookingResult.playersCount} Golfers</span>
            </div>
            <div>
              <span className="text-slate-500 block">Paid Via</span>
              <span className="text-white font-semibold">{gateway}</span>
            </div>
          </div>

          <div className="border-t border-golf-charcoal-800 pt-3 flex justify-between font-bold text-sm text-golf-gold-400 font-serif">
            <span>Total Cost Paid</span>
            <span>LKR {bookingResult.totalPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-left text-[11px] text-slate-400 bg-golf-green-950/20 border border-golf-green-900/30 p-4 rounded-xl space-y-1 leading-relaxed">
          <span className="block font-bold text-golf-gold-400 uppercase tracking-wider mb-1">Important Details</span>
          <p>• Dress Code: Strict golf attire required (collared shirts, no denim).</p>
          <p>• Arrival: Please report to the starter pavilion at least 20 minutes prior to tee time.</p>
          <p>• Cancellation: Free cancellation up to 24 hours prior via My Bookings portal.</p>
        </div>

        <div className="pt-2 flex gap-3">
          <button
            onClick={() => onBookingSuccess()}
            className="w-full bg-golf-green-700 hover:bg-golf-green-600 text-white font-semibold py-3 rounded-xl text-xs transition-all border border-golf-green-600/30"
          >
            Go to My Bookings
          </button>
          <button
            onClick={onBack}
            className="w-full bg-golf-charcoal-800 hover:bg-golf-charcoal-700 text-slate-300 font-semibold py-3 rounded-xl text-xs transition-all border border-golf-charcoal-700/60"
          >
            Browse Other Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6 animate-fade-in max-w-5xl mx-auto">
      {/* Back Link */}
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-golf-gold-500" />
        <span>Cancel & Go Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Dates and Tee Times */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Step 1 Date/Time */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-golf-green-950/20 space-y-6">
            <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2 border-b border-golf-charcoal-800 pb-3">
              <Calendar className="w-5 h-5 text-golf-gold-500" /> {t.selectDate}
            </h3>

            {/* Date Picker input */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Select Tee Time Date</label>
              <input
                type="date"
                value={selectedDate}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]} // from tomorrow
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-64 bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-golf-gold-500"
              />
            </div>

            {/* Tee Times Grid */}
            <div className="space-y-3 pt-2">
              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">Available Tee Slots</span>
              {loadingTimes ? (
                <div className="py-6 flex items-center gap-2 text-slate-400 text-xs">
                  <div className="w-4 h-4 border-2 border-golf-gold-500 border-t-transparent rounded-full animate-spin"></div>
                  <span>Checking availability grid...</span>
                </div>
              ) : teeTimes.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No tee times loaded for this date. Try another date.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {teeTimes.map(slot => {
                    const active = selectedSlot?.id === slot.id;
                    const fullyBooked = slot.available_slots === 0;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={fullyBooked}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-3.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                          fullyBooked 
                            ? 'bg-golf-charcoal-900/20 border-golf-charcoal-800/60 text-slate-600 cursor-not-allowed'
                            : active
                              ? 'bg-golf-green-700/20 border-golf-gold-500 text-golf-gold-400 shadow-inner'
                              : 'bg-golf-charcoal-800/80 border-golf-charcoal-700/60 text-slate-300 hover:border-golf-green-600 hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold font-mono">{slot.time}</span>
                        <span className="text-[10px] text-slate-400">LKR {slot.price.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-500">{slot.available_slots} slots left</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Step 2 Add-ons */}
          <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-golf-green-950/20 space-y-6">
            <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2 border-b border-golf-charcoal-800 pb-3">
              <ShoppingBag className="w-5 h-5 text-golf-gold-500" /> {t.selectAddons}
            </h3>

            {/* Players count */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{t.playersLabel}</label>
              <select
                value={players}
                onChange={(e) => setPlayers(Number(e.target.value))}
                className="w-32 bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-golf-gold-500"
              >
                <option value="1">1 Player</option>
                <option value="2">2 Players</option>
                <option value="3">3 Players</option>
                <option value="4">4 Players</option>
              </select>
            </div>

            {/* Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              
              {/* Cart Rental */}
              <label className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-full ${
                cartRental 
                  ? 'bg-golf-green-950/20 border-golf-gold-500/50 text-white' 
                  : 'bg-golf-charcoal-900/40 border-golf-charcoal-800/80 text-slate-400 hover:border-golf-charcoal-700'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={cartRental}
                    onChange={(e) => setCartRental(e.target.checked)}
                    className="mt-1 accent-golf-gold-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">{t.cartRental}</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{t.cartDesc}</span>
                  </div>
                </div>
                <span className="text-xs text-golf-gold-400 font-bold block mt-3 font-serif">LKR 5,000</span>
              </label>

              {/* Club Rental */}
              <label className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-full ${
                clubRental 
                  ? 'bg-golf-green-950/20 border-golf-gold-500/50 text-white' 
                  : 'bg-golf-charcoal-900/40 border-golf-charcoal-800/80 text-slate-400 hover:border-golf-charcoal-700'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={clubRental}
                    onChange={(e) => setClubRental(e.target.checked)}
                    className="mt-1 accent-golf-gold-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">{t.clubRental}</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{t.clubDesc}</span>
                  </div>
                </div>
                <span className="text-xs text-golf-gold-400 font-bold block mt-3 font-serif">LKR 3,000 / Golfer</span>
              </label>

              {/* Caddie Hire */}
              <label className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-full ${
                caddieBooking 
                  ? 'bg-golf-green-950/20 border-golf-gold-500/50 text-white' 
                  : 'bg-golf-charcoal-900/40 border-golf-charcoal-800/80 text-slate-400 hover:border-golf-charcoal-700'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={caddieBooking}
                    onChange={(e) => setCaddieBooking(e.target.checked)}
                    className="mt-1 accent-golf-gold-500"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">{t.caddieBooking}</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">{t.caddieDesc}</span>
                  </div>
                </div>
                <span className="text-xs text-golf-gold-400 font-bold block mt-3 font-serif">LKR 4,000 / Golfer</span>
              </label>

            </div>
          </div>

        </div>

        {/* Right 1 Column: Checkout & Summary */}
        <div className="space-y-6">
          
          {/* Promo code box */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.promoLabel}</h4>
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="e.g. WELCOME20"
                className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                className="bg-golf-charcoal-700 hover:bg-golf-charcoal-600 text-golf-gold-400 font-bold px-4 rounded-xl text-xs border border-golf-charcoal-600"
              >
                {t.applyBtn}
              </button>
            </form>
            <div className="text-[10px] text-slate-500 space-y-0.5 leading-relaxed">
              <p>• WELCOME20: 20% off total invoice.</p>
              <p>• GOLF10: 10% off total invoice.</p>
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-gold-500/20 space-y-4 bg-gradient-to-b from-golf-charcoal-900 to-golf-green-950/15">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-serif border-b border-golf-charcoal-800 pb-2">
              {t.summaryTitle}
            </h4>

            {selectedSlot ? (
              <div className="space-y-3 text-xs">
                
                {/* Details */}
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date & Time:</span>
                    <span className="text-white font-bold">{selectedDate} @ {selectedSlot.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Players Count:</span>
                    <span className="text-white font-bold">{players} Golfers</span>
                  </div>
                </div>

                <div className="border-t border-golf-charcoal-800/80 pt-2 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t.baseRate}:</span>
                    <span>LKR {(selectedSlot.price * players).toLocaleString()}</span>
                  </div>
                  
                  {cartRental && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Golf Cart x{cartsNeeded}:</span>
                      <span>LKR {cartCost.toLocaleString()}</span>
                    </div>
                  )}

                  {clubRental && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Club Sets x{players}:</span>
                      <span>LKR {clubCost.toLocaleString()}</span>
                    </div>
                  )}

                  {caddieBooking && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Caddies x{players}:</span>
                      <span>LKR {caddieCost.toLocaleString()}</span>
                    </div>
                  )}

                  {appliedPromo && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>{t.discountAmt} ({appliedPromo}):</span>
                      <span>- LKR {discount.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div className="border-t border-golf-charcoal-800 pt-3 flex justify-between items-center text-white font-serif">
                  <span className="font-bold">{t.totalPrice}</span>
                  <span className="text-lg font-bold text-golf-gold-400">LKR {totalPrice.toLocaleString()}</span>
                </div>

                {/* Gateway select */}
                <div className="space-y-2 pt-2">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">Select Gateway</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                    {['Visa', 'PayHere', 'Stripe', 'Genie'].map((gate) => (
                      <button
                        key={gate}
                        type="button"
                        onClick={() => setGateway(gate)}
                        className={`py-2 px-3 rounded-lg border text-center transition-all ${
                          gateway === gate
                            ? 'bg-golf-gold-500 text-golf-charcoal-950 border-golf-gold-500'
                            : 'bg-golf-charcoal-800 text-slate-300 border-golf-charcoal-700/60'
                        }`}
                      >
                        {gate === 'Visa' ? 'Visa / MC' : gate}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleBookSubmit}
                  className="w-full bg-gradient-to-r from-golf-gold-400 to-golf-gold-600 hover:from-golf-gold-500 hover:to-golf-gold-700 text-golf-charcoal-950 font-bold py-3.5 rounded-xl transition-all shadow-lg text-xs"
                >
                  {t.confirmBooking}
                </button>

              </div>
            ) : (
              <p className="text-xs text-slate-500 italic py-4 text-center">Please select date and tee time to view pricing.</p>
            )}
          </div>

        </div>

      </div>

      {/* Simulated Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-golf-charcoal-900 border border-golf-gold-500/20 max-w-md w-full rounded-2xl p-6 shadow-2xl relative space-y-6">
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2 border-b border-golf-charcoal-800 pb-3">
              <CreditCard className="w-5 h-5 text-golf-gold-500" />
              <span>Checkout Sandbox</span>
            </h3>

            {/* Gateway UI Details */}
            <div className="bg-golf-charcoal-950 p-4 rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Gateway:</span>
                <span className="font-bold text-golf-gold-400">{gateway} Secure Portal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Charge:</span>
                <span className="font-bold text-white">LKR {totalPrice.toLocaleString()}</span>
              </div>
            </div>

            <form onSubmit={executePayment} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400">Cardholder Name</label>
                <input
                  type="text"
                  required
                  placeholder={user?.name || 'Golfer Name'}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Card Number</label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').substr(0, 16))}
                  placeholder="4111 2222 3333 4444"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400">Expiry Date</label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value.substr(0, 5))}
                    placeholder="MM/YY"
                    className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-400">CVC Code</label>
                  <input
                    type="password"
                    required
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').substr(0, 3))}
                    placeholder="•••"
                    className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none font-mono text-center"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-2.5 rounded-xl border border-golf-charcoal-700 text-slate-400 hover:text-white transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="w-full py-2.5 rounded-xl bg-golf-gold-500 text-golf-charcoal-950 font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  {processingPayment ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-golf-charcoal-950 border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Pay LKR {totalPrice.toLocaleString()}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
