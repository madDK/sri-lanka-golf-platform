import React, { useState, useEffect } from 'react';
import { ChevronLeft, Star, Sun, Wind, Droplets, MapPin, ShieldAlert, Award } from 'lucide-react';
import { API_BASE } from '../config';

export default function CourseDetails({ 
  courseId, 
  token, 
  t, 
  onBack, 
  onBookNow,
  triggerAlert
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);



  const fetchDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/courses/${courseId}`);
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch(err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (courseId) {
      fetchDetails();
    }
  }, [courseId]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      triggerAlert('error', 'Please log in to write a review.');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await fetch(`${API_BASE}/bookings/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId,
          rating: newRating,
          comment: newComment
        })
      });

      if (res.ok) {
        triggerAlert('success', 'Thank you! Your review has been submitted.');
        setNewComment('');
        fetchDetails(); // Reload reviews & updated rating
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to submit review.');
      }
    } catch(err) {
      triggerAlert('error', 'Network error.');
    }
    setSubmittingReview(false);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-golf-gold-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Loading course details...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-20 text-center">
        <p className="text-rose-400">Failed to load course details.</p>
        <button onClick={onBack} className="mt-4 text-golf-gold-500 font-semibold flex items-center justify-center mx-auto gap-2">
          <ChevronLeft className="w-4 h-4" /> Go Back
        </button>
      </div>
    );
  }

  const { course, reviews, weather } = data;

  return (
    <div className="space-y-10 py-6 animate-fade-in">
      
      {/* Back navigation */}
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4 text-golf-gold-500" />
        <span>Back to Championship Courses</span>
      </button>

      {/* Hero Gallery Header */}
      <div className="relative h-[45vh] rounded-3xl overflow-hidden shadow-2xl border border-golf-green-950/20">
        <img 
          src={course.image_url} 
          alt={course.name} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-golf-charcoal-950 via-golf-charcoal-900/40 to-transparent"></div>
        
        {/* Course Core Header Info Overlay */}
        <div className="absolute bottom-8 left-8 right-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-golf-gold-400 font-semibold text-xs tracking-wider uppercase">
              <MapPin className="w-3.5 h-3.5" />
              <span>{course.location}, Sri Lanka</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-serif text-white">
              {course.name}
            </h2>
          </div>

          <div className="flex items-center gap-4 bg-golf-charcoal-950/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-golf-gold-500/20">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">{t.startingFrom}</span>
              <span className="text-xl font-bold text-golf-gold-400 font-serif">LKR {course.starting_price.toLocaleString()}</span>
            </div>
            <button
              onClick={() => onBookNow(course.id)}
              className="bg-gradient-to-r from-golf-gold-400 to-golf-gold-600 hover:from-golf-gold-500 hover:to-golf-gold-700 text-golf-charcoal-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg text-sm"
            >
              {t.bookNow}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left 2 Columns: Information */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Description */}
          <div className="glass-panel p-8 rounded-2xl border border-golf-green-950/20 space-y-4">
            <h3 className="text-lg font-bold text-white font-serif flex items-center gap-2 border-b border-golf-charcoal-800 pb-3">
              <Award className="w-5 h-5 text-golf-gold-500" /> Course Profile
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {course.description}
            </p>

            {/* Course Metrics */}
            <div className="grid grid-cols-3 gap-4 pt-4 text-center">
              <div className="bg-golf-charcoal-900/50 p-4 rounded-xl border border-golf-charcoal-800/80">
                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">{t.holes}</span>
                <span className="text-2xl font-serif font-bold text-golf-gold-400">{course.holes}</span>
              </div>
              <div className="bg-golf-charcoal-900/50 p-4 rounded-xl border border-golf-charcoal-800/80">
                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">{t.par}</span>
                <span className="text-2xl font-serif font-bold text-golf-gold-400">{course.par}</span>
              </div>
              <div className="bg-golf-charcoal-900/50 p-4 rounded-xl border border-golf-charcoal-800/80">
                <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Length</span>
                <span className="text-lg font-serif font-bold text-golf-gold-400">{course.length_yards?.toLocaleString()} Yds</span>
              </div>
            </div>
          </div>

          {/* Facilities & Amenities */}
          <div className="glass-panel p-8 rounded-2xl border border-golf-green-950/20 space-y-4">
            <h3 className="text-lg font-bold text-white font-serif border-b border-golf-charcoal-800 pb-3">
              {t.facilities}
            </h3>
            <div className="flex flex-wrap gap-2.5">
              {course.facilities.map((fac, idx) => (
                <span 
                  key={idx} 
                  className="bg-golf-green-950/30 text-golf-gold-300 border border-golf-green-900/40 px-4 py-2 rounded-xl text-xs font-semibold"
                >
                  ⛳ {fac}
                </span>
              ))}
            </div>
          </div>

          {/* Reviews list */}
          <div className="glass-panel p-8 rounded-2xl border border-golf-green-950/20 space-y-6">
            <h3 className="text-lg font-bold text-white font-serif border-b border-golf-charcoal-800 pb-3 flex justify-between items-center">
              <span>{t.reviews} ({reviews.length})</span>
              <div className="flex items-center gap-1.5 text-golf-gold-400 text-sm font-bold">
                <Star className="w-4 h-4 fill-current" />
                <span>{course.rating.toFixed(1)} / 5.0</span>
              </div>
            </h3>

            {/* List */}
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No reviews yet. Be the first to review this course!</p>
              ) : (
                reviews.map(rev => (
                  <div key={rev.id} className="bg-golf-charcoal-900/40 p-4 rounded-xl border border-golf-charcoal-800/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{rev.user_name}</span>
                      <div className="flex text-golf-gold-500">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-300 italic">"{rev.comment}"</p>
                    <span className="text-[10px] text-slate-500 block text-right">
                      {new Date(rev.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Write a review form */}
            {token ? (
              <form onSubmit={handleReviewSubmit} className="border-t border-golf-charcoal-800 pt-6 space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t.writeReview}</h4>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Rating:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-5 h-5 ${star <= newRating ? 'text-golf-gold-500 fill-current' : 'text-slate-600'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    rows="3"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your golfing experience at this course..."
                    required
                    className="w-full bg-golf-charcoal-800/60 border border-golf-charcoal-700/60 rounded-xl p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-golf-gold-500 placeholder-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="bg-golf-green-700 hover:bg-golf-green-600 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-2 border border-golf-green-600/30"
                >
                  {submittingReview ? 'Submitting...' : t.submitReview}
                </button>
              </form>
            ) : (
              <div className="bg-golf-charcoal-900/30 border border-golf-charcoal-800 p-4 rounded-xl text-center text-xs text-slate-400">
                Please log in to submit a rating and review for this course.
              </div>
            )}
          </div>

        </div>

        {/* Right 1 Column: Weather, Dress Code & Map */}
        <div className="space-y-8">

          {/* Weather Widget */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 text-center space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t.weatherTitle}</h4>
            <div className="flex items-center justify-center gap-3">
              <Sun className="w-10 h-10 text-golf-gold-400 animate-pulse-slow" />
              <div>
                <span className="text-3xl font-serif font-bold text-white">{weather.temp}°C</span>
                <span className="block text-xs text-golf-gold-400 font-semibold">{weather.condition}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t border-golf-charcoal-800/80 pt-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5 justify-center">
                <Wind className="w-4 h-4 text-golf-green-400" />
                <span>Wind: {weather.wind}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span>Humidity: {weather.humidity}</span>
              </div>
            </div>
          </div>

          {/* Dress Code Box */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 space-y-3 bg-gradient-to-br from-golf-charcoal-900 to-golf-green-950/10">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-golf-gold-500" /> {t.dressCode}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "{course.dress_code}"
            </p>
          </div>

          {/* Satellite Map simulation */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Interactive Course Map</h4>
            
            {/* Mock satellite image */}
            <div className="relative h-48 rounded-xl overflow-hidden border border-golf-charcoal-800">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/courses/shangrila.png')" }}></div>
              <div className="absolute inset-0 bg-golf-green-950/20 backdrop-brightness-75"></div>
              
              {/* Fake coordinate grid overlay */}
              <div className="absolute inset-0 opacity-20 border-t border-l border-white/20 grid grid-cols-4 grid-rows-4 pointer-events-none">
                {Array.from({ length: 16 }).map((_, i) => <div key={i} className="border-r border-b border-white/20"></div>)}
              </div>

              {/* Pin indicator */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                <div className="bg-golf-gold-500 text-golf-charcoal-950 p-1.5 rounded-full shadow-lg border border-white animate-bounce">
                  ⛳
                </div>
                <span className="bg-golf-charcoal-950/90 text-white text-[9px] px-1.5 py-0.5 rounded mt-1 font-bold whitespace-nowrap border border-golf-gold-500/20">
                  {course.name}
                </span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500">
              <span>GPS Coordinates: {course.latitude.toFixed(4)}° N, {course.longitude.toFixed(4)}° E</span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
