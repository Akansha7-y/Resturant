import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { token, user, getAuthHeaders } = useContext(AuthContext);
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Restaurant Form States
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [cuisine, setCuisine] = useState('French');
  const [location, setLocation] = useState('Downtown Manhattan');
  const [priceRange, setPriceRange] = useState('$$$');
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState('');
  const [workingHours, setWorkingHours] = useState('5:00 PM - 11:00 PM');
  
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'admin') {
      navigate('/dashboard'); // Non-admins redirect
      return;
    }
    fetchBookings();
  }, [token, user]);

  const fetchBookings = () => {
    setLoading(true);
    fetch('/api/bookings', {
      headers: getAuthHeaders()
    })
      .then(res => res.json())
      .then(data => {
        setBookings(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching admin bookings:', err);
        setLoading(false);
      });
  };

  const handleAddRestaurant = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');
    setFormSuccess(false);

    const featureArray = features.split(',').map(f => f.trim()).filter(f => f !== '');
    
    // Default menu items to avoid empty list
    const defaultMenu = [
      { name: 'House Appetizer Platter', price: 20, description: 'Chef special selection of starters.', category: 'Appetizers' },
      { name: 'Signature Main Course', price: 42, description: 'Our specialty prepared with locally sourced ingredients.', category: 'Main Courses' },
      { name: 'Classic Dessert Delight', price: 15, description: 'Sweet ending of the day.', category: 'Desserts' }
    ];

    try {
      const response = await fetch('/api/restaurants', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name,
          image: image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
          cuisine,
          location,
          priceRange,
          description,
          features: featureArray,
          workingHours,
          menu: defaultMenu
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add restaurant');
      }

      setFormSuccess(true);
      setFormSubmitting(false);
      // Reset form
      setName('');
      setImage('');
      setFeatures('');
      setDescription('');
    } catch (error) {
      setFormSubmitting(false);
      setFormError(error.message);
    }
  };

  // Math Statistics
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled');
  const revenueTotal = confirmedBookings.reduce((sum, b) => sum + (b.paymentDetails?.amount || 0), 0);

  return (
    <div className="container" style={styles.container}>
      <h1 style={styles.pageTitle}>Executive Admin Dashboard</h1>
      <p style={styles.pageSubtitle}>System-wide reservation audits, metrics, and catalog listings</p>

      {/* Analytics Summary */}
      <section style={styles.statsGrid}>
        <div style={styles.statCard} className="glass-panel-gold">
          <span style={styles.statValue}>${revenueTotal}</span>
          <span style={styles.statLabel}>Mock Revenue Collected</span>
        </div>
        <div style={styles.statCard} className="glass-panel">
          <span style={styles.statValue}>{bookings.length}</span>
          <span style={styles.statLabel}>Total Reservations Logged</span>
        </div>
        <div style={styles.statCard} className="glass-panel">
          <span style={styles.statValue}>{confirmedBookings.length}</span>
          <span style={styles.statLabel}>Active Confirmations</span>
        </div>
        <div style={styles.statCard} className="glass-panel">
          <span style={{ ...styles.statValue, color: 'hsl(var(--error))' }}>{cancelledBookings.length}</span>
          <span style={styles.statLabel}>Cancelled Tables</span>
        </div>
      </section>

      <div className="admin-layout">
        {/* Reservation Audit Table */}
        <section style={styles.leftCol} className="glass-panel">
          <h2 style={styles.sectionTitle}>System Reservation Logs</h2>
          {loading ? (
            <p>Fetching server booking sheets...</p>
          ) : bookings.length === 0 ? (
            <p style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>No reservations exist on the system.</p>
          ) : (
            <div style={styles.tableWrapper} className="table-scroll">
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Booking ID</th>
                    <th style={styles.th}>Customer</th>
                    <th style={styles.th}>Restaurant</th>
                    <th style={styles.th}>Date & Time</th>
                    <th style={styles.th}>Guests</th>
                    <th style={styles.th}>Payment Status</th>
                    <th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id} style={styles.tableRow}>
                      <td style={styles.td}><code>{b._id.substring(0, 8)}...</code></td>
                      <td style={styles.td}>
                        <strong>{b.userName}</strong>
                        <div style={styles.smallEmail}>{b.userEmail}</div>
                      </td>
                      <td style={styles.td}>{b.restaurantName}</td>
                      <td style={styles.td}>{b.date} @ {b.time}</td>
                      <td style={styles.td}>{b.guests}</td>
                      <td style={styles.td}>
                        <span style={{
                          color: b.paymentDetails?.status === 'paid' ? 'hsl(var(--success))' : 'hsl(var(--warning))',
                          fontWeight: '600',
                          fontSize: '0.8rem'
                        }}>
                          ${b.paymentDetails?.amount} ({b.paymentDetails?.status})
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          color: b.status === 'confirmed' ? 'hsl(var(--success))' : b.status === 'cancelled' ? 'hsl(var(--error))' : 'hsl(var(--warning))',
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          textTransform: 'uppercase'
                        }}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Add Restaurant Panel */}
        <section style={styles.rightCol} className="glass-panel-gold">
          <h2 style={styles.sectionTitle}>Add New Venue</h2>
          
          <form onSubmit={handleAddRestaurant} style={styles.form}>
            {formError && <div style={styles.errorBanner}>{formError}</div>}
            {formSuccess && <div style={styles.successBanner}>✓ Restaurant registered successfully!</div>}
            
            <div className="form-group">
              <label className="form-label">Establishment Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                placeholder="e.g. Royal Palace"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cover Image URL</label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="form-input"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cuisine Category</label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="form-input"
              >
                <option value="French">French</option>
                <option value="Japanese">Japanese</option>
                <option value="Italian">Italian</option>
                <option value="Indian">Indian</option>
                <option value="Mexican">Mexican</option>
                <option value="Cafe">Cafe</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Neighborhood / Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="form-input"
              >
                <option value="Downtown Manhattan">Downtown Manhattan</option>
                <option value="Uptown District">Uptown District</option>
                <option value="Brooklyn Heights">Brooklyn Heights</option>
                <option value="Theatre District">Theatre District</option>
                <option value="Soho">Soho</option>
                <option value="Greenwich Village">Greenwich Village</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Price Category</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="form-input"
              >
                <option value="$">$ (Budget)</option>
                <option value="$$">$$ (Moderate)</option>
                <option value="$$$">$$$ (Fine Dining)</option>
                <option value="$$$$">$$$$ (Ultra Luxury)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Key Features (comma-separated)</label>
              <input
                type="text"
                value={features}
                onChange={(e) => setFeatures(e.target.value)}
                className="form-input"
                placeholder="Valet Parking, Outdoor Seating, Wine Bar"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Operating Hours</label>
              <input
                type="text"
                value={workingHours}
                onChange={(e) => setWorkingHours(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description Summary</label>
              <textarea
                rows="3"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
                placeholder="Brief summary of atmosphere, chefs, seating style..."
                style={{ resize: 'none' }}
                required
              ></textarea>
            </div>

            <button type="submit" disabled={formSubmitting} className="btn btn-primary" style={{ width: '100%' }}>
              {formSubmitting ? 'Registering Venue...' : 'Register Restaurant'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '40px',
    paddingBottom: '80px',
  },
  pageTitle: {
    fontSize: '2.5rem',
    marginBottom: '8px',
  },
  pageSubtitle: {
    color: 'hsl(var(--text-muted))',
    fontSize: '1.05rem',
    marginBottom: '40px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
  },
  statCard: {
    padding: '24px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid hsl(var(--border-color))',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  statValue: {
    fontSize: '2.2rem',
    fontWeight: '700',
    color: 'hsl(var(--primary))',
  },
  statLabel: {
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    color: 'hsl(var(--text-muted))',
    letterSpacing: '0.5px',
  },
  mainLayout: {},
  leftCol: {
    padding: '30px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid hsl(var(--border-color))',
  },
  rightCol: {
    padding: '30px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(212, 175, 55, 0.25)',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    marginBottom: '24px',
    fontFamily: "'Playfair Display', serif",
  },
  tableWrapper: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
  },
  tableHeaderRow: {
    borderBottom: '2px solid hsl(var(--border-color))',
  },
  th: {
    padding: '12px 16px',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    color: 'hsl(var(--text-muted))',
    letterSpacing: '0.5px',
  },
  tableRow: {
    borderBottom: '1px solid hsl(var(--border-color))',
    ':hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
    }
  },
  td: {
    padding: '16px',
    fontSize: '0.9rem',
  },
  smallEmail: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))',
    fontWeight: '400',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  errorBanner: {
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: 'hsl(var(--error))',
    fontSize: '0.85rem',
    marginBottom: '16px',
  },
  successBanner: {
    padding: '12px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    color: 'hsl(var(--success))',
    fontSize: '0.85rem',
    marginBottom: '16px',
  }
};
