import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ShoppingBag, ArrowUpRight } from 'lucide-react';
import { asset, money } from '../services/api';
import { useCart } from '../context/CartContext';
import { BookRating } from './BookRating';
export function SEO({ title, description = 'Discover premium eBooks and start learning today.' }) {
  useEffect(() => {
    document.title = `${title} | Dream's Library`;
    const set = (selector, attrs) => {
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement(attrs.rel ? 'link' : 'meta');
        document.head.append(el);
      }
      Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    };
    set('meta[name="description"]', { name: 'description', content: description });
    set('meta[property="og:title"]', { property: 'og:title', content: `${title} | Dream's Library` });
    set('meta[property="og:description"]', { property: 'og:description', content: description });
    const url =
      (import.meta.env.VITE_SITE_URL || window.location.origin) + window.location.pathname;
    set('link[rel="canonical"]', { rel: 'canonical', href: url });
    set('meta[property="og:url"]', { property: 'og:url', content: url });
  }, [title, description]);
  return null;
}
export function Cover({ book, large = false }) {
  const src = asset(book.cover_path);
  return src ? (
    <img
      className={`book-cover ${large ? 'large' : ''}`}
      src={src}
      alt={`${book.title} cover`}
      loading="lazy"
    />
  ) : (
    <div
      className={`book-cover typographic ${book.category_slug || 'personal-growth'} ${large ? 'large' : ''}`}
      role="img"
      aria-label={`${book.title}, placeholder cover`}
    >
      <span className="cover-edition">
        DREAM&#39;S LIBRARY EDITIONS <span>01 / 26</span>
      </span>
      <span className="cover-title">{book.title}</span>
      <span className="cover-rule" />
      <span className="cover-subtitle">
        A field guide for
        <br />a curious mind.
      </span>
      <span className="cover-author">{book.author}</span>
    </div>
  );
}
export function BookCard({ book, owned = false }) {
  const cart = useCart();
  return (
    <article className="book-card">
      <Link to={`/ebook/${book.slug}`} className="cover-wrap">
        <Cover book={book} />
        {book.is_bestseller && <span className="book-badge">BESTSELLER</span>}
        <span className="cover-view">
          View book <ArrowUpRight size={16} />
        </span>
      </Link>
      <div className="book-meta">
        <span>{book.category}</span>
      </div>
      <Link className="book-title" to={`/ebook/${book.slug}`}>
        {book.title}
      </Link>
      <p className="book-author">{book.author}</p>
      <BookRating book={book} />
      <div className="book-bottom">
        <div>
          <strong>{money(book.price)}</strong> <del>{money(book.original_price)}</del>
          <small className="discount">
            {Math.round((1 - book.price / book.original_price) * 100)}% off
          </small>
        </div>
        {owned ? (
          <Link to="/library" className="icon-button" aria-label="Already in your library">
            <BookOpen size={19} />
          </Link>
        ) : (
          <button
            className="icon-button"
            onClick={() => cart.add(book)}
            aria-label={`Add ${book.title} to cart`}
          >
            <ShoppingBag size={18} />
          </button>
        )}
      </div>
      <Link
        className="buy-link"
        to={owned ? '/library' : '/checkout'}
        onClick={() => !owned && cart.add(book)}
      >
        {owned ? 'Already in your library' : 'Buy now'}
      </Link>
    </article>
  );
}
export function Loading() {
  return (
    <div className="skeleton-grid" aria-label="Loading" aria-busy="true">
      {[1, 2, 3, 4].map((n) => (
        <div className="skeleton" key={n} />
      ))}
    </div>
  );
}
export function Empty({ title, text, action, to = '/ebooks' }) {
  return (
    <div className="empty">
      <BookOpen size={36} />
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <Link className="button primary" to={to}>
          {action}
        </Link>
      )}
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="error" role="alert">
      <p>{error}</p>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children || <input {...props} />}
    </label>
  );
}
export function Status({ value }) {
  return <span className={`status ${value}`}>{value}</span>;
}
