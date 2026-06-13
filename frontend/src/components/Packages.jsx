import React, { useState, useEffect } from 'react';
import { ShieldCheck, Award, Clock, Star, Gift, X } from 'lucide-react';
import { API_BASE } from '../config';

export default function Packages({ token, t, triggerAlert }) {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Checkout package modal states
  const [selectedPack, setSelectedPack] = useState(null);
  const [promo, setPromo] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [ticketId, setTicketId] = useState('');



  useEffect(() => {
    const fetchPacks = async () => {
      try {
        const res = await fetch(`${API_BASE}/travel/packages`);
        if (res.ok) {
          const list = await res.json();
          setPackages(list);
        }
      } catch(err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchPacks();
  }, []);

  const handleBookPackageClick = (pack) => {
    if (!token) {
      triggerAlert('error', 'Please log in to purchase Stay & Play packages.');
      return;
    }
    setSelectedPack(pack);
    setAppliedPromo('');
    setTicketId('');
  };

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const clean = promo.toUpperCase().trim();
    if (clean === 'WELCOME20' || clean === 'GOLF10') {
      setAppliedPromo(clean);
      setPromo('');
      triggerAlert('success', `Promo code ${clean} applied!`);
    } else {
      triggerAlert('error', 'Invalid code.');
    }
  };

  const executeCheckout = (e) => {
    e.preventDefault();
    setProcessing(true);
    setTimeout(() => {
      setTicketId(`SLG-PACK-${Math.floor(100000 + Math.random() * 900000)}`);
      setProcessing(false);
      triggerAlert('success', 'Vacation package booked successfully! Concierge team notified.');
    }, 1500);
  };

  const getDiscountedPrice = () => {
    if (!selectedPack) return 0;
    let base = selectedPack.price;
    if (appliedPromo === 'WELCOME20') return base * 0.8;
    if (appliedPromo === 'GOLF10') return base * 0.9;
    return base;
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-3 border-golf-gold-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs">Loading Stay & Play bundles...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6 animate-fade-in max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Luxury Stay & Play Packages</h2>
        <p className="text-xs text-slate-400">
          Combine championship golf tee times with 5-star lodging, private transfers, and luxury excursions for an unforgettable tropical escape.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4">
        {packages.map(pack => (
          <div 
            key={pack.id} 
            className="glass-panel glass-panel-hover rounded-3xl overflow-hidden flex flex-col h-full border border-golf-gold-500/10 group"
          >
            {/* Image */}
            <div className="relative h-60 overflow-hidden">
              <img 
                src={pack.image_url} 
                alt={pack.name} 
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-golf-charcoal-950 via-golf-charcoal-900/40 to-transparent"></div>
              
              {/* Duration Tag */}
              <div className="absolute top-4 left-4 bg-golf-charcoal-950/90 border border-golf-gold-500/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-golf-gold-500" />
                <span>{pack.duration}</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-6 text-xs">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-serif text-lg font-bold text-white group-hover:text-golf-gold-400 transition-colors">
                    {pack.name}
                  </h3>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    {pack.description}
                  </p>
                </div>

                {/* Inclusions List */}
                <div className="space-y-2 border-t border-golf-charcoal-800 pt-4">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.inclusions}:</span>
                  <ul className="space-y-1.5">
                    {pack.inclusions.map((inc, index) => (
                      <li key={index} className="flex items-start gap-2 text-slate-300">
                        <ShieldCheck className="w-4 h-4 text-golf-gold-500 flex-shrink-0 mt-0.5" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Price & Book */}
              <div className="border-t border-golf-charcoal-800 pt-4 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-semibold">Package Price</span>
                  <span className="text-base font-bold text-golf-gold-400 font-serif">LKR {pack.price.toLocaleString()}</span>
                </div>

                <button
                  onClick={() => handleBookPackageClick(pack)}
                  className="bg-golf-green-600 hover:bg-golf-green-700 text-white font-bold px-5 py-2.5 rounded-xl border border-golf-green-500/20 shadow-md transition-all flex items-center gap-1.5"
                >
                  <Award className="w-4 h-4 text-golf-gold-400" />
                  <span>{t.bookPackage}</span>
                </button>
              </div>
            </div>

          </div>
        ))}
      </div>

      {/* Package Checkout Modal */}
      {selectedPack && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-xs">
          <div className="bg-golf-charcoal-900 border border-golf-gold-500/20 max-w-md w-full rounded-2xl p-6 shadow-2xl relative space-y-6">
            
            <div className="flex justify-between border-b border-golf-charcoal-800 pb-3 items-center">
              <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-golf-gold-500" />
                <span>Vacation Package Booking</span>
              </h3>
              <button onClick={() => setSelectedPack(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {ticketId ? (
              <div className="text-center space-y-4 py-4 animate-slide-up">
                <div className="w-12 h-12 bg-golf-green-900/40 text-golf-gold-400 border border-golf-gold-500/20 rounded-full flex items-center justify-center mx-auto text-2xl">
                  ✓
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">Package Inquiry Submitted!</h4>
                  <p className="text-slate-400">
                    Your luxury package ticket ID is <span className="font-mono text-golf-gold-400 font-bold">{ticketId}</span>.
                  </p>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Our dedicated golf tourism concierge will contact you within 2 hours at your registered details to verify airport flight timings and hotel check-in choices.
                </p>
                <button
                  onClick={() => setSelectedPack(null)}
                  className="w-full bg-golf-green-700 hover:bg-golf-green-600 text-white font-semibold py-2.5 rounded-xl transition-all"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                
                {/* Details */}
                <div className="bg-golf-charcoal-950 p-4 rounded-xl space-y-2">
                  <span className="block font-bold text-white">{selectedPack.name}</span>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Duration:</span>
                    <span>{selectedPack.duration}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Base Cost:</span>
                    <span>LKR {selectedPack.price.toLocaleString()}</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between text-emerald-400 text-[11px] font-bold">
                      <span>Discount ({appliedPromo}):</span>
                      <span>- LKR {(selectedPack.price - getDiscountedPrice()).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-golf-charcoal-850 pt-2 flex justify-between font-bold text-sm text-golf-gold-400">
                    <span>Total Cost:</span>
                    <span>LKR {getDiscountedPrice().toLocaleString()}</span>
                  </div>
                </div>

                {/* Promo form */}
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    value={promo}
                    onChange={(e) => setPromo(e.target.value)}
                    placeholder="Enter Promo Code"
                    className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none"
                  />
                  <button type="submit" className="bg-golf-charcoal-800 hover:bg-golf-charcoal-750 text-golf-gold-400 border border-golf-charcoal-700/60 px-4 rounded-xl font-bold">
                    Apply
                  </button>
                </form>

                <form onSubmit={executeCheckout} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-slate-400">Preferred Travel Start Date</label>
                    <input
                      type="date"
                      required
                      min={new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]} // min 3 days out
                      className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl px-3 py-2 text-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={processing}
                    className="w-full bg-gradient-to-r from-golf-gold-400 to-golf-gold-600 text-golf-charcoal-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs shadow-lg"
                  >
                    {processing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-golf-charcoal-950 border-t-transparent rounded-full animate-spin"></div>
                        <span>Securing Booking...</span>
                      </>
                    ) : (
                      <span>Submit Package Reservation</span>
                    )}
                  </button>
                </form>

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
