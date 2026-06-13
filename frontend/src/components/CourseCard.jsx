import React from 'react';
import { Star, MapPin, Award } from 'lucide-react';

export default function CourseCard({ course, t, onViewDetails, onBookNow }) {
  // Truncate description helper
  const truncate = (str, n) => {
    return str.length > n ? str.substr(0, n - 1) + '...' : str;
  };

  return (
    <div className="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col h-full border border-golf-green-950/20 group">
      
      {/* Course Image Wrapper */}
      <div className="relative h-56 overflow-hidden">
        <img 
          src={course.image_url} 
          alt={course.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Location Badge */}
        <div className="absolute top-4 left-4 bg-golf-charcoal-900/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-semibold text-white flex items-center gap-1 border border-golf-gold-500/20">
          <MapPin className="w-3 h-3 text-golf-gold-400" />
          <span>{course.location}</span>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-4 right-4 bg-golf-green-950/90 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-golf-gold-400 flex items-center gap-1 border border-golf-gold-500/20">
          <Star className="w-3 h-3 fill-current" />
          <span>{course.rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Course Details Info */}
      <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-3">
          <h3 className="font-serif text-xl font-bold text-white group-hover:text-golf-gold-400 transition-colors">
            {course.name}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {truncate(course.description || '', 130)}
          </p>
        </div>

        {/* Technical metrics */}
        <div className="grid grid-cols-3 gap-2 border-y border-golf-charcoal-800 py-3 text-center text-[10px] text-slate-300">
          <div>
            <span className="block text-slate-500 uppercase font-semibold">Holes</span>
            <span className="font-bold text-sm text-white">{course.holes}</span>
          </div>
          <div>
            <span className="block text-slate-500 uppercase font-semibold">Par</span>
            <span className="font-bold text-sm text-white">{course.par}</span>
          </div>
          <div>
            <span className="block text-slate-500 uppercase font-semibold">Length</span>
            <span className="font-bold text-sm text-white">{course.length_yards} Yds</span>
          </div>
        </div>

        {/* Pricing & Actions */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <span className="block text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{t.startingFrom}</span>
            <span className="text-base font-bold text-golf-gold-400 font-serif">LKR {course.starting_price.toLocaleString()}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onViewDetails(course.id)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-golf-charcoal-800 hover:bg-golf-charcoal-700 border border-golf-charcoal-700/60 text-white transition-all"
            >
              {t.viewDetails}
            </button>
            <button
              onClick={() => onBookNow(course.id)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-golf-green-600 hover:bg-golf-green-700 text-white border border-golf-green-500/20 shadow-md shadow-golf-green-950/20 transition-all"
            >
              {t.bookNow}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
