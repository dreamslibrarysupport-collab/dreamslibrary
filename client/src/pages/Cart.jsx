import { Link } from 'react-router-dom';
import { Trash2, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { money } from '../services/api';
import { Cover, Empty, SEO } from '../components/UI';
export default function Cart() {
  const { items, remove } = useCart(),
    { user } = useAuth(),
    library = useApi(user ? '/library' : null);
  const subtotal = items.reduce((s, b) => s + Number(b.original_price || b.price), 0),
    total = items.reduce((s, b) => s + Number(b.price), 0);
  return (
    <section className="container section">
      <SEO title="Your book bag" />
      <div className="eyebrow">SAVE A PLACE FOR A GOOD IDEA</div>
      <h1 className="page-title">Your book bag.</h1>
      {!items.length ? (
        <Empty
          title="A good read is waiting"
          text="Add a book or two and make room for a new perspective."
          action="Explore eBooks"
        />
      ) : (
        <div className="cart-layout">
          <div>
            {items.map((b) => (
              <article className="cart-row" key={b.id}>
                <Cover book={b} />
                <div>
                  <Link to={`/ebook/${b.slug}`}>
                    <h3>{b.title}</h3>
                  </Link>
                  <p>{b.author}</p>
                  <small>PDF · {b.language || 'English'}</small>
                  {library.data?.some((x) => x.ebook_id === b.id) && (
                    <p className="notice">Already in your library. Remove this book to continue.</p>
                  )}
                </div>
                <strong>{money(b.price)}</strong>
                <button
                  className="icon-button"
                  aria-label={`Remove ${b.title}`}
                  onClick={() => remove(b.id)}
                >
                  <Trash2 size={18} />
                </button>
              </article>
            ))}
          </div>
          <aside className="summary">
            <h2>Order summary</h2>
            <p>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </p>
            <p>
              <span>Book savings</span>
              <span>−{money(subtotal - total)}</span>
            </p>
            <p className="summary-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </p>
            <small>Final prices and coupons are confirmed at checkout.</small>
            <Link className="button primary wide" to="/checkout">
              Continue to checkout
            </Link>
            <div className="detail-assurance">
              <ShieldCheck size={16} /> Secure payment with Razorpay
            </div>
            <Link className="text-link" to="/ebooks">
              Keep exploring
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
