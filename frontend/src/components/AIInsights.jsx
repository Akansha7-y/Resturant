import React, { useEffect, useState } from 'react';

export default function AIInsights({ restaurantId }) {
  const [summary, setSummary] = useState(null);
  const [wait, setWait] = useState(null);

  useEffect(() => {
    if (!restaurantId) return;
    fetch(`/api/ai/reviews/${restaurantId}/summary`)
      .then(r => r.json())
      .then(setSummary)
      .catch(() => {});
    fetch(`/api/ai/wait-time/${restaurantId}`)
      .then(r => r.json())
      .then(setWait)
      .catch(() => {});
  }, [restaurantId]);

  if (!summary && !wait) return null;

  return (
    <section style={styles.card} className="glass-panel">
      <h2 style={styles.title}>AI Insights</h2>
      <div style={styles.grid}>
        {wait && (
          <div style={styles.box}>
            <h3 style={styles.boxTitle}>Wait time prediction</h3>
            <p style={styles.waitBig}>{wait.predictedWaitMinutes} min</p>
            <p style={styles.meta}>Demand: <strong>{wait.level}</strong> · Occupancy ~{wait.occupancyPercent}%</p>
            <p style={styles.advice}>{wait.advice}</p>
            <ul style={styles.factors}>
              {wait.factors?.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}
        {summary && (
          <div style={styles.box}>
            <h3 style={styles.boxTitle}>Review summary</h3>
            <p style={styles.summary}>{summary.summary}</p>
            {summary.topThemes?.length > 0 && (
              <div style={styles.themes}>
                {summary.topThemes.map((t) => (
                  <span key={t} className="badge badge-gold">{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

const styles = {
  card: { padding: 24, borderRadius: 'var(--radius-lg)' },
  title: { fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  box: {
    padding: 16,
    borderRadius: 'var(--radius-md)',
    border: '1px solid hsl(var(--border-color))',
    background: 'hsla(0,0%,100%,0.03)',
  },
  boxTitle: { fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(var(--text-gold))', marginBottom: 10 },
  waitBig: { fontSize: '2rem', fontWeight: 700, color: 'hsl(var(--primary))', marginBottom: 6 },
  meta: { fontSize: '0.85rem', color: 'hsl(var(--text-muted))', marginBottom: 8 },
  advice: { fontSize: '0.9rem', marginBottom: 8 },
  factors: { margin: 0, paddingLeft: 18, color: 'hsl(var(--text-muted))', fontSize: '0.8rem' },
  summary: { fontSize: '0.9rem', lineHeight: 1.55, marginBottom: 12 },
  themes: { display: 'flex', flexWrap: 'wrap', gap: 6 },
};
