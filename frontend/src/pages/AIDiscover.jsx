import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AISearchBar from '../components/AISearchBar';

export default function AIDiscover() {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setError('');
    fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: q })
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Search failed');
        setResult(data);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="container page-pad" style={styles.page}>
      <h1 style={styles.title}>AI Restaurant Discovery</h1>
      <p style={styles.sub}>Describe your ideal night out — budget, mood, cuisine — and we’ll rank the best matches.</p>

      <AISearchBar initialQuery={q} />

      {loading && <p style={styles.status}>AI is matching restaurants…</p>}
      {error && <p style={styles.error}>{error}</p>}

      {result && !loading && (
        <>
          <div style={styles.insight} className="glass-panel">
            <p style={styles.insightText}>{result.assistantMessage}</p>
            {result.parsed && (
              <div style={styles.chips}>
                {result.parsed.moods?.map((m) => <span key={m} className="badge badge-gold">{m}</span>)}
                {result.parsed.maxBudget && <span className="badge badge-gold">≤ ${result.parsed.maxBudget}</span>}
                {result.parsed.cuisines?.map((c) => <span key={c} className="badge badge-gold">{c}</span>)}
              </div>
            )}
          </div>

          {!result.restaurants?.length ? (
            <p style={styles.status}>No matches. Try a different budget or mood.</p>
          ) : (
            <div className="restaurants-grid" style={{ marginTop: 24 }}>
              {result.restaurants.map((r, idx) => (
                <article key={r._id} className="card glass-panel" style={styles.card}>
                  <div style={styles.rank}>#{idx + 1} AI match</div>
                  <img src={r.image} alt={r.name} style={styles.img} />
                  <div style={styles.body}>
                    <h3 style={styles.name}>{r.name}</h3>
                    <p style={styles.meta}>{r.cuisine} · {r.location} · {r.rating}★ · {r.priceRange}</p>
                    <p style={styles.reason}>{r.matchReason}</p>
                    <p style={styles.est}>Est. dinner for two: <strong>${r.estimatedDinnerForTwo}</strong></p>
                    <Link to={`/restaurants/${r._id}`} className="btn btn-primary" style={{ width: '100%' }}>
                      View & Book
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  page: { paddingTop: 40, paddingBottom: 80 },
  title: { fontSize: 'clamp(1.8rem, 4vw, 2.4rem)', marginBottom: 8 },
  sub: { color: 'hsl(var(--text-muted))', marginBottom: 24 },
  status: { marginTop: 24, color: 'hsl(var(--text-muted))' },
  error: { marginTop: 16, color: 'hsl(var(--error))' },
  insight: { marginTop: 28, padding: 20, borderRadius: 'var(--radius-md)' },
  insightText: { marginBottom: 12, lineHeight: 1.5 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  card: { overflow: 'hidden', border: '1px solid hsl(var(--border-color))' },
  rank: {
    position: 'absolute',
    margin: 12,
    zIndex: 1,
    background: 'hsla(43,90%,55%,0.9)',
    color: '#111',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 999,
  },
  img: { width: '100%', height: 180, objectFit: 'cover', display: 'block' },
  body: { padding: 16 },
  name: { fontSize: '1.2rem', marginBottom: 6 },
  meta: { color: 'hsl(var(--text-muted))', fontSize: '0.85rem', marginBottom: 8 },
  reason: { fontSize: '0.85rem', marginBottom: 8, color: 'hsl(var(--text-gold))' },
  est: { fontSize: '0.85rem', marginBottom: 14 },
};
