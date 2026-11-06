import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export default function RestaurantList() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [minRating, setMinRating] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const { search: searchParams } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    const searchVal = params.get('search') || '';
    const cuisineVal = params.get('cuisine') || '';
    const locationVal = params.get('location') || '';

    setSearch(searchVal);
    setCuisine(cuisineVal);
    setLocationFilter(locationVal);

    fetchRestaurants(searchVal, cuisineVal, locationVal, priceRange, minRating);
  }, [searchParams]);

  const fetchRestaurants = (s, c, l, p, r) => {
    setLoading(true);
    let query = `/api/restaurants?`;
    if (s) query += `search=${encodeURIComponent(s)}&`;
    if (c) query += `cuisine=${encodeURIComponent(c)}&`;
    if (l) query += `location=${encodeURIComponent(l)}&`;
    if (p) query += `priceRange=${encodeURIComponent(p)}&`;
    if (r) query += `minRating=${encodeURIComponent(r)}&`;

    fetch(query)
      .then(res => res.json())
      .then(data => {
        setRestaurants(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching restaurants list:', err);
        setLoading(false);
      });
  };

  const handleApplyFilters = (e) => {
    e.preventDefault();
    fetchRestaurants(search, cuisine, locationFilter, priceRange, minRating);
  };

  const handleClearFilters = () => {
    setSearch('');
    setCuisine('');
    setPriceRange('');
    setMinRating('');
    setLocationFilter('');
    navigate('/restaurants');
    fetchRestaurants('', '', '', '', '');
  };

  return (
    <div className="container" style={styles.container}>
      <h1 style={styles.pageTitle}>Explore Dining Venues</h1>
      <p style={styles.pageSubtitle}>Find and secure reservations at outstanding restaurants</p>
      
      <div className="layout-split">
        {/* Sidebar Filters */}
        <aside style={styles.sidebar} className="glass-panel filter-sidebar">
          <div style={styles.sidebarHeader}>
            <h3 style={styles.sidebarTitle}>Refine Selection</h3>
            <button onClick={handleClearFilters} style={styles.clearBtn}>Reset All</button>
          </div>
          
          <form onSubmit={handleApplyFilters} style={styles.filterForm}>
            {/* Search */}
            <div className="form-group">
              <label className="form-label">Search Keyword</label>
              <input
                type="text"
                placeholder="Name, dish, word..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
              />
            </div>

            {/* Cuisine */}
            <div className="form-group">
              <label className="form-label">Cuisine Type</label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="form-input"
                style={styles.selectInput}
              >
                <option value="">All Cuisines</option>
                <option value="French">French</option>
                <option value="Japanese">Japanese</option>
                <option value="Italian">Italian</option>
                <option value="Indian">Indian</option>
                <option value="Mexican">Mexican</option>
                <option value="Cafe">Cafe</option>
              </select>
            </div>

            {/* Location */}
            <div className="form-group">
              <label className="form-label">Location / Neighborhood</label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="form-input"
                style={styles.selectInput}
              >
                <option value="">All Locations</option>
                <option value="Downtown Manhattan">Downtown Manhattan</option>
                <option value="Uptown District">Uptown District</option>
                <option value="Brooklyn Heights">Brooklyn Heights</option>
                <option value="Theatre District">Theatre District</option>
                <option value="Soho">Soho</option>
                <option value="Greenwich Village">Greenwich Village</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="form-group">
              <label className="form-label">Price Category</label>
              <div style={styles.priceOptionGrid}>
                {['$', '$$', '$$$', '$$$$'].map((price) => (
                  <button
                    key={price}
                    type="button"
                    onClick={() => setPriceRange(priceRange === price ? '' : price)}
                    style={{
                      ...styles.priceBtn,
                      backgroundColor: priceRange === price ? 'hsl(var(--primary))' : 'hsl(var(--bg-input))',
                      color: priceRange === price ? '#080a0e' : '#fff',
                      borderColor: priceRange === price ? 'hsl(var(--primary))' : 'hsl(var(--border-color))'
                    }}
                  >
                    {price}
                  </button>
                ))}
              </div>
            </div>

            {/* Minimum Rating */}
            <div className="form-group">
              <label className="form-label">Minimum Rating</label>
              <select
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="form-input"
                style={styles.selectInput}
              >
                <option value="">Any Rating</option>
                <option value="4.7">4.7+ Exceptional</option>
                <option value="4.5">4.5+ Excellent</option>
                <option value="4.0">4.0+ Very Good</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={styles.applyBtn}>
              Apply Filters
            </button>
          </form>
        </aside>

        {/* Restaurants Main Content */}
        <main style={styles.mainContent}>
          <div style={styles.listHeader}>
            <span style={styles.resultsCount}>
              Showing <strong>{restaurants.length}</strong> available venues
            </span>
          </div>

          {loading ? (
            <div className="restaurants-grid">
              {[1, 2, 4].map((n) => (
                <div key={n} style={styles.skeletonCard} className="glass-panel">
                  <div className="skeleton" style={{ height: '200px', width: '100%' }}></div>
                  <div style={{ padding: '20px' }}>
                    <div className="skeleton" style={{ height: '24px', width: '70%', marginBottom: '12px' }}></div>
                    <div className="skeleton" style={{ height: '16px', width: '45%', marginBottom: '20px' }}></div>
                    <div className="skeleton" style={{ height: '40px', width: '100%' }}></div>
                  </div>
                </div>
              ))}
            </div>
          ) : restaurants.length === 0 ? (
            <div style={styles.emptyState} className="glass-panel">
              <div style={styles.emptyIcon}>🍽️</div>
              <h3 style={styles.emptyTitle}>No Restaurants Match Your Search</h3>
              <p style={styles.emptyText}>
                Try adjusting your cuisine type, price filter, or search keyword to see more options.
              </p>
              <button onClick={handleClearFilters} className="btn btn-gold-outline" style={{ marginTop: '20px' }}>
                View All Establishments
              </button>
            </div>
          ) : (
            <div className="restaurants-grid">
              {restaurants.map((res) => (
                <div key={res._id} className="card glass-panel" style={styles.restaurantCard}>
                  <div style={styles.cardImageWrapper}>
                    <img src={res.image} alt={res.name} style={styles.cardImage} />
                    <div style={styles.cardTag} className="badge badge-gold">
                      {res.cuisine}
                    </div>
                  </div>
                  <div style={styles.cardContent}>
                    <div style={styles.cardHeader}>
                      <h3 style={styles.cardTitle}>{res.name}</h3>
                      <div style={styles.cardRating}>
                        <span style={styles.starIcon}>★</span>
                        <span>{res.rating}</span>
                      </div>
                    </div>
                    <p style={styles.cardLocation}>📍 {res.location}</p>
                    {(res.lat != null && res.lng != null) && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${res.lat},${res.lng}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.directionsLink}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Drive with Google Maps →
                      </a>
                    )}
                    <p style={styles.cardDescription}>{res.description}</p>
                    
                    <div style={styles.featuresWrapper}>
                      {res.features.slice(0, 3).map((f, i) => (
                        <span key={i} style={styles.featurePill}>{f}</span>
                      ))}
                    </div>

                    <div style={styles.cardFooter}>
                      <span style={styles.cardPrice}>Price Level: <strong style={{ color: 'hsl(var(--primary))' }}>{res.priceRange}</strong></span>
                      <button
                        onClick={() => navigate(`/restaurants/${res._id}`)}
                        className="btn btn-primary"
                        style={styles.cardButton}
                      >
                        Book Table
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
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
    fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
    marginBottom: '8px',
  },
  pageSubtitle: {
    color: 'hsl(var(--text-muted))',
    fontSize: '1.05rem',
    marginBottom: '40px',
  },
  layout: {},
  sidebar: {
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid hsl(var(--border-color))',
    position: 'sticky',
    top: '100px',
  },
  sidebarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '12px',
  },
  sidebarTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    fontFamily: "'Outfit', sans-serif",
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--primary))',
    fontSize: '0.8rem',
    fontWeight: '500',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    transition: 'var(--transition-fast)',
    ':hover': {
      color: '#fff',
    }
  },
  filterForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  selectInput: {
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='white' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    paddingRight: '40px',
  },
  priceOptionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(56px, 1fr))',
    gap: '8px',
  },
  priceBtn: {
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 0',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  applyBtn: {
    marginTop: '10px',
    width: '100%',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  listHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  resultsCount: {
    fontSize: '0.95rem',
    color: 'hsl(var(--text-muted))',
  },
  restaurantsGrid: {},
  restaurantCard: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    border: '1px solid hsl(var(--border-color))',
    background: 'hsl(var(--bg-card))',
  },
  cardImageWrapper: {
    position: 'relative',
    height: '200px',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  cardTag: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    zIndex: 1,
  },
  cardContent: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontFamily: "'Playfair Display', serif",
    fontWeight: '700',
  },
  cardRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(212, 175, 55, 0.1)',
    color: 'hsl(var(--text-gold))',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8rem',
    fontWeight: '600',
  },
  starIcon: {
    color: 'hsl(var(--primary))',
  },
  cardLocation: {
    fontSize: '0.8rem',
    color: 'hsl(var(--text-muted))',
    marginBottom: '6px',
  },
  directionsLink: {
    display: 'inline-block',
    fontSize: '0.75rem',
    color: 'hsl(var(--primary))',
    marginBottom: '10px',
    textDecoration: 'underline',
  },
  cardDescription: {
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    lineHeight: '1.5',
    marginBottom: '15px',
    flex: 1,
  },
  featuresWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '20px',
  },
  featurePill: {
    fontSize: '0.7rem',
    background: 'hsl(var(--bg-input))',
    color: 'hsl(var(--text-muted))',
    padding: '3px 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid hsl(var(--border-color))',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid hsl(var(--border-color))',
    paddingTop: '14px',
    marginTop: 'auto',
  },
  cardPrice: {
    fontSize: '0.8rem',
    color: 'hsl(var(--text-muted))',
  },
  cardButton: {
    padding: '8px 14px',
    fontSize: '0.8rem',
  },
  emptyState: {
    padding: '80px 40px',
    textAlign: 'center',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid hsl(var(--border-color))',
  },
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '20px',
  },
  emptyTitle: {
    fontSize: '1.6rem',
    marginBottom: '10px',
  },
  emptyText: {
    color: 'hsl(var(--text-muted))',
    maxWidth: '500px',
    margin: '0 auto',
  },
  skeletonCard: {
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid hsl(var(--border-color))',
    background: 'hsl(var(--bg-card))',
  }
};
