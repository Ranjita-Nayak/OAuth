import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { axiosClient } from '../api/axiosClient';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { LogIn, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axiosClient.post('/api/auth/login', { username, password });
      // API returns token details.
      const { accessToken } = response.data;
      
      login(accessToken, {
        id: '1',
        username: username,
        email: 'user@local',
        role: 'User'
      });
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
      // Direct the browser to the backend challenge endpoint
      window.location.href = 'https://localhost:7059/api/auth/google-login';
  }

  return (
    <div className="container flex-center" style={{ flex: 1, minHeight: '100vh' }}>
      <GlassCard className="w-full max-w-md" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 className="text-gradient">Welcome Back</h2>
          <p>Sign in to access your dashboard</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <Input 
            label="Username" 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Enter your username"
          />
          <Input 
            label="Password" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          
          <Button type="submit" isLoading={isLoading} style={{ width: '100%', marginTop: '1rem' }}>
            <LogIn size={18} /> Sign In
          </Button>
        </form>

        <div style={{ margin: '1.5rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <span style={{ padding: '0 10px', background: 'var(--glass-bg)', position: 'relative', zIndex: 1 }}>OR</span>
          <hr style={{ border: 'none', borderTop: '1px solid var(--glass-border)', marginTop: '-12px' }} />
        </div>

        <Button variant="secondary" onClick={handleGoogleLogin} style={{ width: '100%' }}>
          <svg style={{ width: '18px', height: '18px', marginRight: '8px' }} viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
          Don't have an account? <Link to="/register">Create one</Link>
        </div>
      </GlassCard>
    </div>
  );
};
