import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AISearchBar from '../components/AISearchBar';
import { AuthContext } from '../context/AuthContext';

export default function Home() {
  const [featuredRestaurants, setFeaturedRestaurants] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetch('/api/restaurants?minRating=4.6')
      .then(res => res.json())
      .then(data => {
        setFeaturedRestaurants(Array.isArray(data) ? data.slice(0, 3) : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch('/api/ai/recommendations', { headers })
      .then(res => res.json())
      .then(data => setRecommendations(data))
      .catch(() => {});
  }, [token]);

  const handleCuisineSelect = (cuisineName) => {
    navigate(`/restaurants?cuisine=${encodeURIComponent(cuisineName)}`);
  };

  return (
    <div style={styles.homeContainer}>
      <section style={styles.heroSection}>
        <div style={styles.heroOverlay}></div>
        <div style={styles.heroContent}>
          <span style={styles.heroSubtitle}>AI-POWERED DINING CONCIERGE</span>
          <h1 style={styles.heroTitle}>Reserve Your Table at the World's Finest Restaurants</h1>
          <p style={styles.heroText}>
            Tell us what you want — “romantic dinner under 2500” — or use voice search. Get AI picks, wait predictions, and book instantly.
          </p>
          <AISearchBar />
        </div>
      </section>

      {recommendations?.restaurants?.length > 0 && (
        <section style={styles.section} className="container">
          <h2 style={styles.sectionTitle}>Personalized for You</h2>
          <p style={styles.sectionSubtitle}>{recommendations.message}</p>
          <div className="featured-grid">
            {recommendations.restaurants.slice(0, 3).map((r) => (
              <Link key={r._id} to={`/restaurants/${r._id}`} className="card glass-panel" style={styles.recCard}>
                <img src={r.image} alt={r.name} style={styles.recImg} />
                <div style={{ padding: 16 }}>
                  <h3 style={{ marginBottom: 6 }}>{r.name}</h3>
                  <p style={styles.recMeta}>{r.cuisine} · {r.rating}★</p>
                  <p style={styles.recReason}>{r.reason}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section style={styles.section} className="container">
        <h2 style={styles.sectionTitle}>Browse by Culinary Style</h2>
        <p style={styles.sectionSubtitle}>Select your desired flavor profile to find the perfect setting</p>
        <div className="cuisine-grid" style={styles.cuisineGrid}>
          {[
            { name: 'French', icon: '🍷', desc: 'Fine Gastronomy' },
            { name: 'Japanese', icon: '🍣', desc: 'Kaiseki & Omakase' },
            { name: 'Italian', icon: '🍕', desc: 'Wood-fired Pizza & Pasta' },
            { name: 'Indian', icon: '🍛', desc: 'Royal Spiced Claypot' },
            { name: 'Mexican', icon: '🌮', desc: 'Street Tacos & Mezcal' },
            { name: 'Cafe', icon: '☕', desc: 'Boulangerie & Brunch' },
          ].map((c) => (
            <div
              key={c.name}
              style={styles.cuisineCard}
              className="glass-panel"
              onClick={() => handleCuisineSelect(c.name)}
            >
              <span style={styles.cuisineIcon}>{c.icon}</span>
              <h3 style={styles.cuisineName}>{c.name}</h3>
              <p style={styles.cuisineDesc}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...styles.section, paddingBottom: 80 }} className="container">
        <div style={styles.sectionHeaderRow}>
          <div>
            <h2 style={styles.sectionTitle}>Featured Establishments</h2>
            <p style={styles.sectionSubtitle}>Hand-picked venues with exceptional ratings</p>
          </div>
          <Link to="/restaurants" className="btn btn-gold-outline">View All</Link>
        </div>

        {loading ? (
          <div className="featured-grid" style={styles.restaurantsGrid}>
            {[1, 2, 3].map(n => (
              <div key={n} className="glass-panel skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : (
          <div className="featured-grid" style={styles.restaurantsGrid}>
            {featuredRestaurants.map((res) => (
              <div key={res._id} className="card glass-panel" style={styles.restaurantCard}>
                <div style={styles.cardImageWrapper}>
                  <img src={res.image} alt={res.name} style={styles.cardImage} />
                  <div style={styles.cardTag} className="badge badge-gold">{res.cuisine}</div>
                </div>
                <div style={styles.cardContent}>
                  <div style={styles.cardHeader}>
                    <h3 style={styles.cardTitle}>{res.name}</h3>
                    <div style={styles.cardRating}><span style={styles.starIcon}>★</span> {res.rating}</div>
                  </div>
                  <p style={styles.cardLocation}>📍 {res.location}</p>
                  <p style={styles.cardDescription}>{(res.description || '').slice(0, 120)}…</p>
                  <button onClick={() => navigate(`/restaurants/${res._id}`)} className="btn btn-primary" style={{ width: '100%', marginTop: 12 }}>
                    Book Table
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const styles = {
  homeContainer: { minHeight: '100%' },
  heroSection: {
    position: 'relative',
    height: 'auto',
    minHeight: 'min(75vh, 700px)',
    backgroundImage: `url('https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 16px',
    borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(8, 10, 14, 0.85)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 2,
    maxWidth: '880px',
    animation: 'fadeIn 1s ease',
    width: '100%',
  },
  heroSubtitle: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'hsl(var(--primary))',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginBottom: '16px',
    display: 'block',
  },
  heroTitle: {
    fontSize: 'clamp(2rem, 5vw, 3.5rem)',
    marginBottom: '24px',
    color: '#fff',
  },
  heroText: {
    fontSize: 'clamp(1rem, 2vw, 1.25rem)',
    color: 'hsl(var(--text-muted))',
    marginBottom: '40px',
    lineHeight: '1.6',
  },
  section: { paddingTop: '70px' },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  sectionTitle: { fontSize: '2rem', marginBottom: 8 },
  sectionSubtitle: { color: 'hsl(var(--text-muted))', fontSize: '1rem' },
  cuisineGrid: { marginTop: '32px' },
  cuisineCard: {
    padding: '30px 20px',
    textAlign: 'center',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    border: '1px solid hsl(var(--border-color))',
  },
  cuisineIcon: { fontSize: '2.5rem', marginBottom: '12px', display: 'block' },
  cuisineName: { fontSize: '1.2rem', marginBottom: '6px', fontFamily: "'Outfit', sans-serif", fontWeight: 600 },
  cuisineDesc: { fontSize: '0.8rem', color: 'hsl(var(--text-muted))' },
  restaurantsGrid: { marginTop: '32px' },
  restaurantCard: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    border: '1px solid hsl(var(--border-color))',
  },
  cardImageWrapper: { position: 'relative', height: '220px', overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%', objectFit: 'cover' },
  cardTag: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  cardContent: { padding: 20, display: 'flex', flexDirection: 'column', flex: 1 },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: '1.3rem', fontFamily: "'Playfair Display', serif" },
  cardRating: {
    display: 'flex', alignItems: 'center', gap: 4,
    background: 'rgba(212, 175, 55, 0.1)', color: 'hsl(var(--text-gold))',
    padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', fontWeight: 600,
  },
  starIcon: { color: 'hsl(var(--primary))' },
  cardLocation: { fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginBottom: 12 },
  cardDescription: { fontSize: '0.9rem', color: 'hsl(var(--text-muted))', lineHeight: 1.5, flex: 1 },
  recCard: {
    overflow: 'hidden',
    border: '1px solid hsl(var(--border-color))',
    textDecoration: 'none',
    color: 'inherit',
  },
  recImg: { width: '100%', height: 160, objectFit: 'cover', display: 'block' },
  recMeta: { color: 'hsl(var(--text-muted))', fontSize: '0.85rem', marginBottom: 6 },
  recReason: { color: 'hsl(var(--text-gold))', fontSize: '0.8rem' },
};
