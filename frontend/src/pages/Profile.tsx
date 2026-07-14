import React from 'react';
import { useAuth } from '../context/AuthContext';
import { GlassCard } from '../components/GlassCard';
import { User as UserIcon, Mail, Shield, CheckCircle2 } from 'lucide-react';

export const Profile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h2 className="text-gradient" style={{ marginBottom: '2rem' }}>User Profile</h2>
      
      <div style={{ display: 'grid', gap: '2rem' }}>
        <GlassCard>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '2rem' }}>
            <div style={{ 
              width: '80px', height: '80px', 
              borderRadius: '50%', 
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)'
            }}>
              <UserIcon size={40} color="white" />
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>{user.username}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <Mail size={16} /> {user.email}
              </div>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <span style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.25rem 0.75rem', background: 'rgba(139, 92, 246, 0.1)',
                  color: 'var(--accent-secondary)', borderRadius: '999px', fontSize: '0.875rem', fontWeight: 600
                }}>
                  <Shield size={14} /> {user.role}
                </span>
                
                <span style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.25rem',
                  padding: '0.25rem 0.75rem', background: 'rgba(34, 197, 94, 0.1)',
                  color: 'var(--success)', borderRadius: '999px', fontSize: '0.875rem'
                }}>
                  <CheckCircle2 size={14} /> Account Active
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <h3 style={{ marginBottom: '1.5rem' }}>Account Details</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>User ID</span>
              <span style={{ fontFamily: 'monospace' }}>{user.id}</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Authentication Method</span>
              <span>Local Credentials</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>MFA Status</span>
              <span style={{ color: 'var(--error)' }}>Not Enabled</span>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
