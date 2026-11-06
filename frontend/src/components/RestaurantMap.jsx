import React from 'react';

/**
 * Shows restaurant location on Google Maps and opens driving directions.
 * Uses Maps Embed (no API key required for query embed) + Google Maps Directions URL.
 */
export default function RestaurantMap({ restaurant }) {
  if (!restaurant) return null;

  const { name, location, address, lat, lng } = restaurant;
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const query = hasCoords
    ? `${lat},${lng}`
    : (address || `${name}, ${location}`);

  const embedSrc = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  const directionsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}&travelmode=driving`;
  const openInMapsUrl = hasCoords
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <section style={styles.card} className="glass-panel">
      <div className="map-header" style={styles.headerRow}>
        <div>
          <h2 style={styles.title}>Location & Directions</h2>
          <p style={styles.subtitle}>
            {address || location}
            {hasCoords ? ` · ${lat.toFixed(4)}, ${lng.toFixed(4)}` : ''}
          </p>
        </div>
        <div className="map-actions" style={styles.actions}>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            style={styles.driveBtn}
          >
            Drive here
          </a>
          <a
            href={openInMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.openLink}
          >
            Open in Google Maps
          </a>
        </div>
      </div>

      <div className="map-frame" style={styles.mapFrame}>
        <iframe
          title={`Map of ${name}`}
          src={embedSrc}
          width="100%"
          height="100%"
          style={styles.iframe}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  );
}

const styles = {
  card: {
    padding: '24px',
    borderRadius: 'var(--radius-lg)',
    marginBottom: '24px',
  },
  headerRow: {
    marginBottom: '16px',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.4rem',
    marginBottom: '6px',
  },
  subtitle: {
    color: 'hsl(var(--text-muted))',
    fontSize: '0.9rem',
    margin: 0,
  },
  actions: {},
  driveBtn: {
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  openLink: {
    color: 'hsl(var(--primary))',
    fontSize: '0.8rem',
    textDecoration: 'underline',
  },
  mapFrame: {
    width: '100%',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid hsl(var(--border-color))',
    background: '#111',
  },
  iframe: {
    border: 0,
    display: 'block',
  },
};
