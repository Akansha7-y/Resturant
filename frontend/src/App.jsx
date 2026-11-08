import React, { useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Home from './pages/Home';
import RestaurantList from './pages/RestaurantList';
import RestaurantDetails from './pages/RestaurantDetails';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import Auth from './pages/Auth';
import AIDiscover from './pages/AIDiscover';
import ChatSupport from './components/ChatSupport';

function Header() {
  const { user, token } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const close = () => setMenuOpen(false);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const linkStyle = ({ isActive }) => ({
    color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'
  });

  return (
    <header style={styles.header} className="glass-panel">
      <div className={`container site-header-inner ${menuOpen ? 'menu-open' : ''}`}>
        <Link to="/" style={styles.logoWrapper} onClick={closeMenu}>
          <span style={styles.logoStar}>✦</span>
          <span style={styles.logoText} className="logo-text-full">L'Étoile Reserve</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <nav className="site-nav">
          <NavLink to="/" end style={linkStyle} onClick={closeMenu}>Home</NavLink>
          <NavLink to="/restaurants" style={linkStyle} onClick={closeMenu}>Restaurants</NavLink>
          <NavLink to="/ai-discover" style={linkStyle} onClick={closeMenu}>AI Discover</NavLink>
          {token && (
            <NavLink to="/dashboard" style={linkStyle} onClick={closeMenu}>My Bookings</NavLink>
          )}
          {token && user?.role === 'admin' && (
            <NavLink to="/admin" style={linkStyle} onClick={closeMenu}>Admin Panel</NavLink>
          )}
          {token && user?.role === 'owner' && (
            <NavLink to="/owner" style={linkStyle} onClick={closeMenu}>My Restaurant</NavLink>
          )}
          <div className="mobile-user-panel">
            {token && user ? (
              <>
                <span style={styles.userWelcome}>
                  👑 <strong style={{ color: 'hsl(var(--text-gold))' }}>{user.name}</strong>
                </span>
                <Link
                  to={user?.role === 'owner' ? '/owner' : '/dashboard'}
                  className="btn btn-gold-outline"
                  style={styles.headerBtn}
                  onClick={closeMenu}
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <Link to="/auth" className="btn btn-primary" style={styles.headerBtn} onClick={closeMenu}>
                Sign In
              </Link>
            )}
          </div>
        </nav>

        <div className="site-user" style={styles.userSection}>
          {token && user ? (
            <div style={styles.userInfoWrapper}>
              <span style={styles.userWelcome}>
                👑 <strong style={{ color: 'hsl(var(--text-gold))' }}>{user.name}</strong>
              </span>
              <Link to={user?.role === 'owner' ? '/owner' : '/dashboard'} className="btn btn-gold-outline" style={styles.headerBtn}>
                Dashboard
              </Link>
            </div>
          ) : (
            <Link to="/auth" className="btn btn-primary" style={styles.headerBtn}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.footerContainer}>
        <div style={styles.footerCol}>
          <h3 style={styles.footerLogo}>L'ÉTOILE</h3>
          <p style={styles.footerText}>
            Securing dining reservations at Michelin-star and luxury boutique tables worldwide since 2026.
          </p>
        </div>
        <div style={styles.footerCol}>
          <h4 style={styles.footerHeader}>Culinary Venues</h4>
          <ul style={styles.footerList}>
            <li><Link to="/restaurants?cuisine=French" style={styles.footerLink}>French Fine Dining</Link></li>
            <li><Link to="/restaurants?cuisine=Japanese" style={styles.footerLink}>Japanese Omakase</Link></li>
            <li><Link to="/restaurants?cuisine=Italian" style={styles.footerLink}>Italian Trattoria</Link></li>
            <li><Link to="/restaurants" style={styles.footerLink}>View All Listings</Link></li>
          </ul>
        </div>
        <div style={styles.footerCol}>
          <h4 style={styles.footerHeader}>Contact & Support</h4>
          <p style={styles.footerText}>📍 742 Gold Avenue, New York, NY</p>
          <p style={styles.footerText}>✉️ concierge@etoile.com</p>
          <p style={styles.footerText}>📞 +1 (800) ETOILE-9</p>
        </div>
      </div>
      <div style={styles.copyrightRow}>
        <div className="container">
          <p>© 2026 L'Étoile Reserve. All luxury mock rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

// Protected Route components
function ProtectedRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  if (loading) return <div role="status" aria-live="polite">Checking your session…</div>;
  return token ? children : <Navigate to="/auth" replace />;
}

function AdminRoute({ children }) {
  const { token, user, loading } = useContext(AuthContext);
  if (loading) return <div role="status" aria-live="polite">Checking your session…</div>;
  return token && user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />;
}

function OwnerRoute({ children }) {
  const { token, user, loading } = useContext(AuthContext);
  if (loading) return <div role="status" aria-live="polite">Checking your session…</div>;
  return token && ['owner', 'admin'].includes(user?.role) ? children : <Navigate to="/dashboard" replace />;
}

function AppContent() {
  return (
    <div style={styles.appWrapper}>
      <Header />
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/restaurants" element={<RestaurantList />} />
          <Route path="/restaurants/:id" element={<RestaurantDetails />} />
          <Route path="/ai-discover" element={<AIDiscover />} />
          <Route path="/auth" element={<Auth />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />
          <Route 
            path="/owner" 
            element={
              <OwnerRoute>
                <OwnerDashboard />
              </OwnerRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <ChatSupport />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

const styles = {
  appWrapper: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: 'hsl(var(--bg-main))',
  },
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    borderBottom: '1px solid hsl(var(--border-color))',
    width: '100%',
  },
  headerContainer: {
    height: '75px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  logoStar: {
    color: 'hsl(var(--primary))',
    fontSize: '1.4rem',
    fontWeight: '700',
  },
  logoText: {
    fontSize: '1.35rem',
    fontFamily: "'Playfair Display', serif",
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '0.5px',
  },
  nav: {
    display: 'flex',
    gap: '24px',
    alignItems: 'center',
  },
  navLink: {
    fontWeight: '600',
    letterSpacing: '0.5px',
    transition: 'var(--transition-fast)',
    textTransform: 'uppercase',
    fontSize: '0.8rem',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
  },
  userInfoWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  userWelcome: {
    fontSize: '0.9rem',
    color: 'hsl(var(--text-main))',
  },
  headerBtn: {
    padding: '8px 18px',
    fontSize: '0.85rem',
  },
  main: {
    flex: 1,
    width: '100%',
  },
  footer: {
    backgroundColor: '#07090c',
    borderTop: '1px solid hsl(var(--border-color))',
    paddingTop: 'clamp(32px, 6vw, 60px)',
    marginTop: 'auto',
  },
  footerContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '32px',
    paddingBottom: '40px',
  },
  footerCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  footerLogo: {
    fontSize: '1.6rem',
    fontFamily: "'Playfair Display', serif",
    letterSpacing: '2px',
    color: 'hsl(var(--text-gold))',
  },
  footerHeader: {
    fontSize: '1rem',
    color: '#fff',
    fontWeight: '600',
  },
  footerText: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
    lineHeight: '1.6',
  },
  footerList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  footerLink: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
    transition: 'var(--transition-fast)',
    ':hover': {
      color: 'hsl(var(--primary))',
    }
  },
  copyrightRow: {
    borderTop: '1px solid hsl(var(--border-color))',
    padding: '24px 0',
    textAlign: 'center',
    color: 'hsl(var(--text-muted))',
    fontSize: '0.8rem',
  }
};
