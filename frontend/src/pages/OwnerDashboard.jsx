import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'restaurant', label: 'Restaurant', icon: '🏪' },
  { id: 'gallery', label: 'Gallery', icon: '📷' },
  { id: 'menu', label: 'Menu', icon: '🍽️' },
  { id: 'tables', label: 'Tables', icon: '🪑' },
  { id: 'reservations', label: 'Reservations', icon: '📅' },
  { id: 'offers', label: 'Offers', icon: '🏷️' },
  { id: 'reviews', label: 'Reviews', icon: '⭐' },
  { id: 'staff', label: 'Staff', icon: '👥' },
];

const STATUS_COLORS = {
  confirmed: 'hsl(var(--success))',
  pending_approval: 'hsl(var(--warning))',
  pending_payment: 'hsl(var(--warning))',
  rejected: 'hsl(var(--error))',
  cancelled: 'hsl(var(--error))',
};

export default function OwnerDashboard() {
  const { token, user, getAuthHeaders } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [restaurant, setRestaurant] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Restaurant registration form
  const [regForm, setRegForm] = useState({
    name: '', image: '', cuisine: 'French', location: 'Downtown Manhattan',
    priceRange: '$$$', description: '', features: '', workingHours: '5:00 PM - 11:00 PM'
  });

  // Menu form
  const [menuForm, setMenuForm] = useState({ name: '', price: '', description: '', category: 'Main' });

  // Table form
  const [tableForm, setTableForm] = useState({ name: '', capacity: 4, seatingArea: 'Standard' });

  // Offer form
  const [offerForm, setOfferForm] = useState({ title: '', description: '', discountPercent: 10, validUntil: '' });

  // Staff form
  const [staffForm, setStaffForm] = useState({ name: '', role: 'Server', email: '', phone: '' });

  // Review replies
  const [replyTexts, setReplyTexts] = useState({});

  // Gallery upload
  const [galleryUrl, setGalleryUrl] = useState('');

  const showMsg = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const apiFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, { ...options, headers: getAuthHeaders() });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
  }, [getAuthHeaders]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const rest = await apiFetch('/api/owner/restaurant');
      setRestaurant(rest);
      if (rest) {
        const [bks, stats] = await Promise.all([
          apiFetch('/api/owner/bookings'),
          apiFetch('/api/owner/analytics'),
        ]);
        setBookings(bks);
        setAnalytics(stats);
      }
    } catch {
      setRestaurant(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    if (!token || user?.role !== 'owner') {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [token, user, navigate, loadData]);

  const handleRegisterRestaurant = async (e) => {
    e.preventDefault();
    try {
      const featureArray = regForm.features.split(',').map(f => f.trim()).filter(Boolean);
      const rest = await apiFetch('/api/owner/restaurant', {
        method: 'POST',
        body: JSON.stringify({ ...regForm, features: featureArray }),
      });
      setRestaurant(rest);
      showMsg('success', 'Restaurant registered successfully!');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleUpdateRestaurant = async (e) => {
    e.preventDefault();
    try {
      const featureArray = regForm.features.split(',').map(f => f.trim()).filter(Boolean);
      const rest = await apiFetch('/api/owner/restaurant', {
        method: 'PUT',
        body: JSON.stringify({ ...regForm, features: featureArray }),
      });
      setRestaurant(rest);
      showMsg('success', 'Restaurant profile updated!');
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleGalleryUpload = async (e) => {
    e.preventDefault();
    if (!galleryUrl.trim()) return;
    try {
      const rest = await apiFetch('/api/owner/restaurant/gallery', {
        method: 'POST',
        body: JSON.stringify({ photo: galleryUrl }),
      });
      setRestaurant(rest);
      setGalleryUrl('');
      showMsg('success', 'Photo added to gallery!');
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleImageFile = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    try {
      const rest = await apiFetch('/api/owner/menu', {
        method: 'POST',
        body: JSON.stringify(menuForm),
      });
      setRestaurant(rest);
      setMenuForm({ name: '', price: '', description: '', category: 'Main' });
      showMsg('success', 'Menu item added!');
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    try {
      const rest = await apiFetch(`/api/owner/menu/${itemId}`, { method: 'DELETE' });
      setRestaurant(rest);
      showMsg('success', 'Menu item removed.');
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    try {
      const rest = await apiFetch('/api/owner/tables', {
        method: 'POST',
        body: JSON.stringify(tableForm),
      });
      setRestaurant(rest);
      setTableForm({ name: '', capacity: 4, seatingArea: 'Standard' });
      showMsg('success', 'Table added!');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleToggleTable = async (tableId, available) => {
    try {
      const rest = await apiFetch(`/api/owner/tables/${tableId}/availability`, {
        method: 'PUT',
        body: JSON.stringify({ available }),
      });
      setRestaurant(rest);
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleDeleteTable = async (tableId) => {
    try {
      const rest = await apiFetch(`/api/owner/tables/${tableId}`, { method: 'DELETE' });
      setRestaurant(rest);
      showMsg('success', 'Table removed.');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleAcceptBooking = async (bookingId) => {
    try {
      await apiFetch(`/api/owner/bookings/${bookingId}/accept`, { method: 'PUT', body: '{}' });
      showMsg('success', 'Booking accepted!');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleRejectBooking = async (bookingId) => {
    const note = prompt('Reason for rejection (optional):');
    try {
      await apiFetch(`/api/owner/bookings/${bookingId}/reject`, {
        method: 'PUT',
        body: JSON.stringify({ ownerNote: note || '' }),
      });
      showMsg('success', 'Booking rejected.');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleAddOffer = async (e) => {
    e.preventDefault();
    try {
      const rest = await apiFetch('/api/owner/offers', {
        method: 'POST',
        body: JSON.stringify(offerForm),
      });
      setRestaurant(rest);
      setOfferForm({ title: '', description: '', discountPercent: 10, validUntil: '' });
      showMsg('success', 'Offer created!');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleToggleOffer = async (offerId, active) => {
    try {
      const rest = await apiFetch(`/api/owner/offers/${offerId}`, {
        method: 'PUT',
        body: JSON.stringify({ active }),
      });
      setRestaurant(rest);
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleDeleteOffer = async (offerId) => {
    try {
      const rest = await apiFetch(`/api/owner/offers/${offerId}`, { method: 'DELETE' });
      setRestaurant(rest);
      showMsg('success', 'Offer deleted.');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const rest = await apiFetch('/api/owner/staff', {
        method: 'POST',
        body: JSON.stringify(staffForm),
      });
      setRestaurant(rest);
      setStaffForm({ name: '', role: 'Server', email: '', phone: '' });
      showMsg('success', 'Staff member added!');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleToggleStaff = async (staffId, active) => {
    try {
      const rest = await apiFetch(`/api/owner/staff/${staffId}`, {
        method: 'PUT',
        body: JSON.stringify({ active }),
      });
      setRestaurant(rest);
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleDeleteStaff = async (staffId) => {
    try {
      const rest = await apiFetch(`/api/owner/staff/${staffId}`, { method: 'DELETE' });
      setRestaurant(rest);
      showMsg('success', 'Staff member removed.');
      loadData();
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  const handleReplyReview = async (reviewId) => {
    const reply = replyTexts[reviewId];
    if (!reply?.trim()) return;
    try {
      const rest = await apiFetch(`/api/owner/reviews/${reviewId}/reply`, {
        method: 'PUT',
        body: JSON.stringify({ reply }),
      });
      setRestaurant(rest);
      setReplyTexts(prev => ({ ...prev, [reviewId]: '' }));
      showMsg('success', 'Reply posted!');
    } catch (err) {
      showMsg('error', err.message);
    }
  };

  useEffect(() => {
    if (restaurant) {
      setRegForm({
        name: restaurant.name || '',
        image: restaurant.image || '',
        cuisine: restaurant.cuisine || 'French',
        location: restaurant.location || '',
        priceRange: restaurant.priceRange || '$$$',
        description: restaurant.description || '',
        features: (restaurant.features || []).join(', '),
        workingHours: restaurant.workingHours || '',
      });
    }
  }, [restaurant?._id]);

  if (loading) {
    return (
      <div className="container" style={styles.container}>
        <p style={{ color: 'hsl(var(--text-muted))', textAlign: 'center', paddingTop: '80px' }}>
          Loading your restaurant dashboard...
        </p>
      </div>
    );
  }

  // Registration screen if no restaurant yet
  if (!restaurant) {
    return (
      <div className="container" style={styles.container}>
        <h1 style={styles.pageTitle}>Restaurant Owner Portal</h1>
        <p style={styles.pageSubtitle}>Register your restaurant to get started</p>
        {message.text && (
          <div style={message.type === 'error' ? styles.errorBanner : styles.successBanner}>{message.text}</div>
        )}
        <section className="glass-panel-gold" style={styles.registerCard}>
          <h2 style={styles.sectionTitle}>Register Your Restaurant</h2>
          <form onSubmit={handleRegisterRestaurant} style={styles.form}>
            <div className="form-group">
              <label className="form-label">Restaurant Name *</label>
              <input className="form-input" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label className="form-label">Cover Image URL</label>
              <input className="form-input" value={regForm.image} onChange={e => setRegForm({ ...regForm, image: e.target.value })} placeholder="https://..." />
              <input type="file" accept="image/*" onChange={e => handleImageFile(e, url => setRegForm({ ...regForm, image: url }))} style={{ marginTop: '8px', fontSize: '0.8rem' }} />
            </div>
            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Cuisine *</label>
                <select className="form-input" value={regForm.cuisine} onChange={e => setRegForm({ ...regForm, cuisine: e.target.value })}>
                  {['French', 'Japanese', 'Italian', 'Indian', 'Mexican', 'Cafe', 'American', 'Thai'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Location *</label>
                <select className="form-input" value={regForm.location} onChange={e => setRegForm({ ...regForm, location: e.target.value })}>
                  {['Downtown Manhattan', 'Uptown District', 'Brooklyn Heights', 'Theatre District', 'Soho', 'Greenwich Village'].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Price Range</label>
              <select className="form-input" value={regForm.priceRange} onChange={e => setRegForm({ ...regForm, priceRange: e.target.value })}>
                {['$', '$$', '$$$', '$$$$'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea className="form-input" rows={3} value={regForm.description} onChange={e => setRegForm({ ...regForm, description: e.target.value })} required style={{ resize: 'none' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Features (comma-separated)</label>
              <input className="form-input" value={regForm.features} onChange={e => setRegForm({ ...regForm, features: e.target.value })} placeholder="Valet, Wine Bar, Outdoor Seating" />
            </div>
            <div className="form-group">
              <label className="form-label">Working Hours</label>
              <input className="form-input" value={regForm.workingHours} onChange={e => setRegForm({ ...regForm, workingHours: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Register Restaurant</button>
          </form>
        </section>
      </div>
    );
  }

  const pendingBookings = bookings.filter(b => ['pending_approval', 'pending_payment'].includes(b.status));

  return (
    <div className="container" style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>{restaurant.name}</h1>
          <p style={styles.pageSubtitle}>Restaurant Owner Dashboard &middot; {restaurant.cuisine} &middot; {restaurant.location}</p>
        </div>
        {pendingBookings.length > 0 && (
          <span style={styles.badge}>{pendingBookings.length} pending reservation{pendingBookings.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {message.text && (
        <div style={message.type === 'error' ? styles.errorBanner : styles.successBanner}>{message.text}</div>
      )}

      <div className="owner-layout">
        {/* Sidebar tabs */}
        <nav style={styles.sidebar} className="glass-panel owner-sidebar">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.tabBtn,
                ...(activeTab === tab.id ? styles.tabBtnActive : {}),
              }}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <div style={styles.content}>

          {/* OVERVIEW */}
          {activeTab === 'overview' && analytics && (
            <section>
              <h2 style={styles.sectionTitle}>Analytics Overview</h2>
              <div style={styles.statsGrid}>
                <div style={styles.statCard} className="glass-panel-gold">
                  <span style={styles.statValue}>${analytics.revenue}</span>
                  <span style={styles.statLabel}>Total Revenue</span>
                </div>
                <div style={styles.statCard} className="glass-panel">
                  <span style={styles.statValue}>{analytics.confirmedBookings}</span>
                  <span style={styles.statLabel}>Confirmed Bookings</span>
                </div>
                <div style={styles.statCard} className="glass-panel">
                  <span style={styles.statValue}>{analytics.pendingBookings}</span>
                  <span style={styles.statLabel}>Pending Approval</span>
                </div>
                <div style={styles.statCard} className="glass-panel">
                  <span style={{ ...styles.statValue, color: 'hsl(var(--error))' }}>{analytics.rejectedBookings}</span>
                  <span style={styles.statLabel}>Rejected</span>
                </div>
                <div style={styles.statCard} className="glass-panel">
                  <span style={styles.statValue}>{analytics.totalGuests}</span>
                  <span style={styles.statLabel}>Total Guests Served</span>
                </div>
                <div style={styles.statCard} className="glass-panel">
                  <span style={styles.statValue}>{analytics.avgRating} ★</span>
                  <span style={styles.statLabel}>{analytics.reviewCount} Reviews</span>
                </div>
                <div style={styles.statCard} className="glass-panel">
                  <span style={styles.statValue}>{analytics.availableTables}/{analytics.totalTables}</span>
                  <span style={styles.statLabel}>Tables Available</span>
                </div>
                <div style={styles.statCard} className="glass-panel">
                  <span style={styles.statValue}>{analytics.occupancyRate}%</span>
                  <span style={styles.statLabel}>Occupancy Rate</span>
                </div>
              </div>
            </section>
          )}

          {/* RESTAURANT PROFILE */}
          {activeTab === 'restaurant' && (
            <section className="glass-panel" style={styles.panel}>
              <h2 style={styles.sectionTitle}>Restaurant Profile</h2>
              <form onSubmit={handleUpdateRestaurant} style={styles.form}>
                <div className="form-group">
                  <label className="form-label">Restaurant Name</label>
                  <input className="form-input" value={regForm.name} onChange={e => setRegForm({ ...regForm, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cover Image</label>
                  <input className="form-input" value={regForm.image} onChange={e => setRegForm({ ...regForm, image: e.target.value })} />
                  <input type="file" accept="image/*" onChange={e => handleImageFile(e, url => setRegForm({ ...regForm, image: url }))} style={{ marginTop: '8px', fontSize: '0.8rem' }} />
                  {regForm.image && <img src={regForm.image} alt="cover" style={styles.previewImg} />}
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Cuisine</label>
                    <select className="form-input" value={regForm.cuisine} onChange={e => setRegForm({ ...regForm, cuisine: e.target.value })}>
                      {['French', 'Japanese', 'Italian', 'Indian', 'Mexican', 'Cafe', 'American', 'Thai'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Location</label>
                    <select className="form-input" value={regForm.location} onChange={e => setRegForm({ ...regForm, location: e.target.value })}>
                      {['Downtown Manhattan', 'Uptown District', 'Brooklyn Heights', 'Theatre District', 'Soho', 'Greenwich Village'].map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={regForm.description} onChange={e => setRegForm({ ...regForm, description: e.target.value })} style={{ resize: 'none' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Features</label>
                  <input className="form-input" value={regForm.features} onChange={e => setRegForm({ ...regForm, features: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Working Hours</label>
                  <input className="form-input" value={regForm.workingHours} onChange={e => setRegForm({ ...regForm, workingHours: e.target.value })} />
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </section>
          )}

          {/* GALLERY */}
          {activeTab === 'gallery' && (
            <section className="glass-panel" style={styles.panel}>
              <h2 style={styles.sectionTitle}>Restaurant Gallery</h2>
              <form onSubmit={handleGalleryUpload} style={{ ...styles.form, marginBottom: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Add Photo (URL or upload)</label>
                  <input className="form-input" value={galleryUrl} onChange={e => setGalleryUrl(e.target.value)} placeholder="https://..." />
                  <input type="file" accept="image/*" onChange={e => handleImageFile(e, setGalleryUrl)} style={{ marginTop: '8px', fontSize: '0.8rem' }} />
                </div>
                <button type="submit" className="btn btn-primary">Upload Photo</button>
              </form>
              <div style={styles.galleryGrid}>
                {(restaurant.gallery || []).length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))' }}>No photos yet. Upload your first image above.</p>
                ) : (
                  restaurant.gallery.map((photo, i) => (
                    <img key={i} src={photo} alt={`Gallery ${i + 1}`} style={styles.galleryImg} />
                  ))
                )}
              </div>
            </section>
          )}

          {/* MENU */}
          {activeTab === 'menu' && (
            <section>
              <div className="glass-panel" style={styles.panel}>
                <h2 style={styles.sectionTitle}>Add Menu Item</h2>
                <form onSubmit={handleAddMenuItem} style={styles.form}>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 2 }}>
                      <label className="form-label">Item Name</label>
                      <input className="form-input" value={menuForm.name} onChange={e => setMenuForm({ ...menuForm, name: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Price ($)</label>
                      <input type="number" className="form-input" value={menuForm.price} onChange={e => setMenuForm({ ...menuForm, price: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-input" value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}>
                      {['Appetizers', 'Main', 'Desserts', 'Drinks', 'Specials'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input className="form-input" value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })} />
                  </div>
                  <button type="submit" className="btn btn-primary">Add Item</button>
                </form>
              </div>
              <div className="glass-panel" style={{ ...styles.panel, marginTop: '20px' }}>
                <h2 style={styles.sectionTitle}>Current Menu ({(restaurant.menu || []).length} items)</h2>
                {(restaurant.menu || []).length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))' }}>No menu items yet.</p>
                ) : (
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Category</th>
                          <th style={styles.th}>Price</th>
                          <th style={styles.th}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restaurant.menu.map(item => (
                          <tr key={item._id} style={styles.tableRow}>
                            <td style={styles.td}><strong>{item.name}</strong><div style={styles.smallText}>{item.description}</div></td>
                            <td style={styles.td}>{item.category}</td>
                            <td style={styles.td}>${item.price}</td>
                            <td style={styles.td}>
                              <button onClick={() => handleDeleteMenuItem(item._id)} className="btn btn-gold-outline" style={styles.smallBtn}>Remove</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* TABLES */}
          {activeTab === 'tables' && (
            <section>
              <div className="glass-panel" style={styles.panel}>
                <h2 style={styles.sectionTitle}>Add Table</h2>
                <form onSubmit={handleAddTable} style={styles.form}>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Table Name</label>
                      <input className="form-input" value={tableForm.name} onChange={e => setTableForm({ ...tableForm, name: e.target.value })} placeholder="Table 11" required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Capacity</label>
                      <input type="number" className="form-input" value={tableForm.capacity} onChange={e => setTableForm({ ...tableForm, capacity: e.target.value })} min={1} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Seating Area</label>
                      <select className="form-input" value={tableForm.seatingArea} onChange={e => setTableForm({ ...tableForm, seatingArea: e.target.value })}>
                        {['Standard', 'VIP', 'Outdoor', 'Bar', 'Private'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Add Table</button>
                </form>
              </div>
              <div className="glass-panel" style={{ ...styles.panel, marginTop: '20px' }}>
                <h2 style={styles.sectionTitle}>Manage Tables ({(restaurant.tables || []).length})</h2>
                <div style={styles.tableGrid}>
                  {(restaurant.tables || []).map(table => (
                    <div key={table._id} style={{
                      ...styles.tableCard,
                      borderColor: table.available ? 'hsl(var(--success))' : 'hsl(var(--error))',
                    }}>
                      <div style={styles.tableCardHeader}>
                        <strong>{table.name}</strong>
                        <span style={{
                          fontSize: '0.75rem',
                          color: table.available ? 'hsl(var(--success))' : 'hsl(var(--error))',
                          fontWeight: '600',
                        }}>
                          {table.available ? 'AVAILABLE' : 'OCCUPIED'}
                        </span>
                      </div>
                      <p style={styles.smallText}>Capacity: {table.capacity} &middot; {table.seatingArea}</p>
                      <div style={styles.tableCardActions}>
                        <button
                          onClick={() => handleToggleTable(table._id, !table.available)}
                          className="btn btn-gold-outline"
                          style={styles.smallBtn}
                        >
                          Mark {table.available ? 'Occupied' : 'Available'}
                        </button>
                        <button onClick={() => handleDeleteTable(table._id)} className="btn btn-gold-outline" style={{ ...styles.smallBtn, color: 'hsl(var(--error))' }}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* RESERVATIONS */}
          {activeTab === 'reservations' && (
            <section className="glass-panel" style={styles.panel}>
              <h2 style={styles.sectionTitle}>Reservations ({bookings.length})</h2>
              {bookings.length === 0 ? (
                <p style={{ color: 'hsl(var(--text-muted))' }}>No reservations yet.</p>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>Guest</th>
                        <th style={styles.th}>Date & Time</th>
                        <th style={styles.th}>Guests</th>
                        <th style={styles.th}>Payment</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map(b => (
                        <tr key={b._id} style={styles.tableRow}>
                          <td style={styles.td}>
                            <strong>{b.userName}</strong>
                            <div style={styles.smallText}>{b.userEmail}</div>
                            {b.specialRequests && <div style={styles.smallText}>Note: {b.specialRequests}</div>}
                          </td>
                          <td style={styles.td}>{b.date} @ {b.time}</td>
                          <td style={styles.td}>{b.guests}</td>
                          <td style={styles.td}>
                            <span style={{ color: b.paymentDetails?.status === 'paid' ? 'hsl(var(--success))' : 'hsl(var(--warning))' }}>
                              ${b.paymentDetails?.amount} ({b.paymentDetails?.status})
                            </span>
                          </td>
                          <td style={styles.td}>
                            <span style={{ color: STATUS_COLORS[b.status] || 'inherit', fontWeight: '600', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                              {b.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={styles.td}>
                            {['pending_approval', 'pending_payment'].includes(b.status) && (
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleAcceptBooking(b._id)} className="btn btn-primary" style={styles.smallBtn}>Accept</button>
                                <button onClick={() => handleRejectBooking(b._id)} className="btn btn-gold-outline" style={{ ...styles.smallBtn, color: 'hsl(var(--error))' }}>Reject</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* OFFERS */}
          {activeTab === 'offers' && (
            <section>
              <div className="glass-panel" style={styles.panel}>
                <h2 style={styles.sectionTitle}>Create Offer</h2>
                <form onSubmit={handleAddOffer} style={styles.form}>
                  <div className="form-group">
                    <label className="form-label">Offer Title</label>
                    <input className="form-input" value={offerForm.title} onChange={e => setOfferForm({ ...offerForm, title: e.target.value })} placeholder="Happy Hour 20% Off" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <input className="form-input" value={offerForm.description} onChange={e => setOfferForm({ ...offerForm, description: e.target.value })} />
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Discount %</label>
                      <input type="number" className="form-input" value={offerForm.discountPercent} onChange={e => setOfferForm({ ...offerForm, discountPercent: e.target.value })} min={1} max={100} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Valid Until</label>
                      <input type="date" className="form-input" value={offerForm.validUntil} onChange={e => setOfferForm({ ...offerForm, validUntil: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Create Offer</button>
                </form>
              </div>
              <div className="glass-panel" style={{ ...styles.panel, marginTop: '20px' }}>
                <h2 style={styles.sectionTitle}>Active Offers</h2>
                {(restaurant.offers || []).length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))' }}>No offers created yet.</p>
                ) : (
                  <div style={styles.offerGrid}>
                    {restaurant.offers.map(offer => (
                      <div key={offer._id} style={styles.offerCard} className="glass-panel-gold">
                        <div style={styles.offerHeader}>
                          <strong>{offer.title}</strong>
                          <span style={styles.discountBadge}>{offer.discountPercent}% OFF</span>
                        </div>
                        <p style={styles.smallText}>{offer.description}</p>
                        {offer.validUntil && <p style={styles.smallText}>Valid until: {offer.validUntil}</p>}
                        <div style={styles.tableCardActions}>
                          <button onClick={() => handleToggleOffer(offer._id, !offer.active)} className="btn btn-gold-outline" style={styles.smallBtn}>
                            {offer.active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => handleDeleteOffer(offer._id)} className="btn btn-gold-outline" style={{ ...styles.smallBtn, color: 'hsl(var(--error))' }}>Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* REVIEWS */}
          {activeTab === 'reviews' && (
            <section className="glass-panel" style={styles.panel}>
              <h2 style={styles.sectionTitle}>Customer Reviews ({(restaurant.reviews || []).length})</h2>
              {(restaurant.reviews || []).length === 0 ? (
                <p style={{ color: 'hsl(var(--text-muted))' }}>No reviews yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {restaurant.reviews.map((review, idx) => (
                    <div key={review._id || idx} style={styles.reviewCard}>
                      <div style={styles.reviewHeader}>
                        <strong>{review.userName}</strong>
                        <span style={{ color: 'hsl(var(--primary))' }}>{'★'.repeat(review.rating)}</span>
                        <span style={styles.smallText}>{new Date(review.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p style={{ margin: '8px 0' }}>{review.comment}</p>
                      {review.ownerReply ? (
                        <div style={styles.ownerReply}>
                          <strong style={{ color: 'hsl(var(--text-gold))' }}>Your Reply:</strong> {review.ownerReply}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                          <input
                            className="form-input"
                            style={{ flex: 1, fontSize: '0.85rem' }}
                            placeholder="Write a reply..."
                            value={replyTexts[review._id || idx] || ''}
                            onChange={e => setReplyTexts(prev => ({ ...prev, [review._id || idx]: e.target.value }))}
                          />
                          <button onClick={() => handleReplyReview(review._id || String(idx))} className="btn btn-primary" style={styles.smallBtn}>Reply</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* STAFF */}
          {activeTab === 'staff' && (
            <section>
              <div className="glass-panel" style={styles.panel}>
                <h2 style={styles.sectionTitle}>Add Staff Member</h2>
                <form onSubmit={handleAddStaff} style={styles.form}>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Name</label>
                      <input className="form-input" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} required />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Role</label>
                      <select className="form-input" value={staffForm.role} onChange={e => setStaffForm({ ...staffForm, role: e.target.value })}>
                        {['Server', 'Host', 'Chef', 'Sous Chef', 'Manager', 'Bartender', 'Sommelier'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Email</label>
                      <input type="email" className="form-input" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Phone</label>
                      <input className="form-input" value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary">Add Staff</button>
                </form>
              </div>
              <div className="glass-panel" style={{ ...styles.panel, marginTop: '20px' }}>
                <h2 style={styles.sectionTitle}>Staff Roster ({(restaurant.staff || []).length})</h2>
                {(restaurant.staff || []).length === 0 ? (
                  <p style={{ color: 'hsl(var(--text-muted))' }}>No staff members added yet.</p>
                ) : (
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr style={styles.tableHeaderRow}>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Role</th>
                          <th style={styles.th}>Contact</th>
                          <th style={styles.th}>Status</th>
                          <th style={styles.th}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {restaurant.staff.map(member => (
                          <tr key={member._id} style={styles.tableRow}>
                            <td style={styles.td}><strong>{member.name}</strong></td>
                            <td style={styles.td}>{member.role}</td>
                            <td style={styles.td}>
                              <div style={styles.smallText}>{member.email}</div>
                              <div style={styles.smallText}>{member.phone}</div>
                            </td>
                            <td style={styles.td}>
                              <span style={{ color: member.active ? 'hsl(var(--success))' : 'hsl(var(--error))', fontWeight: '600', fontSize: '0.8rem' }}>
                                {member.active ? 'ACTIVE' : 'INACTIVE'}
                              </span>
                            </td>
                            <td style={styles.td}>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button onClick={() => handleToggleStaff(member._id, !member.active)} className="btn btn-gold-outline" style={styles.smallBtn}>
                                  {member.active ? 'Deactivate' : 'Activate'}
                                </button>
                                <button onClick={() => handleDeleteStaff(member._id)} className="btn btn-gold-outline" style={{ ...styles.smallBtn, color: 'hsl(var(--error))' }}>Remove</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { paddingTop: '40px', paddingBottom: '80px' },
  pageTitle: { fontSize: '2.2rem', marginBottom: '6px' },
  pageSubtitle: { color: 'hsl(var(--text-muted))', fontSize: '1rem', marginBottom: '24px' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  badge: {
    background: 'hsl(var(--warning))',
    color: '#000',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: '700',
  },
  layout: {},
  sidebar: { padding: '16px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '90px' },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    background: 'none', border: 'none', color: 'hsl(var(--text-muted))',
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: '500', textAlign: 'left',
    transition: 'var(--transition-fast)',
  },
  tabBtnActive: {
    background: 'rgba(212, 175, 55, 0.12)',
    color: 'hsl(var(--text-gold))',
    fontWeight: '600',
  },
  content: { minWidth: 0 },
  panel: { padding: '28px', borderRadius: 'var(--radius-lg)', border: '1px solid hsl(var(--border-color))' },
  registerCard: { padding: '32px', borderRadius: 'var(--radius-lg)', maxWidth: '600px' },
  sectionTitle: { fontSize: '1.4rem', marginBottom: '20px', fontFamily: "'Playfair Display', serif" },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' },
  statCard: { padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border-color))', display: 'flex', flexDirection: 'column', gap: '4px' },
  statValue: { fontSize: '1.8rem', fontWeight: '700', color: 'hsl(var(--primary))' },
  statLabel: { fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', letterSpacing: '0.5px' },
  form: { display: 'flex', flexDirection: 'column' },
  formRow: {},
  errorBanner: { padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'hsl(var(--error))', fontSize: '0.85rem', marginBottom: '16px' },
  successBanner: { padding: '12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'hsl(var(--success))', fontSize: '0.85rem', marginBottom: '16px' },
  previewImg: { marginTop: '10px', maxWidth: '200px', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))' },
  galleryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' },
  galleryImg: { width: '100%', height: '140px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid hsl(var(--border-color))' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
  tableHeaderRow: { borderBottom: '2px solid hsl(var(--border-color))' },
  th: { padding: '10px 14px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'hsl(var(--text-muted))', letterSpacing: '0.5px' },
  tableRow: { borderBottom: '1px solid hsl(var(--border-color))' },
  td: { padding: '14px', fontSize: '0.9rem' },
  smallText: { fontSize: '0.75rem', color: 'hsl(var(--text-muted))' },
  smallBtn: { padding: '5px 12px', fontSize: '0.75rem' },
  tableGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' },
  tableCard: { padding: '16px', borderRadius: 'var(--radius-md)', border: '2px solid', background: 'rgba(255,255,255,0.02)' },
  tableCardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' },
  tableCardActions: { display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' },
  offerGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' },
  offerCard: { padding: '18px', borderRadius: 'var(--radius-md)' },
  offerHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  discountBadge: { background: 'hsl(var(--primary))', color: '#000', padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700' },
  reviewCard: { padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid hsl(var(--border-color))', background: 'rgba(255,255,255,0.02)' },
  reviewHeader: { display: 'flex', gap: '12px', alignItems: 'center' },
  ownerReply: { marginTop: '10px', padding: '10px', borderRadius: 'var(--radius-sm)', background: 'rgba(212,175,55,0.08)', borderLeft: '3px solid hsl(var(--primary))', fontSize: '0.9rem' },
};
