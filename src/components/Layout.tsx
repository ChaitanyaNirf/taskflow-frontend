import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Home, LogOut, User, Search, BarChart3, Sun, Moon } from 'lucide-react';

const Sidebar: React.FC = () => {
  const { pathname } = useLocation();

  const getLinkStyle = (path: string) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: pathname === path || (path !== '/' && pathname.startsWith(path)) ? 'rgba(94, 106, 210, 0.15)' : 'transparent',
    color: pathname === path || (path !== '/' && pathname.startsWith(path)) ? 'var(--accent-primary)' : 'var(--text-secondary)',
    transition: 'all 0.2s',
    textDecoration: 'none',
    fontWeight: pathname === path || (path !== '/' && pathname.startsWith(path)) ? 600 : 500,
  });

  return (
    <div className="sidebar">
      <div style={{ padding: '0 1rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '32px', height: '32px', backgroundColor: 'var(--accent-primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>T</div>
        <h2 style={{ fontSize: '1.25rem', letterSpacing: '-0.5px' }}>TaskFlow</h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
        <Link to="/" style={getLinkStyle('/')}>
          <Home size={20} />
          <span>Dashboard</span>
        </Link>
        <Link to="/tasks" style={getLinkStyle('/tasks')}>
          <Search size={20} />
          <span>Tasks</span>
        </Link>
        <Link to="/analytics" style={getLinkStyle('/analytics')}>
          <BarChart3 size={20} />
          <span>Analytics</span>
        </Link>
        <Link to="/profile" style={getLinkStyle('/profile')}>
          <User size={20} />
          <span>Profile</span>
        </Link>
      </nav>
    </div>
  );
};

const TopNav: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="top-nav">
      <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        
        <Link to="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'inherit' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="var(--text-secondary)" />
          </div>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{user?.name}</span>
        </Link>
        
        <button 
          onClick={handleLogout}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.875rem',
            transition: 'color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--danger)'}
          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <TopNav />
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};
