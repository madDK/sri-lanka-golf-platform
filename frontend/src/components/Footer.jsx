import React from 'react';
import { Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

export default function Footer({ t, setView }) {
  return (
    <footer className="bg-golf-charcoal-950 border-t border-golf-green-950/20 pt-16 pb-8 px-6 text-slate-400">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
        
        {/* Brand Info */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛳</span>
            <span className="font-serif text-xl font-bold text-white tracking-tight">
              {t.logo}
            </span>
          </div>
          <p className="text-xs leading-relaxed">
            Sri Lanka's leading digital marketplace for golf tee times and travel packages. Experience world-class golf tourism across our tropical island.
          </p>
          <div className="flex items-center gap-2 pt-2 text-golf-gold-500 font-semibold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>{t.trustSecure}</span>
          </div>
        </div>

        {/* Quick Navigation */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-serif">Quick Navigation</h3>
          <ul className="space-y-2 text-xs">
            <li>
              <button onClick={() => setView('home')} className="hover:text-golf-gold-400 transition-colors">
                {t.navHome}
              </button>
            </li>
            <li>
              <button onClick={() => setView('destinations')} className="hover:text-golf-gold-400 transition-colors">
                {t.navDestinations}
              </button>
            </li>
            <li>
              <button onClick={() => setView('packages')} className="hover:text-golf-gold-400 transition-colors">
                {t.navPackages}
              </button>
            </li>
            <li>
              <a href="#about" className="hover:text-golf-gold-400 transition-colors">About Ceylon Golfing</a>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-serif">Golf Concierge Support</h3>
          <ul className="space-y-3 text-xs">
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-golf-gold-500" />
              <span>+94 11 234 5678 (Local Support)</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-golf-gold-500" />
              <span>concierge@srilankagolf.com</span>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-golf-gold-500" />
              <span>No 45, Galle Road, Colombo 03, Sri Lanka</span>
            </li>
          </ul>
        </div>

        {/* Payment and Badges */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-serif">Trusted Payment Gateways</h3>
          <p className="text-xs">
            We accept local and international payment methods for instant confirmation:
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            {['PayHere', 'Stripe', 'Visa', 'Mastercard', 'Genie'].map((gate) => (
              <span 
                key={gate}
                className="px-2.5 py-1 rounded bg-golf-charcoal-800 text-[10px] text-golf-gold-400 font-bold border border-golf-charcoal-700/60"
              >
                {gate}
              </span>
            ))}
          </div>
        </div>

      </div>

      <div className="max-w-7xl mx-auto border-t border-golf-charcoal-800/80 mt-12 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs">
        <p>© {new Date().getFullYear()} SriLankaGolf.com. All rights reserved.</p>
        <div className="flex gap-4 mt-4 sm:mt-0">
          <a href="#privacy" className="hover:underline hover:text-white">Privacy Policy</a>
          <a href="#terms" className="hover:underline hover:text-white">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}
