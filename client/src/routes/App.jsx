import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading, ErrorState } from '../components/UI';
import StoreLayout from '../layouts/StoreLayout';
const Home = lazy(() => import('../pages/Home'));
const Catalog = lazy(() => import('../pages/Catalog'));
const Categories = lazy(() => import('../pages/Catalog').then((m) => ({ default: m.Categories })));
const Book = lazy(() => import('../pages/BookDetail'));
const Auth = lazy(() => import('../pages/Auth'));
const Cart = lazy(() => import('../pages/Cart'));
const Checkout = lazy(() => import('../pages/Checkout'));
const Library = lazy(() => import('../pages/Library'));
const Reader = lazy(() => import('../pages/Library').then((m) => ({ default: m.Reader })));
const AccountLayout = lazy(() => import('../layouts/AccountLayout'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const Info = lazy(() => import('../pages/Information'));
const AdminDemo = import.meta.env.DEV ? lazy(() => import('../pages/AdminDemo')) : null;
const account = (name) =>
  lazy(() => import('../pages/Account').then((m) => ({ default: m[name] })));
const Overview = account('Overview'),
  Orders = account('Orders'),
  OrderDetail = account('OrderDetail'),
  Profile = account('Profile'),
  Security = account('Security');
const admin = (name) => lazy(() => import('../pages/Admin').then((m) => ({ default: m[name] })));
const AdminDashboard = admin('AdminDashboard'),
  AdminBooks = admin('AdminBooks'),
  AdminBookEditor = admin('AdminBookEditor'),
  AdminOrders = admin('AdminOrders'),
  AdminCustomers = admin('AdminCustomers'),
  AdminCustomer = admin('AdminCustomer'),
  AdminPayments = admin('AdminPayments'),
  AdminCoupons = admin('AdminCoupons');
function Protected({ children, admin = false }) {
  const { user, loading, error } = useAuth(),
    location = useLocation();
  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;
  if (!user)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (admin && user.role !== 'admin') return <ErrorState error="Administrator access required." />;
  return children;
}
export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <Suspense
      fallback={
        <div className="container section">
          <Loading />
        </div>
      }
    >
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          {import.meta.env.DEV && <Route path="admin-demo" element={<AdminDemo />} />}
          <Route path="ebooks" element={<Catalog />} />
          <Route path="categories" element={<Categories />} />
          <Route path="ebook/:slug" element={<Book />} />
          {['login', 'register', 'forgot-password', 'reset-password'].map((path) => (
            <Route key={path} path={path} element={<Auth />} />
          ))}
          <Route path="cart" element={<Cart />} />
          <Route
            path="checkout"
            element={
              <Protected>
                <Checkout />
              </Protected>
            }
          />
          <Route
            path="library"
            element={
              <Protected>
                <Library />
              </Protected>
            }
          />
          <Route
            path="reader/:ebookId"
            element={
              <Protected>
                <Reader />
              </Protected>
            }
          />
          <Route
            path="account"
            element={
              <Protected>
                <AccountLayout />
              </Protected>
            }
          >
            <Route index element={<Overview />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="security" element={<Security />} />
          </Route>
          <Route
            path="admin"
            element={
              <Protected admin>
                <AdminLayout />
              </Protected>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="ebooks" element={<AdminBooks />} />
            <Route path="ebooks/new" element={<AdminBookEditor />} />
            <Route path="ebooks/:id/edit" element={<AdminBookEditor />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<OrderDetail admin />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="customers/:id" element={<AdminCustomer />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="coupons" element={<AdminCoupons />} />
          </Route>
          {['about', 'contact', 'privacy', 'terms', 'refund-policy'].map((path) => (
            <Route path={path} key={path} element={<Info />} />
          ))}
          <Route path="*" element={<Info />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
