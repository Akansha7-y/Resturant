import React, { useState, useEffect, useRef, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ChatSupport() {
  const { token } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm L'Étoile Concierge. Ask for a romantic dinner under 2500, wait times, or booking help."
    }
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setBusy(true);

    try {
      const endpoint = token ? '/api/ai/chat/secure' : '/api/ai/chat';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history: messages.slice(-6) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Chat failed');

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: data.reply,
          restaurants: data.restaurants,
          wait: data.wait
        }
      ]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: err.message || 'Sorry, something went wrong.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        style={styles.fab}
        onClick={() => setOpen((o) => !o)}
        aria-label="Open chat support"
      >
        {open ? '✕' : '💬'}
      </button>

      {open && (
        <div style={styles.panel} className="glass-panel-gold">
          <div style={styles.header}>
            <div>
              <strong style={{ color: 'hsl(var(--text-gold))' }}>AI Chat Support</strong>
              <p style={styles.sub}>Concierge · instant answers</p>
            </div>
          </div>

          <div style={styles.messages}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  ...styles.bubble,
                  ...(msg.role === 'user' ? styles.userBubble : styles.botBubble)
                }}
              >
                <div>{msg.text}</div>
                {msg.restaurants?.length > 0 && (
                  <div style={styles.cardList}>
                    {msg.restaurants.map((r) => (
                      <Link key={r._id} to={`/restaurants/${r._id}`} style={styles.miniCard} onClick={() => setOpen(false)}>
                        <strong>{r.name}</strong>
                        <span style={styles.meta}>{r.cuisine} · {r.rating}★ · ~${r.estimatedDinnerForTwo}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <div style={{ ...styles.bubble, ...styles.botBubble }}>Thinking…</div>}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={send} style={styles.composer}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the concierge…"
              className="form-input"
              style={styles.input}
            />
            <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

const styles = {
  fab: {
    position: 'fixed',
    right: 20,
    bottom: 20,
    zIndex: 200,
    width: 56,
    height: 56,
    borderRadius: '50%',
    padding: 0,
    fontSize: '1.4rem',
    boxShadow: 'var(--shadow-lg)',
  },
  panel: {
    position: 'fixed',
    right: 20,
    bottom: 88,
    width: 'min(380px, calc(100vw - 24px))',
    height: 480,
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
  },
  header: {
    padding: '14px 16px',
    borderBottom: '1px solid hsl(var(--border-color))',
  },
  sub: { margin: 0, fontSize: '0.75rem', color: 'hsl(var(--text-muted))' },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  bubble: {
    maxWidth: '92%',
    padding: '10px 12px',
    borderRadius: 12,
    fontSize: '0.88rem',
    lineHeight: 1.45,
  },
  userBubble: {
    alignSelf: 'flex-end',
    background: 'hsla(43, 74%, 49%, 0.2)',
    border: '1px solid rgba(212,175,55,0.3)',
  },
  botBubble: {
    alignSelf: 'flex-start',
    background: 'hsla(0,0%,100%,0.05)',
    border: '1px solid hsl(var(--border-color))',
  },
  cardList: { marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 },
  miniCard: {
    display: 'block',
    padding: '8px 10px',
    borderRadius: 8,
    background: 'hsla(0,0%,0%,0.25)',
    border: '1px solid hsl(var(--border-color))',
    fontSize: '0.8rem',
  },
  meta: { display: 'block', color: 'hsl(var(--text-muted))', fontSize: '0.72rem', marginTop: 2 },
  composer: {
    display: 'flex',
    gap: 8,
    padding: 12,
    borderTop: '1px solid hsl(var(--border-color))',
  },
  input: { flex: 1, marginBottom: 0 },
};
