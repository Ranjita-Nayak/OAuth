import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { axiosClient } from '../api/axiosClient';
import { GlassCard } from '../components/GlassCard';
import { ShieldCheck, Users, Activity, Lock, Database } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [secureData, setSecureData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSecureData = async () => {
      try {
        const response = await axiosClient.get('/api/protected/test');
        setSecureData(response.data);
      } catch (err: any) {
        setError('Failed to fetch protected data.');
      }
    };

    fetchSecureData();
  }, []);

  if (!user) return null;

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h2 className="text-gradient" style={{ margin: 0 }}>Dashboard Overview</h2>
        <p>Welcome back, {user.username}. Here's your system status.</p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <GlassCard style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: 'var(--accent-primary)' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Active Sessions</p>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>3</h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', color: 'var(--success)' }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>Security Score</p>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>A+</h3>
            </div>
          </div>
        </GlassCard>

        <GlassCard style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '12px', color: 'var(--accent-secondary)' }}>
              <Activity size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>API Latency</p>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>12ms</h3>
            </div>
          </div>
        </GlassCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        <GlassCard>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Lock size={20} color="var(--accent-primary)" /> Security Status
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>JWT Token Status</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Valid</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Refresh Token</span>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>Secure (HttpOnly)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Current Role</span>
              <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{user.role}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Database size={20} color="var(--accent-secondary)" /> Raw Backend Data
          </h3>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>Data fetched securely from <code>/api/protected/test</code></p>
          
          {error ? (
            <div className="alert alert-error">{error}</div>
          ) : secureData ? (
            <pre style={{ padding: '1rem', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', overflowX: 'auto', fontSize: '0.875rem', maxHeight: '200px' }}>
              {JSON.stringify(secureData, null, 2)}
            </pre>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Loading protected data...</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
