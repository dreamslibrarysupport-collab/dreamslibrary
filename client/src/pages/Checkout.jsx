import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api, loadCheckout, message, money } from '../services/api';
import { SEO, Empty, ErrorState } from '../components/UI';
export default function Checkout() {
  const { items, clear } = useCart(),
    { user } = useAuth(),
    navigate = useNavigate(),
    [coupon, setCoupon] = useState(''),
    [quote, setQuote] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [validating, setValidating] = useState(false);
  const ids = items.map((b) => b.id).join(',');
  useEffect(() => {
    let active = true;
    setQuote(null);
    if (!ids) return;
    setValidating(true);
    api
      .post('/cart/validate', { ebookIds: ids.split(','), coupon: '' })
      .then((r) => {
        if (active) {
          setQuote(r.data.data);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(message(e));
      })
      .finally(() => {
        if (active) setValidating(false);
      });
    return () => {
      active = false;
    };
  }, [ids]);
  async function apply() {
    setValidating(true);
    setQuote(null);
    try {
      const r = await api.post('/coupons/validate', { ebookIds: items.map((b) => b.id), coupon });
      setQuote(r.data.data);
      setError('');
      toast.success('Order total updated');
    } catch (e) {
      setError(message(e));
    } finally {
      setValidating(false);
    }
  }
  async function pay() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await loadCheckout();
      const r = await api.post('/payments/create-order', {
        ebookIds: items.map((b) => b.id),
        coupon,
      });
      const order = r.data.data;
      const checkout = new window.Razorpay({
        key: order.key,
        amount: order.total,
        currency: order.currency,
        order_id: order.razorpay_order_id,
        name: 'Dream\'s Library',
        description: `Order ${order.order_number}`,
        prefill: { name: user.full_name, email: user.email },
        theme: { color: '#152e45' },
        modal: {
          ondismiss: () => {
            setBusy(false);
            navigate(`/account/orders/${order.id}`);
          },
        },
        handler: async (response) => {
          try {
            await api.post('/payments/verify', { orderId: order.id, ...response });
            clear();
            toast.success('Payment submitted. Confirming your books…');
            navigate(`/account/orders/${order.id}`);
          } catch (e) {
            toast.error(message(e));
            navigate(`/account/orders/${order.id}`);
          } finally {
            setBusy(false);
          }
        },
      });
      checkout.on('payment.failed', () => {
        toast.error('Payment did not complete. You can retry the same order.');
        setBusy(false);
      });
      checkout.open();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <section className="container section">
      <SEO title="Secure checkout" />
      <h1 className="page-title">One step from your next chapter.</h1>
      {!items.length ? (
        <Empty
          title="Your bag is empty"
          text="Choose a book to start reading."
          action="Browse eBooks"
        />
      ) : (
        <div className="cart-layout">
          <div className="panel">
            <h2>Your details</h2>
            <p>
              {user.full_name}
              <br />
              {user.email}
            </p>
            <h2>Your books</h2>
            {items.map((b) => (
              <p className="line-item" key={b.id}>
                <span>{b.title}</span>
                <strong>{money(quote?.books.find((x) => x.id === b.id)?.price || b.price)}</strong>
              </p>
            ))}
            <Link className="text-link" to="/cart">
              Edit your bag
            </Link>
            <p className="muted">
              Your books become available after secure payment confirmation. You can follow your
              order’s status in your account.
            </p>
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <label className="field">
              Coupon code
              <div className="coupon-row">
                <input
                  value={coupon}
                  onChange={(e) => {
                    setCoupon(e.target.value.toUpperCase());
                    setQuote(null);
                  }}
                  placeholder="Enter code"
                />
                <button className="button secondary" disabled={busy || validating} onClick={apply}>
                  Apply
                </button>
              </div>
            </label>
            {error && <ErrorState error={error} />}
            <p>
              <span>Subtotal</span>
              <span>{quote ? money(quote.subtotal) : '—'}</span>
            </p>
            <p>
              <span>Coupon savings</span>
              <span>{quote ? money(quote.discount) : '—'}</span>
            </p>
            <p className="summary-total">
              <span>Total</span>
              <strong>{quote ? money(quote.total) : '—'}</strong>
            </p>
            <button
              className="button primary wide"
              disabled={busy || validating || !quote}
              onClick={pay}
            >
              {busy ? 'Processing payment…' : validating ? 'Confirming prices…' : 'Pay Securely'}
            </button>
            <small>
              By continuing, you agree to our <Link to="/terms">Terms</Link> and{' '}
              <Link to="/refund-policy">Refund Policy</Link>.
            </small>
          </aside>
        </div>
      )}
    </section>
  );
}
