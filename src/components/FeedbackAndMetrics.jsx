import React, { useState, useEffect } from 'react';
import { BarChart3, MessageSquare, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { api } from '../api';

export default function FeedbackAndMetrics({ analysisId }) {
  const [rating, setRating] = useState('5');
  const [wasAccurate, setWasAccurate] = useState('yes');
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    api.getAnalytics()
      .then(setMetrics)
      .catch(() => {}); // silently fail — metrics are non-critical
  }, [submitted]); // refresh after each feedback submission

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!analysisId) return;
    setSubmitError('');
    try {
      await api.submitFeedback(
        analysisId,
        wasAccurate === 'yes',
        parseInt(rating),
        null
      );
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setSubmitError(err.message);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '28px' }}>

      {/* Live Metrics */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BarChart3 size={18} color="#818cf8" /> RAG Engine Benchmark Metrics
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>Retrieval Precision@5</span>
            <span style={statValueStyle}>{metrics ? `${metrics.retrieval_precision}%` : '—'}</span>
          </div>
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>Satisfaction Score</span>
            <span style={{ ...statValueStyle, color: '#34d399' }}>
              {metrics ? `⭐ ${metrics.avg_rating.toFixed(1)} / 5` : '—'}
            </span>
          </div>
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>Total Analyses</span>
            <span style={statValueStyle}>{metrics ? metrics.total_analyses : '—'}</span>
          </div>
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>Avg Confidence</span>
            <span style={{ ...statValueStyle, color: '#818cf8' }}>
              {metrics ? `${Math.round(metrics.avg_confidence * 100)}%` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Feedback Form */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#f8fafc', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={18} color="#a855f7" /> Solution Accuracy Feedback
        </h3>

        {!analysisId && (
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
            Run an analysis first to submit feedback.
          </p>
        )}

        {analysisId && (submitted ? (
          <div style={{ backgroundColor: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', padding: '14px', borderRadius: '8px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Check size={18} /> Feedback recorded!
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '600' }}>Was the Root Cause match accurate?</label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                <label style={{ fontSize: '13px', cursor: 'pointer', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" value="yes" checked={wasAccurate === 'yes'} onChange={(e) => setWasAccurate(e.target.value)} />
                  <ThumbsUp size={14} color="#34d399" /> Accurate
                </label>
                <label style={{ fontSize: '13px', cursor: 'pointer', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="radio" value="no" checked={wasAccurate === 'no'} onChange={(e) => setWasAccurate(e.target.value)} />
                  <ThumbsDown size={14} color="#f87171" /> Inaccurate
                </label>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Satisfaction Rating:</label>
              <select value={rating} onChange={(e) => setRating(e.target.value)} className="glow-input" style={{ width: '100%', padding: '8px', borderRadius: '6px' }}>
                <option value="5" style={{ background: '#0f172a' }}>⭐⭐⭐⭐⭐ Excellent (5/5)</option>
                <option value="4" style={{ background: '#0f172a' }}>⭐⭐⭐⭐ Good (4/5)</option>
                <option value="3" style={{ background: '#0f172a' }}>⭐⭐⭐ Average (3/5)</option>
                <option value="2" style={{ background: '#0f172a' }}>⭐⭐ Poor (2/5)</option>
              </select>
            </div>
            {submitError && (
              <p style={{ margin: 0, color: '#f87171', fontSize: '12px' }}>⚠ {submitError}</p>
            )}
            <button type="submit" className="btn-gradient" style={{ padding: '8px 16px', fontSize: '13px', alignSelf: 'flex-start' }}>
              Submit Rating
            </button>
          </form>
        ))}
      </div>

    </div>
  );
}

const statBoxStyle = { background: 'rgba(15,23,42,0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' };
const statLabelStyle = { display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '600' };
const statValueStyle = { display: 'block', fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', marginTop: '4px' };
