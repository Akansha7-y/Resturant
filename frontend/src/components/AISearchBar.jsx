import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * AI natural-language search with optional Web Speech voice input.
 * Example: "romantic dinner under 2500"
 */
export default function AISearchBar({ compact = false, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const recognitionRef = useRef(null);

  const runSearch = (q) => {
    const value = (q ?? query).trim();
    if (!value) {
      setError('Describe what you want — e.g. romantic dinner under 2500');
      return;
    }
    setError('');
    navigate(`/ai-discover?q=${encodeURIComponent(value)}`);
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Voice search is not supported in this browser. Try Chrome.');
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setError('');
    };
    recognition.onerror = () => {
      setListening(false);
      setError('Could not hear you. Please try again.');
    };
    recognition.onend = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      runSearch(transcript);
    };
    recognition.start();
  };

  return (
    <div style={{ ...styles.wrap, ...(compact ? styles.compact : {}) }}>
      {!compact && (
        <p style={styles.hint}>
          AI Concierge — try “romantic dinner under 2500” or tap the mic
        </p>
      )}
      <form
        onSubmit={(e) => { e.preventDefault(); runSearch(); }}
        className="glass-panel-gold hero-search"
        style={styles.form}
      >
        <div style={styles.inputRow}>
          <span style={styles.aiBadge}>AI</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "romantic dinner under 2500"'
            style={styles.input}
            aria-label="AI restaurant search"
          />
          <button
            type="button"
            onClick={startVoice}
            style={{
              ...styles.micBtn,
              ...(listening ? styles.micActive : {})
            }}
            title="Voice search"
            aria-label="Voice search"
          >
            {listening ? '●' : '🎤'}
          </button>
        </div>
        <button type="submit" className="btn btn-primary" style={styles.submit}>
          Find with AI
        </button>
      </form>
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles = {
  wrap: { width: '100%', maxWidth: '780px', margin: '0 auto' },
  compact: { maxWidth: '100%' },
  hint: {
    color: 'hsl(var(--text-gold))',
    fontSize: '0.8rem',
    marginBottom: '10px',
    letterSpacing: '0.04em',
  },
  form: {
    alignItems: 'center',
    margin: '0 auto',
  },
  inputRow: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    width: '100%',
  },
  aiBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#0c0e12',
    background: 'linear-gradient(135deg, hsl(var(--primary)), #d49a2a)',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  input: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '0.95rem',
    padding: '8px 4px',
  },
  micBtn: {
    background: 'hsla(0,0%,100%,0.06)',
    border: '1px solid hsl(var(--border-color))',
    borderRadius: '50%',
    width: 40,
    height: 40,
    cursor: 'pointer',
    fontSize: '1rem',
    flexShrink: 0,
  },
  micActive: {
    borderColor: 'hsl(var(--error))',
    color: 'hsl(var(--error))',
    animation: 'pulseGold 1.2s infinite',
  },
  submit: { whiteSpace: 'nowrap' },
  error: { color: 'hsl(var(--error))', fontSize: '0.8rem', marginTop: '8px' },
};
