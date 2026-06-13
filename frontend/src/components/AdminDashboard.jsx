import React, { useState, useEffect } from 'react';
import { BarChart, DollarSign, Calendar, Users, Shield, Plus, Edit, Trash, Save, Check, X, Clipboard } from 'lucide-react';
import { API_BASE } from '../config';

export default function AdminDashboard({ token, t, triggerAlert }) {
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tabs: 'analytics', 'bookings', 'courses', 'users'
  const [activeTab, setActiveTab] = useState('analytics');

  // Add/Edit Course form states
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [formName, setFormName] = useState('');
  const [formLocation, setFormLocation] = useState('Kandy');
  const [formPrice, setFormPrice] = useState(10000);
  const [formDesc, setFormDesc] = useState('');
  const [formHoles, setFormHoles] = useState(18);
  const [formPar, setFormPar] = useState(72);
  const [formLength, setFormLength] = useState(6500);
  const [formFacilities, setFormFacilities] = useState('');
  const [formDress, setFormDress] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');



  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // 1. KPI Stats & charts
      const statsRes = await fetch(`${API_BASE}/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
        setCharts(d.charts);
      }

      // 2. Bookings
      const bookingsRes = await fetch(`${API_BASE}/bookings/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (bookingsRes.ok) {
        const b = await bookingsRes.json();
        setBookings(b);
      }

      // 3. Courses
      const coursesRes = await fetch(`${API_BASE}/courses`);
      if (coursesRes.ok) {
        const c = await coursesRes.json();
        setCourses(c);
      }

      // 4. Users list
      const usersRes = await fetch(`${API_BASE}/admin/dashboard/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u);
      }

    } catch(err) {
      triggerAlert('error', 'Failed to retrieve administrative records.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      fetchAdminData();
    }
  }, [token]);

  // Manually update booking status
  const handleUpdateBookingStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        triggerAlert('success', `Booking marked as ${newStatus}`);
        fetchAdminData();
      }
    } catch(err) {
      triggerAlert('error', 'Status modification failed.');
    }
  };

  // Promote/demote user
  const handleChangeRole = async (id, newRole) => {
    try {
      const res = await fetch(`${API_BASE}/admin/dashboard/users/${id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        triggerAlert('success', 'User role upgraded successfully.');
        fetchAdminData();
      }
    } catch(err) {
      triggerAlert('error', 'Role update failed.');
    }
  };

  // Submit course form
  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formName,
      location: formLocation,
      starting_price: Number(formPrice),
      description: formDesc,
      holes: Number(formHoles),
      par: Number(formPar),
      length_yards: Number(formLength),
      facilities: formFacilities.split(',').map(s => s.trim()).filter(s => s !== ''),
      dress_code: formDress,
      image_url: formImageUrl || `/courses/${formLocation.toLowerCase().replace(' ', '_')}.png`
    };

    try {
      let res;
      if (editingCourseId) {
        res = await fetch(`${API_BASE}/courses/${editingCourseId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/courses`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        triggerAlert('success', editingCourseId ? 'Course updated successfully.' : 'Course added and tee times seeded.');
        setShowCourseForm(false);
        setEditingCourseId(null);
        clearCourseForm();
        fetchAdminData();
      } else {
        const err = await res.json();
        triggerAlert('error', err.error || 'Failed to submit course data.');
      }
    } catch(err) {
      triggerAlert('error', 'Network error.');
    }
  };

  const clearCourseForm = () => {
    setFormName('');
    setFormLocation('Kandy');
    setFormPrice(12000);
    setFormDesc('');
    setFormHoles(18);
    setFormPar(72);
    setFormLength(6500);
    setFormFacilities('');
    setFormDress('');
    setFormImageUrl('');
  };

  const handleEditCourseClick = (course) => {
    setEditingCourseId(course.id);
    setFormName(course.name);
    setFormLocation(course.location);
    setFormPrice(course.starting_price);
    setFormDesc(course.description);
    setFormHoles(course.holes);
    setFormPar(course.par);
    setFormLength(course.length_yards || 6000);
    setFormFacilities(course.facilities.join(', '));
    setFormDress(course.dress_code || '');
    setFormImageUrl(course.image_url || '');
    setShowCourseForm(true);
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Are you sure you want to delete this course? All bookings and tee times will be purged.')) return;
    try {
      const res = await fetch(`${API_BASE}/courses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerAlert('success', 'Course purged successfully.');
        fetchAdminData();
      }
    } catch(err) {
      triggerAlert('error', 'Purge request failed.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-golf-gold-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm">Accessing administrative channels...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 py-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* Title */}
      <div className="border-b border-golf-charcoal-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-serif font-bold text-white">Administration Platform</h2>
          <p className="text-xs text-slate-400 mt-1">Audit platform logs, manage golf slots inventory, edit parameters and update access roles.</p>
        </div>

        <div className="flex bg-golf-charcoal-900 border border-golf-charcoal-800 rounded-xl p-1 text-xs font-semibold">
          {[
            { id: 'analytics', label: 'Analytics' },
            { id: 'bookings', label: 'Bookings Log' },
            { id: 'courses', label: 'Manage Courses' },
            { id: 'users', label: 'User Roles' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowCourseForm(false); }}
              className={`px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-golf-gold-500 text-golf-charcoal-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Widgets Row */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Revenue */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">Platform Revenue</span>
              <span className="text-xl font-serif font-bold text-golf-gold-400">LKR {stats.totalRevenue.toLocaleString()}</span>
            </div>
            <div className="bg-golf-gold-950/40 border border-golf-gold-500/20 text-golf-gold-400 p-3 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Bookings */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">Confirmed Slots</span>
              <span className="text-xl font-serif font-bold text-white">{stats.totalBookings} Bookings</span>
            </div>
            <div className="bg-golf-green-950/40 border border-golf-green-900/20 text-golf-gold-400 p-3 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* Registered Users */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">Users Database</span>
              <span className="text-xl font-serif font-bold text-white">{stats.totalUsers} Members</span>
            </div>
            <div className="bg-golf-charcoal-800 border border-golf-charcoal-700 text-golf-gold-400 p-3 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Total Courses */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 flex items-center justify-between">
            <div className="space-y-1">
              <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest">Active Golf Resorts</span>
              <span className="text-xl font-serif font-bold text-white">{stats.totalCourses} Courses</span>
            </div>
            <div className="bg-golf-green-900/20 text-golf-gold-400 p-3 rounded-xl">
              ⛳
            </div>
          </div>

        </div>
      )}

      {/* Main Tab Views */}
      
      {/* 1. ANALYTICS TABS */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Revenue by course visual ledger */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-serif flex items-center gap-2 border-b border-golf-charcoal-800 pb-3">
              <BarChart className="w-4 h-4 text-golf-gold-500" /> Revenue Distribution By Course
            </h3>
            
            <div className="space-y-4">
              {charts?.revenueByCourse.map((c, idx) => {
                const maxRev = Math.max(...charts.revenueByCourse.map(item => item.revenue || 1));
                const pct = ((c.revenue || 0) / maxRev) * 100;
                return (
                  <div key={idx} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">{c.courseName}</span>
                      <span className="text-golf-gold-400">LKR {c.revenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-golf-charcoal-850 h-3.5 rounded-full overflow-hidden border border-golf-charcoal-800">
                      <div 
                        className="bg-gradient-to-r from-golf-green-600 to-golf-gold-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {(!charts || charts.revenueByCourse.length === 0) && (
                <p className="text-xs text-slate-500 italic text-center py-10">No revenue data compiled yet.</p>
              )}
            </div>
          </div>

          {/* Bookings Growth trend visual ledger */}
          <div className="glass-panel p-6 rounded-2xl border border-golf-green-950/20 space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-serif flex items-center gap-2 border-b border-golf-charcoal-800 pb-3">
              <Clipboard className="w-4 h-4 text-golf-gold-500" /> Recent Bookings Volume (Last 7 Days)
            </h3>
            
            <div className="space-y-4">
              {charts?.daily.map((d, idx) => {
                const maxBookings = Math.max(...charts.daily.map(item => item.Bookings || 1));
                const pct = ((d.Bookings || 0) / maxBookings) * 100;
                return (
                  <div key={idx} className="flex items-center gap-4 text-xs">
                    <span className="w-14 text-slate-400 font-mono">{d.date}</span>
                    <div className="flex-1 bg-golf-charcoal-850 h-3.5 rounded-full overflow-hidden border border-golf-charcoal-800">
                      <div 
                        className="bg-golf-gold-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                    <span className="w-14 text-right text-white font-bold">{d.Bookings} Bookings</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* 2. BOOKINGS LOG TAB */}
      {activeTab === 'bookings' && (
        <div className="glass-panel rounded-2xl border border-golf-green-950/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-golf-charcoal-900 border-b border-golf-charcoal-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Resort</th>
                  <th className="p-4">Tee Schedule</th>
                  <th className="p-4">Golfers</th>
                  <th className="p-4">Paid (LKR)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-golf-charcoal-850 text-slate-300">
                {bookings.map(book => {
                  const isConfirmed = book.status === 'Confirmed';
                  return (
                    <tr key={book.id} className="hover:bg-golf-charcoal-900/30">
                      <td className="p-4 font-mono font-bold text-golf-gold-400">{book.transaction_id}</td>
                      <td className="p-4">
                        <span className="block font-bold text-white">{book.customer_name}</span>
                        <span className="text-[10px] text-slate-500">{book.customer_email}</span>
                      </td>
                      <td className="p-4 font-semibold text-white">{book.course_name}</td>
                      <td className="p-4">
                        <span className="block font-bold text-white">{book.booking_date}</span>
                        <span className="text-[10px] text-slate-500">{book.tee_time_string}</span>
                      </td>
                      <td className="p-4 font-semibold">{book.players_count}</td>
                      <td className="p-4 font-bold font-mono text-white">{book.total_price.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          isConfirmed 
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                            : 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                        }`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1.5">
                        {isConfirmed ? (
                          <button
                            onClick={() => handleUpdateBookingStatus(book.id, 'Cancelled')}
                            className="bg-rose-950/20 text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 border border-rose-900/40 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                          >
                            Cancel & Refund
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateBookingStatus(book.id, 'Confirmed')}
                            className="bg-emerald-950/20 text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300 border border-emerald-900/40 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                          >
                            Re-Confirm
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MANAGE COURSES TAB */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white font-serif">Resort Directory</h3>
            {!showCourseForm && (
              <button
                onClick={() => { setShowCourseForm(true); setEditingCourseId(null); clearCourseForm(); }}
                className="bg-golf-gold-500 hover:bg-golf-gold-600 text-golf-charcoal-950 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Golf Resort
              </button>
            )}
          </div>

          {/* Form */}
          {showCourseForm && (
            <form onSubmit={handleCourseSubmit} className="glass-panel p-6 sm:p-8 rounded-2xl border border-golf-gold-500/20 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <h4 className="md:col-span-3 text-sm font-bold text-white font-serif border-b border-golf-charcoal-800 pb-2 flex justify-between">
                <span>{editingCourseId ? 'Edit Golf Course' : 'Create New Golf Course'}</span>
                <button type="button" onClick={() => setShowCourseForm(false)} className="text-slate-500 hover:text-white">✕</button>
              </h4>

              <div className="space-y-1">
                <label className="text-slate-400">Course Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Location</label>
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                >
                  <option value="Kandy">Kandy</option>
                  <option value="Colombo">Colombo</option>
                  <option value="Nuwara Eliya">Nuwara Eliya</option>
                  <option value="Hambantota">Hambantota</option>
                  <option value="Trincomalee">Trincomalee</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Starting Price (LKR)</label>
                <input
                  type="number"
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Course Image URL</label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="e.g. /courses/victoria.png"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Holes Count</label>
                <input
                  type="number"
                  value={formHoles}
                  onChange={(e) => setFormHoles(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Par Rating</label>
                <input
                  type="number"
                  value={formPar}
                  onChange={(e) => setFormPar(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Length (Yards)</label>
                <input
                  type="number"
                  value={formLength}
                  onChange={(e) => setFormLength(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-slate-400">Resort Description</label>
                <textarea
                  rows="3"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-slate-400">Facilities (comma separated)</label>
                <input
                  type="text"
                  value={formFacilities}
                  onChange={(e) => setFormFacilities(e.target.value)}
                  placeholder="Pro Shop, Driving Range, Fine Dining"
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-slate-400">Dress Code Policy</label>
                <input
                  type="text"
                  value={formDress}
                  onChange={(e) => setFormDress(e.target.value)}
                  className="w-full bg-golf-charcoal-800 border border-golf-charcoal-700/60 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="md:col-span-3 flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-golf-charcoal-700 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-golf-gold-500 text-golf-charcoal-950 font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{editingCourseId ? 'Save Changes' : 'Publish & Seed Slots'}</span>
                </button>
              </div>
            </form>
          )}

          {/* List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {courses.map(c => (
              <div key={c.id} className="glass-panel p-5 rounded-2xl border border-golf-green-950/20 flex gap-4 text-xs relative group">
                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm font-serif">{c.name}</h4>
                    <span className="text-[10px] text-slate-500">{c.location} • LKR {c.starting_price.toLocaleString()} base</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCourseClick(c)}
                      className="bg-golf-charcoal-850 hover:bg-golf-charcoal-800 border border-golf-charcoal-700/60 p-2 rounded-xl text-golf-gold-400"
                      title="Edit Course"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(c.id)}
                      className="bg-rose-950/20 hover:bg-rose-950/50 border border-rose-900/40 p-2 rounded-xl text-rose-400"
                      title="Purge Course"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. USER ROLES TAB */}
      {activeTab === 'users' && (
        <div className="glass-panel rounded-2xl border border-golf-green-950/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-golf-charcoal-900 border-b border-golf-charcoal-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Telephone</th>
                  <th className="p-4">System Role</th>
                  <th className="p-4 text-right">Access Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-golf-charcoal-850 text-slate-300">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-golf-charcoal-900/30">
                    <td className="p-4 font-bold text-white">{u.name}</td>
                    <td className="p-4">{u.email}</td>
                    <td className="p-4">{u.phone || 'N/A'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        u.role === 'Admin' 
                          ? 'bg-golf-gold-500 text-golf-charcoal-950'
                          : u.role === 'Operator'
                            ? 'bg-golf-green-800 text-golf-gold-300'
                            : 'bg-golf-charcoal-800 text-slate-400'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {u.role !== 'Admin' ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            onClick={() => handleChangeRole(u.id, 'Operator')}
                            className="bg-golf-green-900/40 text-golf-gold-300 hover:bg-golf-green-900/80 px-2 py-1 rounded text-[10px] font-semibold border border-golf-green-800/40"
                          >
                            Promote to Operator
                          </button>
                          <button
                            onClick={() => handleChangeRole(u.id, 'Customer')}
                            className="bg-golf-charcoal-800 text-slate-400 hover:text-white px-2 py-1 rounded text-[10px]"
                          >
                            Set Customer
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Master Administrator</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
