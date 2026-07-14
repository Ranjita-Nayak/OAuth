import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Button';
import { ShieldCheck, User as UserIcon, LayoutDashboard, LogOut } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav style={{
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '1rem 0'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem' }}>
            <ShieldCheck style={{ color: 'var(--accent-primary)' }} />
            AuthPortal
          </Link>
          
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <Link 
              to="/dashboard" 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: location.pathname === '/dashboard' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: location.pathname === '/dashboard' ? 600 : 400
              }}
            >
              <LayoutDashboard size={18} /> Dashboard
            </Link>
            <Link 
              to="/profile" 
              style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                color: location.pathname === '/profile' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontWeight: location.pathname === '/profile' ? 600 : 400
              }}
            >
              <UserIcon size={18} /> Profile
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{user.username}</span>
          </div>
          <Button variant="secondary" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </div>
    </nav>
  );
};
