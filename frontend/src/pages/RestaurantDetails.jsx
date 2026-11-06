import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import RestaurantMap from '../components/RestaurantMap';
import AIInsights from '../components/AIInsights';
import { shareRestaurant } from '../utils/share';
import { googleCalendarUrl } from '../utils/calendar';

export default function RestaurantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useContext(AuthContext);

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  
  // Booking Form State
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('7:00 PM');
  const [bookingGuests, setBookingGuests] = useState(2);
  const [seatingArea, setSeatingArea] = useState('Standard');
  const [specialRequests, setSpecialRequests] = useState('');
  
  // Review Form State
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [shareMsg, setShareMsg] = useState('');
  const [commentDrafts, setCommentDrafts] = useState({});

  useEffect(() => {
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookingDate(tomorrow.toISOString().split('T')[0]);

    fetchRestaurant();
  }, [id]);

  const fetchRestaurant = () => {
    setLoading(true);
    fetch(`/api/restaurants/${id}`)
      .then(res => res.json())
      .then(data => {
        setRestaurant(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching restaurant details:', err);
        setLoading(false);
      });
  };

  const handleShare = async () => {
    const result = await shareRestaurant(restaurant);
    if (result.method === 'clipboard') setShareMsg('Link copied to clipboard!');
    else if (result.ok) setShareMsg('Shared!');
    else if (result.method !== 'cancelled') setShareMsg('Could not share. Copy the URL from your browser.');
    setTimeout(() => setShareMsg(''), 2500);
  };

  const handleLikeReview = async (reviewId) => {
    if (!user) {
      navigate('/auth', { state: { from: `/restaurants/${id}` } });
      return;
    }
    try {
      const res = await fetch(`/api/restaurants/${id}/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRestaurant(data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCommentReview = async (reviewId) => {
    if (!user) {
      navigate('/auth', { state: { from: `/restaurants/${id}` } });
      return;
    }
    const text = (commentDrafts[reviewId] || '').trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/restaurants/${id}/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRestaurant(data);
      setCommentDrafts((d) => ({ ...d, [reviewId]: '' }));
    } catch (err) {
      alert(err.message);
    }
  };

  // Step 1: Create pending booking
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth', { state: { from: `/restaurants/${id}` } });
      return;
    }

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          restaurantId: id,
          date: bookingDate,
          time: bookingTime,
          guests: Number(bookingGuests),
          seatingArea,
          specialRequests
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize booking');
      }

      setBookingId(data._id);
      setConfirmedBooking(data);
      // Reset card details
      setCardHolder(user.name);
      setCardNumber('');
      setCardExpiry('');
      setCardCvv('');
      setPaymentError('');
      setPaymentSuccess(false);
      setShowPaymentModal(true);
    } catch (err) {
      alert(err.message);
    }
  };

  // Step 2: Pay for booking (Mock)
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentProcessing(true);
    setPaymentError('');

    try {
      const response = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          cardNumber,
          expiryDate: cardExpiry,
          cvv: cardCvv
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Payment transaction rejected.');
      }

      // Simulate a small visual loading transition for premium experience
      setTimeout(() => {
        setPaymentProcessing(false);
        setPaymentSuccess(true);
        setConfirmedBooking(data.booking);
      }, 2000);
    } catch (err) {
      setPaymentProcessing(false);
      setPaymentError(err.message);
    }
  };

  // Review Submit
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewComment) return;
    setReviewSubmitting(true);
    setReviewError('');

    try {
      const response = await fetch(`/api/restaurants/${id}/reviews`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rating: Number(reviewRating),
          comment: reviewComment
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit review');
      }

      setRestaurant(data);
      setReviewComment('');
      setReviewRating(5);
      setReviewSubmitting(false);
    } catch (err) {
      setReviewSubmitting(false);
      setReviewError(err.message);
    }
  };

  // Card formatting helpers
  const handleCardNumberChange = (e) => {
    const val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = val.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      setCardNumber(parts.join(' '));
    } else {
      setCardNumber(val);
    }
  };

  const handleExpiryChange = (e) => {
    let val = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2, 4);
    }
    setCardExpiry(val.slice(0, 5));
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '20px' }}>Loading dining experience details...</h2>
        <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--radius-lg)', marginBottom: '30px' }}></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2>Restaurant details could not be found.</h2>
        <Link to="/restaurants" className="btn btn-primary" style={{ marginTop: '20px' }}>Back to Listings</Link>
      </div>
    );
  }

  // Get distinct menu categories
  const categories = ['All', ...new Set(restaurant.menu.map(item => item.category))];

  // Filtered menu
  const filteredMenu = activeTab === 'All' 
    ? restaurant.menu 
    : restaurant.menu.filter(item => item.category === activeTab);

  const depositFee = bookingGuests * 15;

  return (
    <div style={styles.detailWrapper}>
      {/* Restaurant Header Splash */}
      <section style={{ ...styles.heroHeader, backgroundImage: `url(${restaurant.image})` }}>
        <div style={styles.heroOverlay}></div>
        <div style={styles.heroContent} className="container">
          <div style={styles.headerBadges}>
            <span className="badge badge-gold">{restaurant.cuisine}</span>
            <span style={styles.pricePill}>{restaurant.priceRange}</span>
          </div>
          <h1 style={styles.headerTitle}>{restaurant.name}</h1>
          <p style={styles.headerLocation}>📍 {restaurant.location} | 🕒 Hours: {restaurant.workingHours}</p>
          <div style={styles.headerRating}>
            <span style={styles.starBig}>★</span>
            <span style={styles.ratingText}>{restaurant.rating} / 5.0</span>
            <span style={styles.reviewsCount}>({restaurant.reviews.length} Verified Reviews)</span>
          </div>
          <div style={styles.shareRow}>
            <button type="button" className="btn btn-gold-outline" style={styles.shareBtn} onClick={handleShare}>
              Share restaurant
            </button>
            {shareMsg && <span style={styles.shareMsg}>{shareMsg}</span>}
          </div>
        </div>
      </section>

      <div className="container details-grid">
        {/* Left Side: Description, Menu, Reviews */}
        <div style={styles.leftCol}>
          {/* About */}
          <section style={styles.infoCard} className="glass-panel">
            <h2 style={styles.cardSectionTitle}>About the Restaurant</h2>
            <p style={styles.descriptionText}>{restaurant.description}</p>
            <h3 style={{ ...styles.subTitle, marginTop: '20px' }}>Establishment Features</h3>
            <div style={styles.featuresList}>
              {restaurant.features.map((f, i) => (
                <span key={i} style={styles.featureItem} className="badge badge-gold">✦ {f}</span>
              ))}
            </div>
          </section>

          <AIInsights restaurantId={restaurant._id} />

          <RestaurantMap restaurant={restaurant} />

          {/* Menus */}
          <section style={styles.infoCard} className="glass-panel">
            <h2 style={styles.cardSectionTitle}>Curated Gastronomic Menu</h2>
            <div style={styles.menuTabs}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  style={{
                    ...styles.tabBtn,
                    borderBottomColor: activeTab === cat ? 'hsl(var(--primary))' : 'transparent',
                    color: activeTab === cat ? 'hsl(var(--primary))' : 'hsl(var(--text-muted))'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div style={styles.menuList}>
              {filteredMenu.map((item, index) => (
                <div key={index} style={styles.menuItem}>
                  <div style={styles.menuItemHeader}>
                    <h4 style={styles.menuItemName}>{item.name}</h4>
                    <span style={styles.menuItemPrice}>${item.price}</span>
                  </div>
                  <p style={styles.menuItemDesc}>{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Reviews */}
          <section style={styles.infoCard} className="glass-panel">
            <h2 style={styles.cardSectionTitle}>Guest Testimonials</h2>
            
            {/* Review List */}
            <div style={styles.reviewsList}>
              {restaurant.reviews.length === 0 ? (
                <p style={{ color: 'hsl(var(--text-muted))', fontStyle: 'italic' }}>No reviews yet. Be the first to share your experience!</p>
              ) : (
                restaurant.reviews.map((rev, revIdx) => {
                  const reviewId = rev._id || String(revIdx);
                  const likes = rev.likes || [];
                  const liked = user && likes.some(l => l.userId === user.id);
                  const comments = rev.comments || [];
                  return (
                  <div key={reviewId} style={styles.reviewItem}>
                    <div style={styles.reviewHeader}>
                      <span style={styles.reviewUser}>{rev.userName}</span>
                      <span style={styles.reviewDate}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={styles.reviewStars}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} style={{ color: i < rev.rating ? 'hsl(var(--primary))' : '#444' }}>★</span>
                      ))}
                    </div>
                    <p style={styles.reviewComment}>{rev.comment}</p>
                    <div style={styles.socialRow}>
                      <button type="button" style={styles.likeBtn} onClick={() => handleLikeReview(reviewId)}>
                        {liked ? '♥ Liked' : '♡ Like'} ({likes.length})
                      </button>
                    </div>
                    {comments.length > 0 && (
                      <div style={styles.commentsList}>
                        {comments.map((c) => (
                          <div key={c._id} style={styles.commentItem}>
                            <strong>{c.userName}</strong>: {c.text}
                          </div>
                        ))}
                      </div>
                    )}
                    {user && (
                      <div style={styles.commentForm}>
                        <input
                          className="form-input"
                          placeholder="Add a comment…"
                          value={commentDrafts[reviewId] || ''}
                          onChange={(e) => setCommentDrafts((d) => ({ ...d, [reviewId]: e.target.value }))}
                          style={{ flex: 1 }}
                        />
                        <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => handleCommentReview(reviewId)}>
                          Comment
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>

            {/* Review Input */}
            {user ? (
              <form onSubmit={handleReviewSubmit} style={styles.reviewForm}>
                <h3 style={styles.subTitle}>Write a Review</h3>
                {reviewError && <p style={styles.errorText}>{reviewError}</p>}
                
                <div className="form-group">
                  <label className="form-label">Your Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(e.target.value)}
                    className="form-input"
                    style={{ maxWidth: '120px' }}
                  >
                    <option value="5">5 Stars (Excellent)</option>
                    <option value="4">4 Stars (Good)</option>
                    <option value="3">3 Stars (Average)</option>
                    <option value="2">2 Stars (Poor)</option>
                    <option value="1">1 Star (Terrible)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Review Comment</label>
                  <textarea
                    rows="3"
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Describe your dining experience, service, flavor details..."
                    className="form-input"
                    style={{ resize: 'none' }}
                    required
                  ></textarea>
                </div>

                <button type="submit" disabled={reviewSubmitting} className="btn btn-gold-outline" style={{ alignSelf: 'flex-start' }}>
                  {reviewSubmitting ? 'Posting...' : 'Submit Review'}
                </button>
              </form>
            ) : (
              <div style={styles.loginToReview}>
                <p>Want to write a review? <Link to="/auth" style={{ color: 'hsl(var(--primary))', textDecoration: 'underline' }}>Sign in</Link> with your verified account.</p>
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Booking Widget */}
        <div style={styles.rightCol} className="booking-sidebar-sticky">
          <div style={styles.bookingWidget} className="glass-panel-gold">
            <h3 style={styles.bookingTitle}>Reserve a Table</h3>
            <p style={styles.bookingSubtitle}>Required table hold deposit: $15 / guest</p>
            
            <form onSubmit={handleBookingSubmit} style={styles.bookingForm}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="form-input"
                  style={styles.bookInput}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Time Slot</label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="form-input"
                  style={styles.bookInput}
                >
                  <option value="11:30 AM">11:30 AM (Lunch)</option>
                  <option value="12:30 PM">12:30 PM (Lunch)</option>
                  <option value="1:30 PM">1:30 PM (Lunch)</option>
                  <option value="5:30 PM">5:30 PM (Dinner)</option>
                  <option value="6:30 PM">6:30 PM (Dinner)</option>
                  <option value="7:30 PM">7:30 PM (Dinner)</option>
                  <option value="8:30 PM">8:30 PM (Dinner)</option>
                  <option value="9:30 PM">9:30 PM (Dinner)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Number of Guests</label>
                <select
                  value={bookingGuests}
                  onChange={(e) => setBookingGuests(e.target.value)}
                  className="form-input"
                  style={styles.bookInput}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map(num => (
                    <option key={num} value={num}>{num} {num === 1 ? 'Guest' : 'Guests'}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Seating Preference</label>
                <select
                  value={seatingArea}
                  onChange={(e) => setSeatingArea(e.target.value)}
                  className="form-input"
                  style={styles.bookInput}
                >
                  <option value="Standard Dining Room">Standard Dining Room</option>
                  <option value="Chef Counter (Active)">Chef Counter</option>
                  <option value="Balcony (Romantic)">Balcony (Scenic)</option>
                  <option value="Outdoor Patio">Outdoor Patio</option>
                  <option value="Private Saloon">Private Saloon (VIP)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Special Requests</label>
                <input
                  type="text"
                  placeholder="Anniversary, allergies, etc..."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="form-input"
                  style={styles.bookInput}
                />
              </div>

              <div style={styles.bookingTotal}>
                <span>Hold Deposit:</span>
                <span style={styles.totalPrice}>${depositFee}</span>
              </div>

              <button type="submit" className="btn btn-primary" style={styles.bookBtn}>
                {user ? 'Proceed to Secure Payment' : 'Login to Reserve Table'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* MOCK PAYMENT MODAL OVERLAY */}
      {showPaymentModal && (
        <div style={styles.modalOverlay} className="modal-overlay">
          <div style={styles.modalCard} className="modal-card glass-panel-gold">
            {!paymentSuccess ? (
              <>
                <div style={styles.modalHeader}>
                  <h3 style={styles.modalTitle}>Secure Checkout</h3>
                  <button onClick={() => setShowPaymentModal(false)} style={styles.closeModalBtn}>×</button>
                </div>
                
                {/* Summary */}
                <div style={styles.modalSummary}>
                  <p>Hold Deposit: <strong>${depositFee}.00 USD</strong></p>
                  <p>Reservation: <strong>{restaurant.name}</strong></p>
                  <p>Guests: <strong>{bookingGuests} People</strong> | Date: <strong>{bookingDate} @ {bookingTime}</strong></p>
                </div>

                <form onSubmit={handlePaymentSubmit} style={styles.modalForm}>
                  {paymentError && <p style={styles.modalError}>{paymentError}</p>}
                  
                  <div className="form-group">
                    <label className="form-label">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="form-input"
                      placeholder="e.g. John Doe"
                      required
                      disabled={paymentProcessing}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberNumber => handleCardNumberChange(handleCardNumberNumber)}
                      className="form-input"
                      placeholder="4000 1234 5678 9010"
                      maxLength="19"
                      required
                      disabled={paymentProcessing}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Expiration (MM/YY)</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        className="form-input"
                        placeholder="MM/YY"
                        maxLength="5"
                        required
                        disabled={paymentProcessing}
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">CVV</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, ''))}
                        className="form-input"
                        placeholder="•••"
                        maxLength="3"
                        required
                        disabled={paymentProcessing}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={paymentProcessing}
                    style={{ marginTop: '10px', width: '100%', position: 'relative' }}
                  >
                    {paymentProcessing ? (
                      <span style={styles.loaderSpinner}>Processing Secure Mock Payment...</span>
                    ) : (
                      `Pay $${depositFee}.00 & Confirm Table`
                    )}
                  </button>
                  <p style={styles.mockDisclaimer}>
                    🔒 Secured Mock Mode. Do not input real credit card credentials. Cards starting with 4 or 5 are accepted.
                  </p>
                </form>
              </>
            ) : (
              <div style={styles.successContainer}>
                <div style={styles.successIcon}>✓</div>
                <h3 style={styles.successTitle}>Reservation Confirmed!</h3>
                <p style={styles.successMessage}>
                  Your payment of <strong>${depositFee}.00</strong> was processed successfully. A table hold receipt has been generated.
                </p>
                
                <div style={styles.receiptDetails} className="glass-panel">
                  <h4 style={styles.receiptHeader}>Table Hold Receipt</h4>
                  <div style={styles.receiptLine}>
                    <span>Transaction ID:</span>
                    <code>{confirmedBooking?.paymentDetails?.transactionId}</code>
                  </div>
                  <div style={styles.receiptLine}>
                    <span>Establishment:</span>
                    <strong>{restaurant.name}</strong>
                  </div>
                  <div style={styles.receiptLine}>
                    <span>Date / Time:</span>
                    <span>{bookingDate} at {bookingTime}</span>
                  </div>
                  <div style={styles.receiptLine}>
                    <span>Seating Zone:</span>
                    <span>{seatingArea}</span>
                  </div>
                  <div style={styles.receiptLine}>
                    <span>Card digits:</span>
                    <span>•••• •••• •••• {confirmedBooking?.paymentDetails?.cardLast4}</span>
                  </div>
                </div>

                <div style={styles.successActions}>
                  {confirmedBooking && (
                    <a
                      href={googleCalendarUrl(confirmedBooking)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-gold-outline"
                      style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                    >
                      Add to Google Calendar
                    </a>
                  )}
                  <button onClick={() => navigate('/dashboard')} className="btn btn-primary" style={{ flex: 1 }}>
                    Go to User Dashboard
                  </button>
                  <button onClick={() => setShowPaymentModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                    Keep Browsing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  detailWrapper: {
    minHeight: '100vh',
    paddingBottom: '80px',
  },
  heroHeader: {
    position: 'relative',
    height: '45vh',
    minHeight: '350px',
    backgroundSize: 'cover',
    backgroundPosition: 'center center',
    display: 'flex',
    alignItems: 'flex-end',
    borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
  },
  heroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(to top, hsl(var(--bg-main)) 5%, rgba(12, 14, 18, 0.8) 50%, rgba(12, 14, 18, 0.4) 100%)',
  },
  heroContent: {
    position: 'relative',
    zIndex: 2,
    paddingBottom: '40px',
  },
  headerBadges: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'center',
  },
  pricePill: {
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '4px 10px',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 'clamp(2rem, 4vw, 3.25rem)',
    color: '#fff',
    marginBottom: '12px',
  },
  headerLocation: {
    fontSize: '1rem',
    color: 'hsl(var(--text-muted))',
    marginBottom: '16px',
  },
  headerRating: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  starBig: {
    color: 'hsl(var(--primary))',
    fontSize: '1.25rem',
  },
  ratingText: {
    fontWeight: '600',
    color: 'hsl(var(--text-gold))',
  },
  reviewsCount: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
  },
  gridContainer: {
    marginTop: '40px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  infoCard: {
    padding: '30px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid hsl(var(--border-color))',
  },
  cardSectionTitle: {
    fontSize: '1.6rem',
    marginBottom: '20px',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '12px',
    fontFamily: "'Playfair Display', serif",
  },
  descriptionText: {
    color: 'hsl(var(--text-muted))',
    fontSize: '1.05rem',
    lineHeight: '1.7',
  },
  subTitle: {
    fontSize: '1.2rem',
    fontWeight: '600',
    marginBottom: '12px',
    fontFamily: "'Outfit', sans-serif",
  },
  featuresList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  featureItem: {
    fontSize: '0.8rem',
  },
  menuTabs: {
    display: 'flex',
    gap: '20px',
    borderBottom: '1px solid hsl(var(--border-color))',
    marginBottom: '24px',
    overflowX: 'auto',
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    padding: '10px 4px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  menuItem: {
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '16px',
    ':last-child': {
      borderBottom: 'none',
      paddingBottom: 0,
    }
  },
  menuItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  menuItemName: {
    fontSize: '1.1rem',
    fontWeight: '600',
    fontFamily: "'Outfit', sans-serif",
  },
  menuItemPrice: {
    color: 'hsl(var(--text-gold))',
    fontWeight: '700',
  },
  menuItemDesc: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.85rem',
  },
  reviewsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    marginBottom: '32px',
  },
  reviewItem: {
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '20px',
  },
  reviewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  reviewUser: {
    fontWeight: '600',
    fontSize: '0.95rem',
  },
  reviewDate: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.8rem',
  },
  reviewStars: {
    marginBottom: '8px',
  },
  reviewComment: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
    lineHeight: '1.6',
  },
  reviewForm: {
    display: 'flex',
    flexDirection: 'column',
    borderTop: '1px solid hsl(var(--border-color))',
    paddingTop: '24px',
  },
  errorText: {
    color: 'hsl(var(--error))',
    fontSize: '0.85rem',
    marginBottom: '12px',
  },
  loginToReview: {
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    background: 'hsl(var(--bg-input))',
    textAlign: 'center',
  },
  rightCol: {
    position: 'sticky',
    top: '100px',
  },
  bookingWidget: {
    padding: '30px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(212, 175, 55, 0.25)',
  },
  bookingTitle: {
    fontSize: '1.5rem',
    marginBottom: '4px',
    fontFamily: "'Playfair Display', serif",
  },
  bookingSubtitle: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.8rem',
    marginBottom: '24px',
  },
  bookingForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  bookInput: {
    borderColor: 'rgba(212, 175, 55, 0.15)',
  },
  bookingTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '20px 0',
    padding: '16px 0',
    borderTop: '1px dashed hsl(var(--border-color))',
    borderBottom: '1px dashed hsl(var(--border-color))',
  },
  totalPrice: {
    fontSize: '1.6rem',
    fontWeight: '700',
    color: 'hsl(var(--text-gold))',
  },
  bookBtn: {
    width: '100%',
  },
  
  /* MODAL STYLES */
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
  modalCard: {
    width: '100%',
    maxWidth: '520px',
    padding: '30px',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid rgba(212, 175, 55, 0.3)',
    boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
    animation: 'fadeIn 0.3s ease',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '1.4rem',
    fontFamily: "'Playfair Display', serif",
  },
  closeModalBtn: {
    background: 'none',
    border: 'none',
    color: 'hsl(var(--text-muted))',
    fontSize: '1.8rem',
    cursor: 'pointer',
  },
  modalSummary: {
    background: 'rgba(212,175,55,0.06)',
    padding: '16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(212,175,55,0.15)',
    marginBottom: '20px',
    fontSize: '0.85rem',
    color: 'hsl(var(--text-muted))',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column',
  },
  formRow: {},
  modalError: {
    color: 'hsl(var(--error))',
    fontSize: '0.85rem',
    marginBottom: '12px',
    background: 'rgba(239, 68, 68, 0.1)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  loaderSpinner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  mockDisclaimer: {
    fontSize: '0.75rem',
    color: 'hsl(var(--text-muted))',
    textAlign: 'center',
    marginTop: '16px',
    opacity: 0.8,
  },
  successContainer: {
    textAlign: 'center',
    padding: '10px 0',
  },
  successIcon: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'hsl(var(--success) / 0.15)',
    color: 'hsl(var(--success))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
    margin: '0 auto 20px',
    border: '2px solid hsl(var(--success))',
    animation: 'pulseGold 2s infinite',
  },
  successTitle: {
    fontSize: '1.75rem',
    marginBottom: '10px',
    fontFamily: "'Playfair Display', serif",
  },
  successMessage: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.95rem',
    marginBottom: '24px',
  },
  receiptDetails: {
    padding: '20px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid hsl(var(--border-color))',
    background: 'hsl(var(--bg-card))',
    textAlign: 'left',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  receiptHeader: {
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid hsl(var(--border-color))',
    paddingBottom: '8px',
    marginBottom: '4px',
    color: 'hsl(var(--text-gold))',
  },
  receiptLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.85rem',
  },
  successActions: {
    display: 'flex',
    gap: '12px',
  }
};
