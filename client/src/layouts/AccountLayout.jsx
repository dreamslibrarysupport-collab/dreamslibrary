import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function AccountLayout() {
  const { user, signOut } = useAuth(),
    navigate = useNavigate();
  return (
    <div className="container section dashboard-layout">
      <aside className="dashboard-nav">
        <div className="eyebrow">YOUR DREAM&#39;S LIBRARY</div>
        <h2>Hello, {user?.full_name?.split(' ')[0] || 'reader'}.</h2>
        {[
          ['/account', 'Overview'],
          ['/library', 'My Library'],
          ['/account/orders', 'Orders'],
          ['/account/profile', 'Profile'],
          ['/account/security', 'Security'],
          ...(user?.role === 'admin' ? [['/admin', 'Admin dashboard']] : []),
        ].map(([to, label]) => (
          <NavLink end key={to} to={to}>
            {label}
          </NavLink>
        ))}
        <button
          onClick={async () => {
            await signOut();
            navigate('/');
          }}
        >
          Log out
        </button>
      </aside>
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}
