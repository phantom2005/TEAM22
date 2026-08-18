import React, { useState, useRef } from 'react';
import { Search, Camera, MessageSquare, Zap, LogOut, Sparkles, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import FeedbackAndMetrics from './FeedbackAndMetrics';

export default function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('rca'); // 'rca' | 'camera' | 'chat'
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [ocrResult, setOcrResult] = useState('');
  const videoRef = useRef(null);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello Engineer! I am your AI Troubleshooting Assistant. How can I guide you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Sample Queries for Hackathon Demo
  const sampleQueries = [
    "504 Gateway Timeout on auth endpoint during morning traffic spike",
    "OutOfMemory OOM crash in invoice PDF generation worker",
    "Database replication lag exceeding 15 minutes on read-replicas"
  ];

  // Analyze Incident
  const handleAnalyze = () => {
    if (!query.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setResults({
        summary: "Primary root cause involves DB connection pool exhaustion under heavy traffic spikes, combined with insufficient proxy read timeout limits in Nginx.",
        tickets: [
          { id: "INC-101", title: "High API Latency on Auth Service", score: 95, root_cause: "DB connection pool exhaustion due to unclosed sessions in auth middleware.", resolution: "Increased pool size from 20 to 100 and added explicit session releases." },
          { id: "INC-102", title: "504 Gateway Timeout during Peak Load", score: 88, root_cause: "Nginx reverse proxy timeout setting was lower than downstream API response time.", resolution: "Increased proxy_read_timeout from 30s to 90s in Nginx config." },
          { id: "INC-103", title: "Auth Cluster Timeout Surge", score: 82, root_cause: "Unindexed query on OAuth tokens collection causing CPU throttling.", resolution: "Added compound index on (token_id, expires_at)." }
        ]
      });
      setLoading(false);
    }, 1200);
  };

  // Camera Handlers
  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert("Camera access denied or unavailable.");
      setIsCameraActive(false);
    }
  };

  // const capturePhoto = () => {
  //   setOcrResult("OCR Extracted Text: [ERROR 504] Gateway Timeout - Failed to establish pool connection to db-primary.internal:5432 after 30000ms");
  // };

  // Chatbot Handler
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = { sender: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');

    setTimeout(() => {
      const botResponse = {
        sender: 'bot',
        text: `Based on your query "${chatInput}", here are the recommended steps:\n1. Inspect active connection metrics on primary database.\n2. Verify Nginx proxy connection limits.\n3. Run migration script to add proper composite indexes.`
      };
      setChatMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px' }}>
      
      {/* Dashboard Top Navigation */}
      <header className="glass-card" style={{ padding: '16px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>AI Incident RCA Assistant</h2>
            {/* <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span className="pulse-dot"></span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>RAG Engine Connected • Cognizant Hackathon</span>
            </div> */}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#cbd5e1' }}>Engineer: <strong style={{ color: '#818cf8' }}>{user?.email || 'Logged In'}</strong></span>
          <button onClick={onLogout} style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <div className={`nav-tab ${activeTab === 'rca' ? 'active' : ''}`} onClick={() => setActiveTab('rca')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={16} /> Incident Query & RAG
        </div>
        {/* <div className={`nav-tab ${activeTab === 'camera' ? 'active' : ''}`} onClick={() => setActiveTab('camera')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Camera size={16} /> Visual Log Scanner (OCR)
        </div> */}
        <div className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MessageSquare size={16} /> Step-by-Step AI Chatbot
        </div>
      </div>

      {/* TAB 1: RCA Query & Retrieval */}
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

            {/* Quick Select Presets */}
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Presets:</span>
              {sampleQueries.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(sample)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Preset {idx + 1}
                </button>
              ))}
            </div>

            <button onClick={handleAnalyze} disabled={loading} className="btn-gradient" style={{ marginTop: '16px', padding: '12px 24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} /> {loading ? "Searching Historical Tickets..." : "Analyze Incident & Retrieve Root Cause"}
            </button>
          </div>

          {/* Results Output */}
          {results && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Concise AI Executive Summary */}
              <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#a5b4fc', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={18} /> AI Concise RCA Executive Summary
                </h3>
                <p style={{ margin: 0, color: '#f1f5f9', lineHeight: '1.6', fontSize: '14px' }}>{results.summary}</p>
              </div>

              {/* Top Historical Matches */}
              <h3 style={{ margin: '8px 0 0 0', color: '#e2e8f0' }}>Top 3 Historical Similar Incidents</h3>
              {results.tickets.map((t) => (
                <div key={t.id} className="glass-card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#f8fafc' }}>{t.id}: {t.title}</span>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#34d399', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      {t.score}% Match
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px', color: '#cbd5e1' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0 }} />
                      <div><strong style={{ color: '#818cf8' }}>Root Cause:</strong> {t.root_cause}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0 }} />
                      <div><strong style={{ color: '#34d399' }}>Resolution:</strong> {t.resolution}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Camera / OCR
      {activeTab === 'camera' && (
        <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
          <h3 style={{ marginTop: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={20} color="#818cf8" /> Live Error Screen / Log Scanner
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>If you cannot type the error, snap a photo of your monitor trace.</p>

          {!isCameraActive ? (
            <button onClick={startCamera} className="btn-gradient" style={{ padding: '10px 20px' }}>Start Camera Stream</button>
          ) : (
            <div>
              <video ref={videoRef} autoPlay style={{ width: '100%', maxHeight: '300px', borderRadius: '8px', backgroundColor: '#000', marginBottom: '12px' }} />
              <br />
              <button onClick={capturePhoto} className="btn-gradient" style={{ padding: '10px 20px' }}>Capture & Extract Text</button>
            </div>
          )}

          {ocrResult && (
            <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid #334155' }}>
              <span style={{ color: '#34d399', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Text Extracted via OCR:</span>
              <p style={{ margin: 0, fontSize: '13px', color: '#cbd5e1', fontFamily: 'monospace' }}>{ocrResult}</p>
              <button
                onClick={() => { setQuery(ocrResult); setActiveTab('rca'); }}
                style={{ marginTop: '12px', background: '#6366f1', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                Transfer to RCA Search Engine <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )} */}

      {/* TAB 3: Interactive Chatbot */}
      {activeTab === 'chat' && (
        <div className="glass-card animate-fade-in" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '480px' }}>
          <h3 style={{ marginTop: 0, color: '#f8fafc', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageSquare size={20} color="#818cf8" /> Interactive RCA Assistant Chat
          </h3>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '8px' }}>
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: msg.sender === 'user' ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(15, 23, 42, 0.9)',
                  border: msg.sender === 'bot' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line'
                }}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <input
              type="text"
              className="glow-input"
              style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', fontSize: '14px' }}
              placeholder="Ask a follow-up troubleshooting step..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="btn-gradient" style={{ padding: '10px 20px' }}>Send</button>
          </form>
        </div>
      )}

      {/* Model Performance Metrics & Feedback Section */}
      <FeedbackAndMetrics />
    </div>
  );
}