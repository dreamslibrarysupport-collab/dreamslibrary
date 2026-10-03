import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { api, money, date, message, supabase } from '../services/api';
import { SEO, Loading, ErrorState, Empty, Field, Status } from '../components/UI';
export function Overview() {
  const { user } = useAuth(),
    orders = useApi('/orders'),
    library = useApi('/library');
  return (
    <>
      <SEO title="Your account" />
      <h1>Your reading, all together.</h1>
      <div className="stats-grid">
        <div>
          <span>Books in your library</span>
          <strong>{library.data?.length ?? '—'}</strong>
        </div>
        <div>
          <span>Paid orders</span>
          <strong>{orders.data?.filter((o) => o.status === 'paid').length ?? '—'}</strong>
        </div>
      </div>
      <div className="panel">
        <h2>Your account</h2>
        <p>
          {user.full_name}
          <br />
          {user.email}
        </p>
        <Link className="text-link" to="/account/profile">
          Edit profile
        </Link>
      </div>
      <h2>Recent orders</h2>
      <OrderList result={orders} limit={3} />
    </>
  );
}
export function OrderList({ result, limit = 100, admin = false }) {
  if (result.loading) return <Loading />;
  if (result.error) return <ErrorState error={result.error} retry={result.reload} />;
  if (!result.data?.length)
    return (
      <Empty
        title="No orders yet"
        text="Your next great read could be your first."
        action="Find a book"
      />
    );
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {result.data.slice(0, limit).map((o) => (
            <tr key={o.id}>
              <td>{o.order_number}</td>
              <td>{date(o.created_at)}</td>
              <td>{money(o.total)}</td>
              <td>
                <Status value={o.status} />
              </td>
              <td>
                <Link className="text-link" to={`${admin ? '/admin' : '/account'}/orders/${o.id}`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Orders() {
  const result = useApi('/orders');
  return (
    <>
      <SEO title="Your orders" />
      <h1>Your orders.</h1>
      <OrderList result={result} />
    </>
  );
}
export function OrderDetail({ admin = false }) {
  const { id } = useParams(),
    result = useApi(`${admin ? '/admin' : ''}/orders/${id}`),
    cart = useCart();
  useEffect(() => {
    if (result.data?.status !== 'pending') return;
    const timer = setInterval(result.reload, 5000);
    return () => clearInterval(timer);
  }, [result.data?.status, result.reload]);
  if (result.loading && !result.data) return <Loading />;
  if (result.error) return <ErrorState error={result.error} retry={result.reload} />;
  const o = result.data;
  if (!o) return null;
  return (
    <>
      <SEO title={`Order ${o.order_number}`} />
      <h1>{o.order_number}</h1>
      <p>
        {date(o.created_at)} · <Status value={o.status} />
      </p>
      {o.status === 'pending' && (
        <div className="notice">
          {o.callback_verified_at
            ? 'Your payment was submitted. Waiting for the payment provider to confirm it. This page refreshes automatically.'
            : 'This order is awaiting payment. If you already paid, please wait for confirmation before retrying.'}
        </div>
      )}
      <div className="panel">
        <h2>Order details</h2>
        {o.items?.map((b) => (
          <p key={b.id} className="line-item">
            <span>{b.title}</span>
            <strong>{money(b.price)}</strong>
          </p>
        ))}
        <p className="line-item">
          Coupon savings <span>{money(o.discount)}</span>
        </p>
        <p className="line-item">
          <strong>Total paid / due</strong>
          <strong>{money(o.total)}</strong>
        </p>
        {o.payments?.map((p) => (
          <p key={p.razorpay_payment_id}>
            Payment: {p.razorpay_payment_id} · {p.status}
          </p>
        ))}
      </div>
      {o.status === 'paid' && (
        <Link to="/library" className="button primary">
          Open My Library
        </Link>
      )}
      {o.status === 'pending' && !o.callback_verified_at && !admin && (
        <Link
          to="/checkout"
          className="button primary"
          onClick={() => {
            cart.replace(o.items.map((b) => ({ ...b, id: b.ebook_id })));
          }}
        >
          Resume payment
        </Link>
      )}
    </>
  );
}
export function Profile() {
  const { user, setUser } = useAuth(),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.patch('/profile', {
        full_name: new FormData(e.currentTarget).get('full_name'),
      });
      setUser(r.data.data);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SEO title="Profile" />
      <h1>Your profile.</h1>
      <form className="panel narrow" onSubmit={submit}>
        <Field
          label="Full name"
          name="full_name"
          defaultValue={user.full_name}
          required
          minLength={2}
        />
        <Field label="Email" value={user.email} disabled />
        <button className="button primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </>
  );
}
export function Security() {
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: new FormData(e.currentTarget).get('password'),
      });
      if (error) throw error;
      toast.success('Password updated');
      e.target.reset();
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SEO title="Account security" />
      <h1>Account security.</h1>
      <form className="panel narrow" onSubmit={submit}>
        <Field
          label="New password"
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <p className="muted">
          Choose a unique password with at least eight characters. Supabase may ask you to
          reauthenticate.
        </p>
        <button className="button primary" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </>
  );
}
