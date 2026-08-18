import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

export default function Login({ onLogin, switchToSignup }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email && password) {
      onLogin({ email });
    }
  };

  const handleQuickDemo = () => {
    setEmail('engineer@cognizant.com');
    setPassword('demo1234');
    onLogin({ email: 'engineer@cognizant.com' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '36px' }}>
        
        {/* Animated Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)' }}>
            <ShieldCheck size={28} color="#ffffff" />
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Engineer Portal <Sparkles size={18} color="#a855f7" />
          </h2>
          <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>AI Incident Root Cause Analysis Engine</p>
        </div>

        {/* Input Form with Icons */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
              Work Email Address
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="email"
                required
                className="glow-input"
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="engineer@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="password"
                required
                className="glow-input"
                style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn-gradient" style={{ padding: '12px', fontSize: '14px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            Login to Dashboard <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Demo Login Button */}
        <button
          onClick={handleQuickDemo}
          style={{ width: '100%', marginTop: '12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#a5b4fc', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <Sparkles size={16} color="#818cf8" /> Auto-fill & Quick Demo Login
        </button>

        {/* Switch to Signup */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: '#94a3b8' }}>
          Don't have an account?{' '}
          <span onClick={switchToSignup} style={{ color: '#818cf8', cursor: 'pointer', fontWeight: '600' }}>
            Register here
          </span>
        </div>

      </div>
    </div>
  );
}