import { useState, useId } from 'react';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, message } from '../services/api';

export function BookRating({ book }) {
  const count = Number(book.rating_count || 0),
    average = Number(book.average_rating || 0),
    buyers = Number(book.purchase_count || 0);
  return (
    <div className="book-rating-summary">
      <div className="rating-average">
        <span className="rating-stars" aria-hidden="true">
          <span>☆☆☆☆☆</span>
          <span className="rating-stars-fill" style={{ width: `${(average / 5) * 100}%` }}>
            ★★★★★
          </span>
        </span>
        <span>
          {count
            ? `${average.toFixed(1)}/5 · ${count} ${count === 1 ? 'rating' : 'ratings'}`
            : 'No ratings yet'}
        </span>
      </div>
      <span className="purchase-count">
        {buyers.toLocaleString()} {buyers === 1 ? 'customer has' : 'customers have'} purchased
      </span>
    </div>
  );
}

export function RateBook({ ebookId, title, initialRating = null, onSaved }) {
  const [rating, setRating] = useState(initialRating || 0),
    [saved, setSaved] = useState(initialRating || 0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const name = useId();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post(`/library/${ebookId}/rating`, { rating });
      setSaved(rating);
      toast.success('Your rating is published. Thank you!');
      window.dispatchEvent(new Event('folio:ratings-updated'));
      onSaved?.();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="rate-book" onSubmit={submit}>
      <fieldset disabled={busy}>
        <legend>
          {saved ? 'Your rating' : 'Rate this book'}
          <span className="sr-only">: {title}</span>
        </legend>
        <div className="rating-options">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={value <= rating ? 'selected' : ''}>
              <input
                type="radio"
                name={name}
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
              />
              <Star size={23} aria-hidden="true" fill={value <= rating ? 'currentColor' : 'none'} />
            </label>
          ))}
        </div>
      </fieldset>
      <span className="rating-choice" aria-live="polite">
        {rating ? `${rating} out of 5 stars` : 'Choose 1 to 5 stars'}
      </span>
      <button className="button secondary wide" disabled={busy || !rating || rating === saved}>
        {busy ? 'Saving…' : saved ? 'Update rating' : 'Submit rating'}
      </button>
      {error && (
        <p role="alert" className="rating-error">
          {error}
        </p>
      )}
    </form>
  );
}
