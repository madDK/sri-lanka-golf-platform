import React, { useState, useEffect } from 'react';
import { Compass, Landmark } from 'lucide-react';
import { API_BASE } from '../config';

export default function Destinations({ t, onSelectDestination }) {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);



  useEffect(() => {
    const fetchDests = async () => {
      try {
        const res = await fetch(`${API_BASE}/travel/destinations`);
        if (res.ok) {
          const list = await res.json();
          setDestinations(list);
        }
      } catch(err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchDests();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-3 border-golf-gold-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs">Loading destinations grid...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-6 animate-fade-in max-w-7xl mx-auto">
      
      {/* Title */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Ceylon Golfing Destinations</h2>
        <p className="text-xs text-slate-400">
          Discover championship courses scattered across mist-covered hills, urban oases, and sandy tropical beaches in Sri Lanka.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
        {destinations.map(dest => (
          <div 
            key={dest.id} 
            className="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col h-full border border-golf-green-950/20 group"
          >
            {/* Image */}
            <div className="relative h-56 overflow-hidden">
              <img 
                src={dest.image_url} 
                alt={dest.name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-golf-charcoal-950 via-golf-charcoal-900/40 to-transparent"></div>
              
              {/* Overlay Course Count */}
              <div className="absolute bottom-4 left-4 bg-golf-green-950/90 border border-golf-gold-500/20 px-3 py-1 rounded-full text-[10px] font-bold text-golf-gold-400 flex items-center gap-1">
                <span>⛳</span>
                <span>{dest.course_count} {dest.course_count === 1 ? 'Course' : 'Courses'}</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <h3 className="font-serif text-xl font-bold text-white group-hover:text-golf-gold-400 transition-colors flex items-center gap-2">
                  <Landmark className="w-5 h-5 text-golf-gold-500" /> {dest.name}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {dest.description}
                </p>
              </div>

              <button
                onClick={() => onSelectDestination(dest.name)}
                className="w-full bg-golf-charcoal-800 hover:bg-golf-charcoal-700 text-golf-gold-400 font-bold py-2.5 rounded-xl border border-golf-charcoal-700/60 transition-all text-xs flex items-center justify-center gap-1.5"
              >
                <Compass className="w-4 h-4" />
                <span>{t.exploreDest}</span>
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
