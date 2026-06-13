import React, { useState } from 'react';
import { Search, MapPin, Calendar, Users, Clock } from 'lucide-react';

export default function Hero({ t, onSearch }) {
  const [location, setLocation] = useState('All');
  const [date, setDate] = useState('');
  const [players, setPlayers] = useState('1');
  const [teeTimePref, setTeeTimePref] = useState('Any');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch({ location, date, players, teeTimePref });
  };

  return (
    <section className="relative min-h-[80vh] flex items-center justify-center py-20 px-6 overflow-hidden">
      
      {/* Background Graphic overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 transform scale-105"
        style={{ 
          backgroundImage: "linear-gradient(to bottom, rgba(4, 27, 16, 0.82), rgba(9, 11, 10, 0.96)), url('/courses/victoria.png')" 
        }}
      ></div>

      {/* Decorative Gold Glows */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-golf-gold-600/15 rounded-full filter blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-golf-green-600/25 rounded-full filter blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-5xl w-full text-center space-y-12">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-golf-green-800/60 border border-golf-gold-500/30 text-golf-gold-400 text-xs font-semibold uppercase tracking-wider animate-pulse-slow">
          <span>⛳</span>
          <span>Sri Lanka's Premium Golf Gateway</span>
        </div>

        {/* Title / Subtitle */}
        <div className="space-y-6">
          <h2 className="text-4xl sm:text-5xl md:text-7xl font-bold font-serif leading-[1.15] text-white">
            {t.heroTitle.split("Across").map((text, idx) => (
              <span key={idx} className={idx === 1 ? "gold-text-gradient block sm:inline" : ""}>
                {idx === 1 ? ` Across${text}` : text}
              </span>
            ))}
          </h2>
          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t.heroSub}
          </p>
        </div>

        {/* Premium Search Box Panel */}
        <form 
          onSubmit={handleSubmit}
          className="glass-panel p-5 sm:p-6 rounded-3xl shadow-2xl border border-golf-gold-500/20 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end text-left"
        >
          
          {/* Location Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-golf-gold-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {t.searchLocation}
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-golf-charcoal-800/80 border border-golf-charcoal-700/60 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-1 focus:ring-golf-gold-500 focus:outline-none"
            >
              <option value="All">{t.allLocations}</option>
              <option value="Kandy">Kandy</option>
              <option value="Colombo">Colombo</option>
              <option value="Nuwara Eliya">Nuwara Eliya</option>
              <option value="Hambantota">Hambantota</option>
              <option value="Trincomalee">Trincomalee</option>
            </select>
          </div>

          {/* Date Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-golf-gold-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {t.searchDate}
            </label>
            <input
              type="date"
              value={date}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-golf-charcoal-800/80 border border-golf-charcoal-700/60 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-1 focus:ring-golf-gold-500 focus:outline-none"
            />
          </div>

          {/* Players Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-golf-gold-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {t.searchPlayers}
            </label>
            <select
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              className="w-full bg-golf-charcoal-800/80 border border-golf-charcoal-700/60 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-1 focus:ring-golf-gold-500 focus:outline-none"
            >
              <option value="1">1 Player</option>
              <option value="2">2 Players</option>
              <option value="3">3 Players</option>
              <option value="4">4 Players</option>
            </select>
          </div>

          {/* Tee Time Preferred Selection */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-golf-gold-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {t.searchTeeTime}
            </label>
            <select
              value={teeTimePref}
              onChange={(e) => setTeeTimePref(e.target.value)}
              className="w-full bg-golf-charcoal-800/80 border border-golf-charcoal-700/60 rounded-xl px-3 py-2.5 text-xs text-white focus:ring-1 focus:ring-golf-gold-500 focus:outline-none"
            >
              <option value="Any">{t.anyTime}</option>
              <option value="Morning">Morning (7AM - 11AM)</option>
              <option value="Midday">Midday (11AM - 2PM)</option>
              <option value="Afternoon">Afternoon (2PM - 5PM)</option>
            </select>
          </div>

          {/* Search Action Button */}
          <div>
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-golf-gold-400 to-golf-gold-600 hover:from-golf-gold-500 hover:to-golf-gold-700 text-golf-charcoal-950 font-bold py-2.5 rounded-xl transition-all shadow-md shadow-golf-gold-950/20 flex items-center justify-center gap-2 text-xs"
            >
              <Search className="w-4 h-4" />
              <span>{t.searchBtn}</span>
            </button>
          </div>

        </form>

      </div>
    </section>
  );
}
