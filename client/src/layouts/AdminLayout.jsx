import { NavLink, Outlet } from 'react-router-dom';
export default function AdminLayout() {
  return (
    <div className="container section dashboard-layout">
      <aside className="dashboard-nav">
        <div className="eyebrow">DREAM&#39;S LIBRARY ADMIN</div>
        <h2>The bookshop.</h2>
        {[
          ['', 'Overview'],
          ['/ebooks', 'eBooks'],
          ['/orders', 'Orders'],
          ['/customers', 'Customers'],
          ['/payments', 'Payments'],
          ['/coupons', 'Coupons'],
        ].map(([path, label]) => (
          <NavLink end to={`/admin${path}`} key={path}>
            {label}
          </NavLink>
        ))}
        <NavLink to="/account">Customer account</NavLink>
      </aside>
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}
