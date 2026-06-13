import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, ShieldCheck, Award, CreditCard, ChevronLeft, ArrowRight, UserPlus, AlertCircle } from 'lucide-react';
import { translations } from './utils/translations';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Hero from './components/Hero';
import CourseCard from './components/CourseCard';
import CourseDetails from './components/CourseDetails';
import BookingEngine from './components/BookingEngine';
import UserProfile from './components/UserProfile';
import AdminDashboard from './components/AdminDashboard';
import AiAssistant from './components/AiAssistant';
import Destinations from './components/Destinations';
import Packages from './components/Packages';
import { API_BASE } from './config';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('home'); // 'home', 'course_details', 'booking_engine', 'destinations', 'packages', 'profile', 'admin'
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search Filters
  const [searchFilters, setSearchFilters] = useState({
    location: 'All',
    date: '',
    players: '1',
    teeTimePref: 'Any'
  });

  // Course list
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Modals state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  
  // Auth Form details
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Language Settings
  const [lang, setLang] = useState('EN'); // 'EN', 'SI', 'TA'
  const t = translations[lang];

  // Load user profile if token exists
  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setUser(null);
    }
  }, [token]);

  // Load courses
  useEffect(() => {
    fetchCourses();
  }, [searchFilters.location]);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const locFilter = searchFilters.location !== 'All' ? `?location=${searchFilters.location}` : '';
      const res = await fetch(`${API_BASE}/courses${locFilter}`);
      if (res.ok) {
        const list = await res.json();
        setCourses(list);
      }
    } catch(err) {
      console.error(err);
    }
    setLoadingCourses(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setView('home');
    triggerAlert('success', 'Logged out successfully');
  };

  const triggerAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 5000);
  };

  // Auth submits
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShowLoginModal(false);
        setAuthEmail('');
        setAuthPassword('');
        triggerAlert('success', `Welcome back, ${data.user.name}!`);
      } else {
        triggerAlert('error', data.error || 'Login verification failed.');
      }
    } catch(err) {
      triggerAlert('error', 'API Server offline.');
    }
    setAuthSubmitting(false);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword,
          phone: authPhone
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        setShowRegisterModal(false);
        setAuthName('');
        setAuthEmail('');
        setAuthPassword('');
        setAuthPhone('');
        triggerAlert('success', 'Registration completed successfully!');
      } else {
        triggerAlert('error', data.error || 'Failed to complete registration.');
      }
    } catch(err) {
      triggerAlert('error', 'Server unreachable.');
    }
    setAuthSubmitting(false);
  };

  const handleSearchCourses = (filters) => {
    setSearchFilters(filters);
    setView('home');
  };

  const handleSelectDestination = (locationName) => {
    setSearchFilters(prev => ({ ...prev, location: locationName }));
    setView('home');
  };

  const handleBookNow = (courseId) => {
    if (!token) {
      setShowLoginModal(true);
      triggerAlert('error', 'Please log in to book tee times.');
      return;
    }
    setSelectedCourseId(courseId);
    setView('booking_engine');
  };

  const handleViewDetails = (courseId) => {
    setSelectedCourseId(courseId);
    setView('course_details');
  };

  const handleBookingSuccess = () => {
    setView('profile');
  };

  // Reviews carousel state
  const [activeReviewIdx, setActiveReviewIdx] = useState(0);
  const golferReviews = [
    { name: "Julian Vance (UK)", comment: "Victoria Golf Resort was absolutely stunning! The views of the Knuckles mountains are incomparable. Instant booking and payment made everything simple.", rating: 5 },
    { name: "Aadhil Naeem (Local Golfer)", comment: "Love Nuwara Eliya GC for the cool misty climate. Tight fairways are challenging, but the course is in great condition. Highly recommend Ceylon Golfing portal.", rating: 5 },
    { name: "Dr. Kenji Sato (Japan)", comment: "Shangri-La Hambantota resort course was a fantastic oceanfront play. Bunkers are pristine, coconut grove is a fun hazard. 10/10.", rating: 4.8 }
  ];

  return (
    <div className="relative min-h-screen bg-zinc-950 text-slate-100 flex flex-col justify-between overflow-x-hidden">
      
      {/* Decorative Glow Elements */}
      <div className="glow-bubble bg-golf-green-950 w-[500px] h-[500px] top-[-100px] left-[-150px]"></div>
      <div className="glow-bubble bg-golf-gold-900/10 w-[450px] h-[450px] bottom-[-100px] right-[-100px]"></div>

      {/* Global Alert Notification */}
      {alert && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transition-all duration-300 animate-slide-up ${
          alert.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-950/90 border-rose-500/30 text-rose-300'
        }`}>
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-xs font-semibold">{alert.message}</span>
        </div>
      )}

      {/* Navbar Container */}
      <Navbar 
        token={token} 
        user={user} 
        setView={setView} 
        view={view}
        lang={lang}
        setLang={setLang}
        t={t}
        logout={logout}
        onOpenLogin={() => setShowLoginModal(true)}
        onOpenRegister={() => setShowRegisterModal(true)}
      />

      {/* Main View Area */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-6 z-10">
        
        {/* VIEW 1: HOME PORTAL */}
        {view === 'home' && (
          <div className="space-y-20 pb-12">
            
            {/* Hero search engine */}
            <Hero t={t} onSearch={handleSearchCourses} />

            {/* Trust Indicators */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-6xl mx-auto text-center">
              {[
                { title: t.trustInstant, desc: t.trustInstantDesc, icon: "⚡" },
                { title: t.trustSecure, desc: t.trustSecureDesc, icon: "🔒" },
                { title: t.trustCourses, desc: t.trustCoursesDesc, icon: "⛳" },
                { title: t.trustPrice, desc: t.trustPriceDesc, icon: "🏷️" },
                { title: t.trustSupport, desc: t.trustSupportDesc, icon: "📞" }
              ].map((ind, i) => (
                <div key={i} className="glass-panel p-5 rounded-2xl border border-golf-green-950/10 space-y-2">
                  <span className="text-2xl block mb-2">{ind.icon}</span>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">{ind.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-normal">{ind.desc}</p>
                </div>
              ))}
            </section>

            {/* Featured courses grid */}
            <section className="space-y-8">
              <div className="text-center space-y-2 max-w-2xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-serif font-bold text-white">Championship Golf Resorts</h2>
                <p className="text-xs text-slate-400">
                  Select and book live tee times instantly at our curated 5-star signature layouts across Sri Lanka.
                </p>
              </div>

              {loadingCourses ? (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                  <div className="w-8 h-8 border-3 border-golf-gold-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500 italic">Updating course roster...</p>
                </div>
              ) : courses.length === 0 ? (
                <p className="text-center text-xs text-slate-500 italic py-10">No matching golf courses found for this filter.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {courses.map(c => (
                    <CourseCard 
                      key={c.id} 
                      course={c} 
                      t={t} 
                      onBookNow={handleBookNow} 
                      onViewDetails={handleViewDetails} 
                    />
                  ))}
                </div>
              )}
            </section>

            {/* How it works grid */}
            <section className="glass-panel p-8 sm:p-10 rounded-3xl border border-golf-green-950/20 max-w-5xl mx-auto space-y-8">
              <h3 className="text-2xl font-serif font-bold text-white text-center">How Ceylon Golfing Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center text-xs">
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-golf-green-900/40 border border-golf-gold-500/20 text-golf-gold-400 rounded-full flex items-center justify-center mx-auto font-bold text-sm">1</div>
                  <h4 className="font-bold text-white text-sm">Find a Golf Course</h4>
                  <p className="text-slate-400">Filter courses by location, layout specs, price level, and local weather forecasts.</p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-golf-green-900/40 border border-golf-gold-500/20 text-golf-gold-400 rounded-full flex items-center justify-center mx-auto font-bold text-sm">2</div>
                  <h4 className="font-bold text-white text-sm">Choose Date & Tee Time</h4>
                  <p className="text-slate-400">Select tomorrow or any future date. Pick morning peak slots or afternoon value slots.</p>
                </div>
                <div className="space-y-2">
                  <div className="w-10 h-10 bg-golf-green-900/40 border border-golf-gold-500/20 text-golf-gold-400 rounded-full flex items-center justify-center mx-auto font-bold text-sm">3</div>
                  <h4 className="font-bold text-white text-sm">Pay Online & Get Ticket</h4>
                  <p className="text-slate-400">Complete checkout using Visa, Mastercard, Genie, or Stripe. Receive instant digital check-in vouchers.</p>
                </div>
              </div>
            </section>

            {/* Testimonials Review Carousel */}
            <section className="space-y-6 max-w-3xl mx-auto text-center py-6">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Client Endorsements</h3>
              <div className="glass-panel p-8 rounded-2xl border border-golf-green-950/15 min-h-[160px] flex flex-col justify-between space-y-4">
                <p className="text-slate-300 italic text-sm leading-relaxed">
                  "{golferReviews[activeReviewIdx].comment}"
                </p>
                <div>
                  <span className="block font-bold text-white text-xs">{golferReviews[activeReviewIdx].name}</span>
                  <div className="flex justify-center text-golf-gold-500 mt-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-center gap-2">
                {golferReviews.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveReviewIdx(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      activeReviewIdx === idx ? 'bg-golf-gold-500 w-4' : 'bg-golf-charcoal-700'
                    }`}
                  ></button>
                ))}
              </div>
            </section>

            {/* Mobile app download promocard */}
            <section className="glass-panel rounded-3xl border border-golf-gold-500/10 p-8 sm:p-12 max-w-5xl mx-auto bg-gradient-to-r from-golf-charcoal-900 via-golf-green-950/20 to-golf-charcoal-900 flex flex-col md:flex-row items-center justify-between gap-8 text-xs">
              <div className="space-y-3 max-w-xl">
                <span className="text-golf-gold-400 font-bold uppercase tracking-wider block">Exclusive Mobile Access</span>
                <h3 className="text-2xl font-serif font-bold text-white">Download the Ceylon Golfing App</h3>
                <p className="text-slate-400 leading-relaxed">
                  Book slots on the fly, toggle offline reservation logs, store digital check-in passes, and chat directly with our 24/7 concierge support.
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => triggerAlert('success', 'Redirecting to Apple App Store sandbox...')}
                  className="bg-golf-charcoal-800 hover:bg-golf-charcoal-750 text-white font-bold px-5 py-3 rounded-xl border border-golf-charcoal-700/60 shadow flex items-center gap-2"
                >
                  <span></span> iOS App Store
                </button>
                <button
                  onClick={() => triggerAlert('success', 'Redirecting to Google Play Store sandbox...')}
                  className="bg-golf-charcoal-800 hover:bg-golf-charcoal-750 text-white font-bold px-5 py-3 rounded-xl border border-golf-charcoal-700/60 shadow flex items-center gap-2"
                >
                  <span>▶</span> Google Play Store
                </button>
              </div>
            </section>

          </div>
        )}

        {/* VIEW 2: COURSE DETAILS PAGE */}
        {view === 'course_details' && (
          <CourseDetails 
            courseId={selectedCourseId}
            token={token}
            t={t}
            onBack={() => setView('home')}
            onBookNow={handleBookNow}
            triggerAlert={triggerAlert}
          />
        )}

        {/* VIEW 3: LIVE TEE TIME BOOKING ENGINE */}
        {view === 'booking_engine' && (
          <BookingEngine 
            courseId={selectedCourseId}
            token={token}
            user={user}
            t={t}
            onBack={() => setView('home')}
            triggerAlert={triggerAlert}
            onBookingSuccess={handleBookingSuccess}
          />
        )}

        {/* VIEW 4: DESTINATIONS */}
        {view === 'destinations' && (
          <Destinations t={t} onSelectDestination={handleSelectDestination} />
        )}

        {/* VIEW 5: STAY & PLAY PACKAGES */}
        {view === 'packages' && (
          <Packages token={token} t={t} triggerAlert={triggerAlert} />
        )}

        {/* VIEW 6: USER PORTAL */}
        {view === 'profile' && (
          <UserProfile token={token} t={t} triggerAlert={triggerAlert} />
        )}

        {/* VIEW 7: ADMIN PANEL */}
        {view === 'admin' && (
          <AdminDashboard token={token} t={t} triggerAlert={triggerAlert} />
        )}

      </main>

      {/* Floating AI Assistant Chatbot */}
      <AiAssistant t={t} />

      {/* Footer Container */}
      <Footer t={t} setView={setView} />

      {/* Auth: Login Modal Overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-xs">
          <div className="bg-golf-charcoal-900 border border-golf-gold-500/20 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative space-y-6">
            <div className="flex justify-between border-b border-golf-charcoal-800 pb-3 items-center">
              <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                <span>🔐</span> Log In to Ceylon Golfing
              </h3>
              <button onClick={() => setShowLoginModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. dushmantha@gmail.com"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full bg-gradient-to-r from-golf-gold-400 to-golf-gold-600 text-golf-charcoal-950 font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5"
              >
                {authSubmitting ? 'Verifying...' : 'Access Account'}
              </button>
            </form>

            <div className="text-center text-[10px] text-slate-500 space-y-1 pt-2 border-t border-golf-charcoal-850">
              <p>Demo credentials:</p>
              <p>Admin: <span className="font-bold text-slate-300">admin@srilankagolf.com</span> (pwd: <span className="font-bold text-slate-300">golf123</span>)</p>
              <p>Customer: <span className="font-bold text-slate-300">dushmantha@gmail.com</span> (pwd: <span className="font-bold text-slate-300">golf123</span>)</p>
              
              <button
                onClick={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
                className="text-golf-gold-400 hover:underline block mx-auto mt-3"
              >
                Don't have an account? Register Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth: Register Modal Overlay */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in text-xs">
          <div className="bg-golf-charcoal-900 border border-golf-gold-500/20 max-w-sm w-full rounded-2xl p-6 shadow-2xl relative space-y-6">
            <div className="flex justify-between border-b border-golf-charcoal-800 pb-3 items-center">
              <h3 className="text-base font-serif font-bold text-white flex items-center gap-2">
                <span>📝</span> Register Golfer Profile
              </h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-slate-400">Full Name</label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Phone Number</label>
                <input
                  type="text"
                  value={authPhone}
                  onChange={(e) => setAuthPhone(e.target.value)}
                  placeholder="e.g. +94771234567"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full bg-gradient-to-r from-golf-gold-400 to-golf-gold-600 text-golf-charcoal-950 font-bold py-2.5 rounded-xl transition-all flex justify-center items-center gap-1.5"
              >
                {authSubmitting ? 'Creating Profile...' : 'Complete Signup'}
              </button>
            </form>

            <div className="text-center text-[10px] text-slate-500 pt-2 border-t border-golf-charcoal-850">
              <button
                onClick={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
                className="text-golf-gold-400 hover:underline block mx-auto"
              >
                Already have an account? Log In
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
