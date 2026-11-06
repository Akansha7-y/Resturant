import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, token, getAuthHeaders, logout } = useContext(AuthContext);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/auth');
      return;
    }
    fetchBookings();
  }, [token]);

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
        console.error('Error fetching bookings:', err);
        setLoading(false);
      });
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation? Hold deposits are refunded in mock coins.')) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Cancellation failed');
      }

      // Update locally
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status: 'cancelled' } : b));
      alert('Reservation cancelled successfully.');
    } catch (error) {
      alert(error.message);
    }
  };

  const upcomingBookings = bookings.filter(b => ['confirmed', 'pending_payment', 'pending_approval'].includes(b.status));
  const pastBookings = bookings.filter(b => ['cancelled', 'rejected'].includes(b.status));

  return (
    <div className="container" style={styles.container}>
      {/* Profile summary header */}
      <section style={styles.profileHeader} className="glass-panel-gold profile-header-responsive">
        <div style={styles.avatar}>👤</div>
        <div style={styles.profileInfo}>
          <span style={styles.profileTag}>VERIFIED GOLD MEMBER</span>
          <h1 style={styles.profileName}>{user?.name}</h1>
          <p style={styles.profileEmail}>{user?.email}</p>
        </div>
        <div style={styles.profileStats}>
          <div style={styles.statBox}>
            <span style={styles.statNum}>{bookings.length}</span>
            <span style={styles.statLabel}>Total Reserves</span>
          </div>
          <button onClick={logout} className="btn btn-secondary" style={styles.logoutBtn}>
            Log Out Account
          </button>
        </div>
      </section>

      {/* Bookings Section */}
      <section style={styles.bookingsSection}>
        <div style={styles.tabsHeader}>
          <div style={styles.tabs}>
            <button
              onClick={() => setActiveTab('upcoming')}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === 'upcoming' ? 'hsl(var(--primary))' : 'transparent',
                color: activeTab === 'upcoming' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'
              }}
            >
              Upcoming Tables ({upcomingBookings.length})
            </button>
            <button
              onClick={() => setActiveTab('past')}
              style={{
                ...styles.tabBtn,
                borderBottomColor: activeTab === 'past' ? 'hsl(var(--primary))' : 'transparent',
                color: activeTab === 'past' ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'
              }}
            >
              History & Cancelled ({pastBookings.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p>Retrieving reservations list...</p>
          </div>
        ) : (
          <div style={styles.bookingsList}>
            {(activeTab === 'upcoming' ? upcomingBookings : pastBookings).length === 0 ? (
              <div style={styles.noBookings} className="glass-panel">
                <span style={styles.noBookingsIcon}>📅</span>
                <h3>No Reservations Found</h3>
                <p style={{ color: 'hsl(var(--text-muted))' }}>You do not have any bookings in this folder.</p>
                <button onClick={() => navigate('/restaurants')} className="btn btn-primary" style={{ marginTop: '20px' }}>
                  Browse Restaurants
                </button>
              </div>
            ) : (
              (activeTab === 'upcoming' ? upcomingBookings : pastBookings).map((booking) => (
                <div key={booking._id} style={styles.bookingCard} className="glass-panel booking-card-responsive">
                  <div style={styles.bookingImageWrapper}>
                    <img src={booking.restaurantImage} alt={booking.restaurantName} style={styles.bookingImage} />
                  </div>
                  
                  <div style={styles.bookingCardContent}>
                    <div style={styles.bookingCardHeader}>
                      <h3 style={styles.restaurantTitle}>{booking.restaurantName}</h3>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: booking.status === 'confirmed' ? 'hsl(var(--success) / 0.15)' : ['cancelled', 'rejected'].includes(booking.status) ? 'hsl(var(--error) / 0.15)' : 'hsl(var(--warning) / 0.15)',
                        color: booking.status === 'confirmed' ? 'hsl(var(--success))' : ['cancelled', 'rejected'].includes(booking.status) ? 'hsl(var(--error))' : 'hsl(var(--warning))',
                        border: `1px solid ${booking.status === 'confirmed' ? 'hsl(var(--success) / 0.3)' : ['cancelled', 'rejected'].includes(booking.status) ? 'hsl(var(--error) / 0.3)' : 'hsl(var(--warning) / 0.3)'}`
                      }}>
                        {booking.status?.replace('_', ' ')}
                      </span>
                    </div>

                    <div style={styles.bookingDetailsGrid}>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Date & Time</span>
                        <span style={styles.detailValue}>📅 {booking.date} at {booking.time}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Table Size</span>
                        <span style={styles.detailValue}>👥 {booking.guests} Guests</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Seating Preference</span>
                        <span style={styles.detailValue}>🪑 {booking.seatingArea}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Payment Details</span>
                        <span style={styles.detailValue}>
                          💰 ${booking.paymentDetails?.amount} ({booking.paymentDetails?.status})
                        </span>
                      </div>
                    </div>

                    {booking.specialRequests && (
                      <div style={styles.specialRequestsBox}>
                        <strong>Note:</strong> "{booking.specialRequests}"
                      </div>
                    )}

                    <div style={styles.actionsRow}>
                      {booking.paymentDetails?.status === 'paid' && (
                        <button
                          onClick={() => setSelectedReceipt(booking)}
                          className="btn btn-gold-outline"
                          style={styles.actionBtn}
                        >
                          View Receipt
                        </button>
                      )}
                      
                      {booking.status === 'pending_payment' && (
                        <button
                          onClick={() => navigate(`/restaurants/${booking.restaurantId}`)}
                          className="btn btn-primary"
                          style={styles.actionBtn}
                        >
                          Complete Payment
                        </button>
                      )}

                      {booking.status === 'pending_approval' && (
                        <span style={{ fontSize: '0.85rem', color: 'hsl(var(--warning))', fontStyle: 'italic' }}>
                          Awaiting restaurant approval
                        </span>
                      )}

                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancelBooking(booking._id)}
                          className="btn btn-secondary"
                          style={{ ...styles.actionBtn, borderColor: 'rgba(239, 68, 68, 0.4)', color: 'hsl(var(--error))' }}
                        >
                          Cancel Table
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* DIGITAL RECEIPT MODAL */}
      {selectedReceipt && (
        <div style={styles.modalOverlay}>
          <div style={styles.receiptTicket} className="glass-panel-gold">
            <div style={styles.ticketHeader}>
              <h3 style={styles.ticketMainTitle}>Table Hold Receipt</h3>
              <button onClick={() => setSelectedReceipt(null)} style={styles.closeModalBtn}>×</button>
            </div>
            
            <div style={styles.ticketBody}>
              <div style={styles.barcodeSection}>
                <div style={styles.barcode}>||||| | ||||| | || ||||| | |||</div>
                <span style={styles.txCode}>TXN Code: {selectedReceipt.paymentDetails?.transactionId}</span>
              </div>

              <div style={styles.ticketDivider}></div>

              <div style={styles.ticketDetails}>
                <div style={styles.ticketLine}>
                  <span style={styles.ticketLabel}>RESTAURANT</span>
                  <span style={styles.ticketVal}>{selectedReceipt.restaurantName}</span>
                </div>
                <div style={styles.ticketLine}>
                  <span style={styles.ticketLabel}>GUEST NAME</span>
                  <span style={styles.ticketVal}>{selectedReceipt.userName}</span>
                </div>
                <div style={styles.ticketLine}>
                  <span style={styles.ticketLabel}>EMAIL</span>
                  <span style={styles.ticketVal}>{selectedReceipt.userEmail}</span>
                </div>
                <div style={styles.ticketLine}>
                  <span style={styles.ticketLabel}>DATE & TIME</span>
                  <span style={styles.ticketVal}>{selectedReceipt.date} @ {selectedReceipt.time}</span>
                </div>
                <div style={styles.ticketLine}>
                  <span style={styles.ticketLabel}>GUESTS</span>
                  <span style={styles.ticketVal}>{selectedReceipt.guests} People</span>
                </div>
                <div style={styles.ticketLine}>
                  <span style={styles.ticketLabel}>SEATING ZONE</span>
                  <span style={styles.ticketVal}>{selectedReceipt.seatingArea}</span>
                </div>
                <div style={styles.ticketLine}>
                  <span style={styles.ticketLabel}>CARD METHOD</span>
                  <span style={styles.ticketVal}>VISA / MASTERCARD (•••• {selectedReceipt.paymentDetails?.cardLast4})</span>
                </div>
                <div style={styles.ticketLine}>
                  <span style={styles.ticketLabel}>TRANSACTION TIME</span>
                  <span style={styles.ticketVal}>{new Date(selectedReceipt.paymentDetails?.paidAt).toLocaleString()}</span>
                </div>
              </div>

              <div style={styles.ticketDivider}></div>

              <div style={styles.ticketTotalRow}>
                <span>AMOUNT PAID:</span>
                <span style={styles.ticketTotalVal}>${selectedReceipt.paymentDetails?.amount}.00 USD</span>
              </div>
            </div>

            <div style={styles.ticketFooter}>
              <button onClick={() => window.print()} className="btn btn-primary" style={{ width: '100%' }}>
                Print Reservation Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    paddingTop: '40px',
    paddingBottom: '80px',
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '40px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(212, 175, 55, 0.25)',
    gap: '30px',
    flexWrap: 'wrap',
    marginBottom: '50px',
  },
  avatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'hsl(var(--primary) / 0.15)',
    border: '2px solid hsl(var(--primary))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2.5rem',
  },
  profileInfo: {
    flex: 1,
    minWidth: '220px',
  },
  profileTag: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: 'hsl(var(--text-gold))',
    letterSpacing: '1px',
  },
  profileName: {
    fontSize: '2.2rem',
    margin: '4px 0',
  },
  profileEmail: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.95rem',
  },
  profileStats: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '16px',
  },
  statBox: {
    textAlign: 'right',
  },
  statNum: {
    fontSize: '2rem',
    fontWeight: '700',
    color: 'hsl(var(--primary))',
    marginRight: '8px',
  },
  statLabel: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.85rem',
    textTransform: 'uppercase',
  },
  logoutBtn: {
    padding: '8px 16px',
    fontSize: '0.8rem',
  },
  bookingsSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  tabsHeader: {
    borderBottom: '1px solid hsl(var(--border-color))',
  },
  tabs: {
    display: 'flex',
    gap: '30px',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '12px 4px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  bookingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  noBookings: {
    padding: '80px 40px',
    textAlign: 'center',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid hsl(var(--border-color))',
  },
  noBookingsIcon: {
    fontSize: '4rem',
    marginBottom: '20px',
    display: 'block',
  },
  bookingCard: {
    display: 'flex',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    border: '1px solid hsl(var(--border-color))',
    gap: '24px',
    background: 'hsl(var(--bg-card))',
    flexWrap: 'wrap',
  },
  bookingImageWrapper: {
    width: '240px',
    height: 'auto',
    minHeight: '200px',
    overflow: 'hidden',
  },
  bookingImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  bookingCardContent: {
    padding: '24px 24px 24px 0',
    flex: 1,
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  bookingCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  restaurantTitle: {
    fontSize: '1.5rem',
    fontFamily: "'Playfair Display', serif",
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  bookingDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'hsl(var(--text-muted))',
    letterSpacing: '0.5px',
  },
  detailValue: {
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  specialRequestsBox: {
    padding: '12px',
    background: 'hsl(var(--bg-input))',
    borderRadius: 'var(--radius-sm)',
    borderLeft: '3px solid hsl(var(--primary))',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    marginBottom: '20px',
  },
  actionsRow: {
    display: 'flex',
    gap: '12px',
  },
  actionBtn: {
    padding: '10px 20px',
    fontSize: '0.85rem',
  },
  
  /* MODALS */
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 9, 0.9)',
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backdropFilter: 'blur(8px)',
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--text-muted))',
    fontSize: '1.8rem',
    cursor: 'pointer',
  },
  receiptTicket: {
    width: '100%',
    maxWidth: '460px',
    padding: '30px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    background: 'hsl(var(--bg-card))',
    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
    animation: 'fadeIn 0.3s ease',
  },
  ticketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  ticketMainTitle: {
    fontSize: '1.4rem',
    fontFamily: "'Playfair Display', serif",
  },
  ticketBody: {
    display: 'flex',
    flexDirection: 'column',
  },
  barcodeSection: {
    textAlign: 'center',
    margin: '10px 0 20px',
  },
  barcode: {
    fontFamily: 'monospace',
    fontSize: '1.5rem',
    letterSpacing: '2px',
    color: 'hsl(var(--text-muted))',
    opacity: 0.6,
  },
  txCode: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))',
    letterSpacing: '0.5px',
  },
  ticketDivider: {
    borderTop: '1px dashed hsl(var(--border-color))',
    margin: '10px 0',
  },
  ticketDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '10px 0',
  },
  ticketLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
  },
  ticketLabel: {
    color: 'hsl(var(--text-muted))',
    fontWeight: '500',
  },
  ticketVal: {
    fontWeight: '600',
    textAlign: 'right',
  },
  ticketTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'hsl(var(--text-gold))',
    paddingTop: '12px',
  },
  ticketTotalVal: {
    fontSize: '1.4rem',
  },
  ticketFooter: {
    marginTop: '24px',
  }
};
