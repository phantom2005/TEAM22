import React, { useState } from 'react';
import { Search, MessageSquare, Zap, LogOut, Sparkles, AlertTriangle, CheckCircle } from 'lucide-react';
import FeedbackAndMetrics from './FeedbackAndMetrics';
import { api } from '../api';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('rca');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Chatbot state
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello Engineer! Describe an incident and I will perform a Root Cause Analysis for you.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const sampleQueries = [
    '504 Gateway Timeout on auth endpoint during morning traffic spike',
    'OutOfMemory OOM crash in invoice PDF generation worker',
    'Database replication lag exceeding 15 minutes on read-replicas',
  ];

  // ── RCA Tab ──────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults(null);
    try {
      const data = await api.analyze(query);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Chatbot Tab ───────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    const currentInput = chatInput;
    setChatInput('');
    setChatLoading(true);

    try {
      const data = await api.analyze(currentInput);
      const botText =
        `📋 Summary: ${data.summary}\n\n` +
        `🔍 Root Cause: ${data.root_cause}\n\n` +
        `✅ Resolution: ${data.resolution}\n\n` +
        `Confidence: ${Math.round(data.confidence * 100)}%`;
      setChatMessages(prev => [...prev, { sender: 'bot', text: botText, analysisId: data.id }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'bot', text: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px' }}>

      {/* Header */}
      <header className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>AI Incident RCA Assistant</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className="pulse-dot"></span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>RAG Engine Connected</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Engineer: <strong style={{ color: '#818cf8' }}>{user?.email || 'Logged In'}</strong></span>
          <button onClick={onLogout} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div className={`nav-tab ${activeTab === 'rca' ? 'active' : ''}`} onClick={() => setActiveTab('rca')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} /> Incident Query & RAG
        </div>
        <div className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} /> Step-by-Step AI Chatbot
        </div>
      </div>

      {/* TAB 1: RCA */}
      {activeTab === 'rca' && (
        <div className="animate-fade-in">
          <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
            <label style={{ display: 'block', fontWeight: '600', marginBottom: '8px', color: '#e2e8f0' }}>
              Describe New Incident / Paste Error Log:
            </label>
            <textarea
              rows="4"
              className="glow-input"
              style={{ width: '100%', padding: '14px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
              placeholder="e.g., High latency and 504 timeouts on auth endpoint during morning traffic spikes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Presets:</span>
              {sampleQueries.map((sample, idx) => (
                <button key={idx} onClick={() => setQuery(sample)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                  Preset {idx + 1}
                </button>
              ))}
            </div>
            <button onClick={handleAnalyze} disabled={loading} className="btn-gradient"
              style={{ marginTop: '16px', padding: '12px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} /> {loading ? 'Analyzing...' : 'Analyze Incident & Retrieve Root Cause'}
            </button>
            {error && (
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '13px' }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {results && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Summary */}
              <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#a5b4fc', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> AI Concise RCA Executive Summary
                </h3>
                <p style={{ margin: '0 0 8px 0', color: '#f1f5f9', lineHeight: '1.6', fontSize: '14px' }}>{results.summary}</p>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '13px' }}>
                  Confidence: <strong style={{ color: '#34d399' }}>{Math.round(results.confidence * 100)}%</strong>
                </p>
              </div>

              {/* Root Cause & Resolution */}
              <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#818cf8', fontSize: '13px' }}>ROOT CAUSE</strong>
                    <p style={{ margin: '4px 0 0 0', color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>{results.root_cause}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#34d399', fontSize: '13px' }}>RESOLUTION</strong>
                    <p style={{ margin: '4px 0 0 0', color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6' }}>{results.resolution}</p>
                  </div>
                </div>
              </div>

              {/* Similar Incidents */}
              {results.similar_incidents?.length > 0 && (
                <>
                  <h3 style={{ margin: '8px 0 0 0', color: '#e2e8f0' }}>Top Similar Historical Incidents</h3>
                  {results.similar_incidents.map((t) => (
                    <div key={t.id} className="glass-card" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: '#f8fafc' }}>
                          {t.ticket_id ? `${t.ticket_id}: ` : ''}{t.title}
                        </span>
                        <span style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                          {Math.round(t.score * 100)}% Match
                        </span>
                      </div>
                      <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#cbd5e1' }}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                          <div><strong style={{ color: '#818cf8' }}>Root Cause:</strong> {t.root_cause || 'N/A'}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0 }} />
                          <div><strong style={{ color: '#34d399' }}>Resolution:</strong> {t.resolution || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Chatbot */}
      {activeTab === 'chat' && (
        <div className="glass-card animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '480px' }}>
          <h3 style={{ marginTop: 0, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="#818cf8" /> Interactive RCA Assistant Chat
          </h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '75%',
                background: msg.sender === 'user' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(15,23,42,0.9)',
                border: msg.sender === 'bot' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                padding: '12px 16px', borderRadius: '12px', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-line'
              }}>
                {msg.text}
              </div>
            ))}
            {chatLoading && (
              <div style={{ alignSelf: 'flex-start', color: '#94a3b8', fontSize: '13px', padding: '8px 12px' }}>
                Analyzing...
              </div>
            )}
          </div>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <input
              type="text"
              className="glow-input"
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '14px' }}
              placeholder="Describe an incident to analyze..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" disabled={chatLoading} className="btn-gradient" style={{ padding: '10px 20px' }}>Send</button>
          </form>
        </div>
      )}

      {/* Feedback & Metrics — passes last analysis id for feedback submission */}
      <FeedbackAndMetrics analysisId={results?.id} />
    </div>
  );
}
