import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Calendar, Clock, Users, XCircle, ShoppingBag } from 'lucide-react';
import { API_BASE } from '../config';

export default function UserProfile({ token, t, triggerAlert }) {
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Profile edit form
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updating, setUpdating] = useState(false);



  const fetchProfileAndHistory = async () => {
    setLoading(true);
    try {
      // 1. Profile
      const profileRes = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (profileRes.ok) {
        const u = await profileRes.json();
        setProfile(u.user);
        setEditName(u.user.name);
        setEditPhone(u.user.phone || '');
      }

      // 2. Bookings
      const bookingsRes = await fetch(`${API_BASE}/bookings/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (bookingsRes.ok) {
        const list = await bookingsRes.json();
        setBookings(list);
      }
    } catch(err) {
      triggerAlert('error', 'Failed to retrieve profile records.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchProfileAndHistory();
    }
  }, [token]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, phone: editPhone })
      });
      if (res.ok) {
        triggerAlert('success', 'Profile updated successfully.');
        fetchProfileAndHistory();
      } else {
        triggerAlert('error', 'Profile update failed.');
      }
    } catch(err) {
      triggerAlert('error', 'Network error.');
    }
    setUpdating(false);
  };

  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Are you sure you want to cancel this tee time booking? A full refund will be routed to your payment method.')) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        triggerAlert('success', `Cancelled! Rs. ${data.refundAmount.toLocaleString()} will be refunded to your account.`);
        fetchProfileAndHistory();
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to cancel reservation.');
      }
    } catch(err) {
      triggerAlert('error', 'Failed to communicate cancellation request.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-golf-gold-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Loading your golfer profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-6 max-w-6xl mx-auto animate-fade-in">
      
      {/* Page Title */}
      <div className="border-b border-golf-charcoal-800 pb-4">
        <h2 className="text-3xl font-serif font-bold text-white">My Golfer Dashboard</h2>
        <p className="text-xs text-slate-400 mt-1">Manage your personal profile, active reservations, and booking cancellations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-serif flex items-center gap-2 border-b border-golf-charcoal-800 pb-3">
              <User className="w-4 h-4 text-golf-gold-500" /> Personal Details
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ''}
                  className="w-full bg-golf-charcoal-900 border border-golf-charcoal-800/80 rounded-xl px-3 py-2 text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="e.g. +94771234567"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full bg-golf-green-700 hover:bg-golf-green-600 text-white font-semibold py-2.5 rounded-xl transition-all border border-golf-green-600/30"
              >
                {updating ? 'Saving...' : 'Update Details'}
              </button>
            </form>
          </div>

          {/* Policy Info */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 bg-gradient-to-br from-golf-charcoal-900 to-golf-green-950/10 text-xs text-slate-400 space-y-2">
            <span className="block font-bold text-golf-gold-400 uppercase tracking-wider">Cancellation Policy</span>
            <p className="leading-relaxed">
              Tee times are fully refundable if cancelled at least **24 hours** prior to the scheduled slot. 
              Refunds will be processed instantly and credited back to your original payment card or wallet within 2-3 business days.
            </p>
          </div>
        </div>

        {/* Right 2 Columns: Bookings History */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2">
            {t.bookingHistory} ({bookings.length})
          </h3>

          {bookings.length === 0 ? (
            <div className="glass-panel p-10 rounded-2xl border border-golf-green-950/20 text-center space-y-4">
              <p className="text-slate-400 text-sm italic">{t.noBookings}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map(book => {
                const isConfirmed = book.status === 'Confirmed';
                
                // Parse date comparison for cancellation check (minimum 24h prior)
                const teeDate = new Date(`${book.booking_date}T${book.tee_time_string}`);
                const now = new Date();
                const diffHours = (teeDate - now) / (1000 * 60 * 60);
                const canCancel = isConfirmed && diffHours > 24;

                return (
                  <div 
                    key={book.id} 
                    className={`glass-panel rounded-2xl border overflow-hidden grid grid-cols-1 md:grid-cols-4 gap-4 ${
                      !isConfirmed ? 'border-rose-950/30 opacity-75' : 'border-golf-green-950/20'
                    }`}
                  >
                    
                    {/* Course Mini Thumbnail */}
                    <div className="h-full min-h-[100px] md:h-auto overflow-hidden">
                      <img 
                        src={book.course_image} 
                        alt={book.course_name} 
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Booking Details */}
                    <div className="md:col-span-2 p-5 space-y-3 text-xs">
                      <div>
                        <h4 className="text-sm font-bold text-white font-serif">{book.course_name}</h4>
                        <span className="text-[10px] text-slate-500">{book.course_location}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-300">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-golf-gold-400" />
                          <span>{book.booking_date}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-golf-gold-400" />
                          <span>{book.tee_time_string}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-golf-gold-400" />
                          <span>{book.players_count} Golfers</span>
                        </div>
                      </div>

                      {/* Addons summary */}
                      {(book.cart_rental || book.club_rental || book.caddie_booking) && (
                        <div className="flex flex-wrap gap-1.5 pt-1 text-[9px] text-slate-400">
                          <ShoppingBag className="w-3 h-3 text-golf-gold-500" />
                          {book.cart_rental ? <span className="bg-golf-charcoal-800 px-1.5 py-0.5 rounded">Cart</span> : null}
                          {book.club_rental ? <span className="bg-golf-charcoal-800 px-1.5 py-0.5 rounded">Clubs</span> : null}
                          {book.caddie_booking ? <span className="bg-golf-charcoal-800 px-1.5 py-0.5 rounded">Caddie</span> : null}
                        </div>
                      )}
                    </div>

                    {/* Pricing, Status, and Cancellation actions */}
                    <div className="p-5 flex flex-col justify-between items-end border-t md:border-t-0 md:border-l border-golf-charcoal-800/80 text-xs">
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          isConfirmed 
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                            : 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                        }`}>
                          {isConfirmed ? 'Confirmed' : 'Cancelled'}
                        </span>
                        
                        <div className="mt-3">
                          <span className="block text-[9px] text-slate-500 uppercase">Paid Total</span>
                          <span className="font-bold text-sm text-golf-gold-400 font-serif">LKR {book.total_price.toLocaleString()}</span>
                        </div>
                      </div>

                      {canCancel ? (
                        <button
                          onClick={() => handleCancelBooking(book.id)}
                          className="mt-3 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-rose-950/20 text-rose-400 border border-rose-900/30 hover:bg-rose-950/40 hover:border-rose-700 transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Cancel Tee Time</span>
                        </button>
                      ) : isConfirmed ? (
                        <span className="text-[9px] text-slate-500 italic mt-3">Locked (within 24h)</span>
                      ) : (
                        <span className="text-[9px] text-rose-500/60 font-semibold uppercase mt-3">Refund Routed</span>
                      )}

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
