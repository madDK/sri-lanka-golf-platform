import React, { useState } from 'react';
import { User, LogOut, Globe, Menu, X, Landmark, Compass, Award } from 'lucide-react';

export default function Navbar({ 
  token, 
  user, 
  setView, 
  view, 
  lang, 
  setLang, 
  t, 
  logout, 
  onOpenLogin, 
  onOpenRegister 
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  const handleNavClick = (targetView) => {
    setView(targetView);
    setMobileMenuOpen(false);
  };

  const selectLanguage = (selectedLang) => {
    setLang(selectedLang);
    setLangDropdownOpen(false);
  };

  const navItems = [
    { id: 'home', label: t.navHome, icon: Compass },
    { id: 'destinations', label: t.navDestinations, icon: Landmark },
    { id: 'packages', label: t.navPackages, icon: Award }
  ];

  return (
    <header className="sticky top-0 z-40 bg-golf-charcoal-950/90 backdrop-blur-md border-b border-golf-green-950/30 px-6 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('home')}>
        <div className="bg-golf-green-600 p-2 rounded-xl text-golf-gold-400 border border-golf-gold-500/20 shadow-md shadow-golf-green-900/30">
          <span className="text-xl font-bold">⛳</span>
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight font-serif text-white hover:text-golf-gold-400 transition-colors">
            {t.logo}
          </h1>
          <p className="text-[10px] text-golf-gold-500 tracking-wider uppercase font-semibold">
            {t.tagline}
          </p>
        </div>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-8">
        {navItems.map(item => {
          const active = view === item.id || (item.id === 'home' && view === 'courses');
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`text-sm font-semibold tracking-wide transition-all duration-200 relative py-1 ${
                active 
                  ? 'text-golf-gold-400 font-bold' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {item.label}
              {active && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-golf-gold-500 rounded-full"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Right Actions (Language, Auth) */}
      <div className="hidden md:flex items-center gap-4">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white bg-golf-charcoal-800 border border-golf-charcoal-700/60 transition-all"
          >
            <Globe className="w-4 h-4 text-golf-gold-500" />
            <span>{lang}</span>
          </button>
          {langDropdownOpen && (
            <div className="absolute right-0 mt-2 w-28 bg-golf-charcoal-800 border border-golf-charcoal-700 rounded-xl shadow-xl z-50 py-1">
              {['EN', 'SI', 'TA'].map(l => (
                <button
                  key={l}
                  onClick={() => selectLanguage(l)}
                  className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-golf-green-900/40 hover:text-golf-gold-400 ${
                    lang === l ? 'text-golf-gold-400 bg-golf-green-950/20' : 'text-slate-300'
                  }`}
                >
                  {l === 'EN' ? 'English' : l === 'SI' ? 'සිංහල' : 'தமிழ்'}
                </button>
              ))}
            </div>
          )}
        </div>

        {token ? (
          <div className="flex items-center gap-3">
            {/* User profile dropdown links */}
            <button
              onClick={() => handleNavClick('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                view === 'profile'
                  ? 'bg-golf-green-700/20 border-golf-gold-500 text-golf-gold-400 shadow-inner'
                  : 'bg-golf-charcoal-800 border-golf-charcoal-700 text-slate-300 hover:text-white hover:border-slate-500'
              }`}
            >
              <User className="w-4 h-4 text-golf-gold-400" />
              <span>{user?.name.split(' ')[0]}</span>
            </button>

            {/* Admin/Operator quick access */}
            {(user?.role === 'Admin' || user?.role === 'Operator') && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  view === 'admin'
                    ? 'bg-golf-gold-500 text-golf-charcoal-950 border-golf-gold-500'
                    : 'bg-golf-green-800 text-golf-gold-300 border-golf-green-700 hover:bg-golf-green-700'
                }`}
              >
                {t.navAdmin}
              </button>
            )}

            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-all border border-transparent hover:border-rose-900/30"
              title={t.logout}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white"
            >
              {t.login}
            </button>
            <button
              onClick={onOpenRegister}
              className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-golf-gold-400 to-golf-gold-600 text-golf-charcoal-950 hover:from-golf-gold-500 hover:to-golf-gold-700 rounded-xl shadow-lg shadow-golf-gold-950/20 transition-all"
            >
              {t.register}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Menu Buttons */}
      <div className="flex items-center gap-2 md:hidden">
        {/* Language button */}
        <button
          onClick={() => {
            const nextL = lang === 'EN' ? 'SI' : lang === 'SI' ? 'TA' : 'EN';
            setLang(nextL);
          }}
          className="p-2 rounded-lg bg-golf-charcoal-800 text-xs text-golf-gold-400 border border-golf-charcoal-700 font-bold"
        >
          {lang}
        </button>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-golf-charcoal-800 text-slate-300 hover:text-white border border-golf-charcoal-700"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-[73px] left-0 w-full bg-golf-charcoal-900 border-b border-golf-charcoal-800 flex flex-col p-6 gap-4 z-30 shadow-2xl md:hidden animate-fade-in">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className="flex items-center gap-3 py-2 text-slate-300 hover:text-golf-gold-400 font-semibold text-left"
            >
              <item.icon className="w-5 h-5 text-golf-gold-500" />
              <span>{item.label}</span>
            </button>
          ))}

          {token && (
            <>
              <button
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-3 py-2 text-slate-300 hover:text-golf-gold-400 font-semibold text-left"
              >
                <User className="w-5 h-5 text-golf-gold-500" />
                <span>{t.navProfile}</span>
              </button>

              {(user?.role === 'Admin' || user?.role === 'Operator') && (
                <button
                  onClick={() => handleNavClick('admin')}
                  className="flex items-center gap-3 py-2 text-golf-gold-300 hover:text-golf-gold-400 font-semibold text-left"
                >
                  <Landmark className="w-5 h-5 text-golf-gold-500" />
                  <span>{t.navAdmin}</span>
                </button>
              )}
            </>
          )}

          <div className="border-t border-golf-charcoal-800 pt-4 mt-2">
            {token ? (
              <button
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-950/20 text-rose-400 border border-rose-900/30 font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full py-3 rounded-xl border border-golf-charcoal-700 text-slate-300 font-semibold"
                >
                  {t.login}
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRegister();
                  }}
                  className="w-full py-3 rounded-xl bg-golf-gold-500 text-golf-charcoal-950 font-bold"
                >
                  {t.register}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
