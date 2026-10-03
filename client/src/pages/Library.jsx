import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApi } from '../hooks/useApi';
import { api, message, date } from '../services/api';
import { Cover, SEO, Loading, Empty, ErrorState } from '../components/UI';
import { RateBook } from '../components/BookRating';
export default function Library() {
  const result = useApi('/library'),
    [busy, setBusy] = useState(null);
  async function download(id) {
    setBusy(id);
    try {
      const r = await api.post(`/library/${id}/download`);
      const a = document.createElement('a');
      a.href = r.data.data.url;
      a.rel = 'noreferrer';
      a.click();
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="container section">
      <SEO title="My Library" />
      <div className="eyebrow">YOUR IDEAS LIVE HERE</div>
      <h1 className="page-title">Your personal bookshelf.</h1>
      <p className="lead">Pick up a good book. Pick up where you left off.</p>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState error={result.error} retry={result.reload} />
      ) : !result.data?.length ? (
        <Empty
          title="Make yourself a little library"
          text="Once your first purchase is confirmed, your books will be waiting right here."
          action="Find your first read"
        />
      ) : (
        <div className="book-grid">
          {result.data.map((b) => (
            <article className="library-card" key={b.id}>
              <Cover book={b} />
              <h2>{b.title}</h2>
              <p>Purchased {date(b.purchased_at)}</p>
              <Link className="button primary wide" to={`/reader/${b.ebook_id}`}>
                Read book
              </Link>
              <button
                className="button secondary wide"
                disabled={busy === b.ebook_id}
                onClick={() => download(b.ebook_id)}
              >
                {busy === b.ebook_id ? 'Preparing download…' : 'Download book'}
              </button>
              <RateBook ebookId={b.ebook_id} title={b.title} initialRating={b.my_rating} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
export function Reader() {
  const { ebookId } = useParams(),
    [url, setUrl] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      const r = await api.post(`/library/${ebookId}/access`);
      setUrl(r.data.data.url);
      setError('');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    api
      .post(`/library/${ebookId}/access`)
      .then((r) => {
        if (active) setUrl(r.data.data.url);
      })
      .catch((e) => {
        if (active) setError(message(e));
      });
    return () => {
      active = false;
    };
  }, [ebookId]);
  return (
    <section className="container section">
      <SEO title="Your reading room" />
      <div className="section-heading">
        <Link to="/library" className="text-link">
          Back to My Library
        </Link>
        <button className="button secondary" disabled={busy} onClick={load}>
          {busy ? 'Refreshing…' : 'Refresh access'}
        </button>
      </div>
      {error ? (
        <ErrorState error={error} retry={load} />
      ) : url ? (
        <>
          <p className="muted">
            If the preview does not appear,{' '}
            <a href={url} target="_blank" rel="noreferrer">
              open the PDF reader
            </a>
            . Refresh access if the temporary link expires.
          </p>
          <iframe
            className="pdf-reader"
            title="Purchased eBook PDF reader"
            src={url}
            referrerPolicy="no-referrer"
          />
        </>
      ) : (
        <Loading />
      )}
    </section>
  );
}
