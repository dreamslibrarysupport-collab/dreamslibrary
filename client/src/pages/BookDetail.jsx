import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, ShieldCheck, Zap } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { asset, money } from '../services/api';
import { Cover, BookCard, SEO, Loading, ErrorState } from '../components/UI';
import { BookRating, RateBook } from '../components/BookRating';
export default function BookDetail() {
  const { slug } = useParams(),
    result = useApi(`/ebooks/${slug}`),
    { user } = useAuth(),
    owned = useApi(user ? '/library' : null),
    related = useApi(result.data ? `/ebooks?category=${result.data.category_slug}` : null),
    cart = useCart(),
    navigate = useNavigate();
  if (result.loading)
    return (
      <div className="container section">
        <Loading />
      </div>
    );
  if (result.error)
    return (
      <div className="container section">
        <ErrorState error={result.error} retry={result.reload} />
      </div>
    );
  const b = result.data,
    isOwned = owned.data?.some((x) => x.ebook_id === b.id);
  return (
    <section className="container section">
      <SEO title={b.title} description={b.short_description} />
      <div className="breadcrumbs">
        <Link to="/ebooks">eBooks</Link> /{' '}
        <Link to={`/ebooks?category=${b.category_slug}`}>{b.category}</Link> / {b.title}
      </div>
      <div className="detail-grid">
        <div className="detail-cover">
          <Cover book={b} large />
        </div>
        <div>
          <span className="eyebrow">{b.category}</span>
          <h1 className="page-title">{b.title}</h1>
          <p className="lead">by {b.author}</p>
          <BookRating book={b} />
          <p className="description">{b.short_description}</p>
          <div className="detail-price">
            <strong>{money(b.price)}</strong>
            <del>{money(b.original_price)}</del>
            <span className="status paid">
              Save {Math.round((1 - b.price / b.original_price) * 100)}%
            </span>
          </div>
          <div className="detail-buttons">
            {isOwned ? (
              <Link to="/library" className="button primary">
                Already in your library
              </Link>
            ) : (
              <>
                <button
                  className="button primary"
                  onClick={() => {
                    cart.add(b);
                    navigate('/checkout');
                  }}
                >
                  Buy now
                </button>
                <button className="button secondary" onClick={() => cart.add(b)}>
                  Add to cart
                </button>
              </>
            )}
          </div>
          <div className="detail-assurance">
            <span>
              <ShieldCheck size={16} /> Secure checkout
            </span>
            <span>
              <Zap size={16} /> Digital delivery
            </span>
          </div>
          <div className="facts">
            {[
              ['Language', b.language],
              ['Length', `${b.pages} pages`],
              ['Format', 'PDF'],
              ['Published', b.publication_date || 'Not specified'],
            ].map(([k, v]) => (
              <div key={k}>
                <small>{k}</small>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          {asset(b.sample_path, 'book-samples') ? (
            <a
              className="text-link"
              href={asset(b.sample_path, 'book-samples')}
              target="_blank"
              rel="noreferrer"
            >
              Read a free sample
            </a>
          ) : (
            <p className="muted">A sample is not available for this title yet.</p>
          )}
        </div>
      </div>
      <div className="book-about">
        <div>
          <h2>About this book</h2>
          <p className="preserve-lines">{b.description}</p>
        </div>
        <div>
          <h2>What you’ll take away</h2>
          {b.learning_points?.length ? (
            b.learning_points.map((p) => (
              <p key={p}>
                <Check size={16} /> {p}
              </p>
            ))
          ) : (
            <p>Explore the description for the topics covered in this book.</p>
          )}
        </div>
      </div>
      <div className="section-heading">
        <h2>Keep your curiosity going.</h2>
        <Link className="text-link" to="/ebooks">
          Browse all books
        </Link>
      </div>
      <div className="book-grid">
        {related.data
          ?.filter((x) => x.id !== b.id)
          .slice(0, 4)
          .map((x) => (
            <BookCard book={x} key={x.id} />
          ))}
      </div>
      <section className="review-placeholder" aria-label="Reader ratings">
        <h3>Ratings from verified buyers</h3>
        <BookRating book={b} />
        {isOwned ? (
          <RateBook
            key={b.id}
            ebookId={b.id}
            title={b.title}
            initialRating={owned.data.find((x) => x.ebook_id === b.id)?.my_rating}
          />
        ) : (
          <p>
            Purchase this book to share your rating. Each buyer contributes one rating and can
            update it later.
          </p>
        )}
      </section>
    </section>
  );
}
