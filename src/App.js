import React, { useState } from 'react';
import './App.css';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup'

  // If user is not logged in, switch between Login and Signup screens
  if (!user) {
    return authView === 'login' ? (
      <Login 
        onLogin={(userData) => setUser(userData)} 
        switchToSignup={() => setAuthView('signup')} 
      />
    ) : (
      <Signup 
        onSignup={(userData) => setUser(userData)} 
        switchToLogin={() => setAuthView('login')} 
      />
    );
  }

  // Render Dashboard when user is logged in
  return (
    <Dashboard 
      user={user} 
      onLogout={() => setUser(null)} 
    />
  );
}