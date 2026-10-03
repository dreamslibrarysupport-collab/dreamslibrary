import { Link, useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { BookCard, Loading, Empty, ErrorState, SEO } from '../components/UI';
export default function Catalog() {
  const [params, setParams] = useSearchParams();
  const books = useApi(`/ebooks?${params}`),
    categories = useApi('/categories');
  const set = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  return (
    <section className="container section">
      <SEO title="Explore eBooks" />
      <div className="eyebrow">YOUR NEXT CHAPTER</div>
      <h1 className="page-title">
        A world of ideas.
        <br />
        <em>One good book away.</em>
      </h1>
      <p className="lead">Explore thoughtful reads for work, creativity, and everyday life.</p>
      <div className="catalog-layout">
        <aside className="filters">
          <h3>
            <SlidersHorizontal size={18} /> Refine your shelf
          </h3>
          <label>
            Search
            <div className="search-field">
              <Search size={18} />
              <input
                placeholder="Title or author"
                value={params.get('search') || ''}
                onChange={(e) => set('search', e.target.value)}
              />
            </div>
          </label>
          <label>
            Category
            <select
              value={params.get('category') || ''}
              onChange={(e) => set('category', e.target.value)}
            >
              <option value="">All categories</option>
              {categories.data?.map((c) => (
                <option value={c.slug} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Price
            <select
              value={params.get('maxPrice') || ''}
              onChange={(e) => set('maxPrice', e.target.value)}
            >
              <option value="">Any price</option>
              <option value="30000">Under ₹300</option>
              <option value="50000">Under ₹500</option>
              <option value="100000">Under ₹1,000</option>
            </select>
          </label>
          <label>
            Language
            <select
              value={params.get('language') || ''}
              onChange={(e) => set('language', e.target.value)}
            >
              <option value="">All languages</option>
              <option>English</option>
              <option>Hindi</option>
            </select>
          </label>
          <button className="text-link" onClick={() => setParams({})}>
            Clear filters
          </button>
        </aside>
        <div>
          <div className="catalog-toolbar">
            <span>{books.meta?.total ?? '…'} books to discover</span>
            <label>
              Sort by{' '}
              <select
                aria-label="Sort books"
                value={params.get('sort') || 'newest'}
                onChange={(e) => set('sort', e.target.value)}
              >
                <option value="newest">Newest arrivals</option>
                <option value="popular">Popular</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
          </div>
          {books.loading ? (
            <Loading />
          ) : books.error ? (
            <ErrorState error={books.error} retry={books.reload} />
          ) : books.data?.length ? (
            <div className="book-grid catalog-books">
              {books.data.map((b) => (
                <BookCard key={b.id} book={b} />
              ))}
            </div>
          ) : (
            <Empty
              title="No books on this shelf yet"
              text="Try a different search or clear your filters."
            />
          )}
          <div className="pagination">
            <button
              className="button secondary"
              disabled={Number(params.get('page') || 1) <= 1}
              onClick={() => set('page', String(Number(params.get('page') || 1) - 1))}
            >
              Previous
            </button>
            <span>Page {params.get('page') || 1}</span>
            <button
              className="button secondary"
              disabled={Number(params.get('page') || 1) * 12 >= (books.meta?.total || 0)}
              onClick={() => set('page', String(Number(params.get('page') || 1) + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
export function Categories() {
  const result = useApi('/categories');
  return (
    <section className="container section">
      <SEO title="Categories" />
      <h1 className="page-title">Follow your curiosity.</h1>
      {result.loading ? (
        <Loading />
      ) : result.error ? (
        <ErrorState error={result.error} retry={result.reload} />
      ) : (
        <div className="topic-grid">
          {result.data?.map((c) => (
            <Link className={`topic ${c.slug}`} to={`/ebooks?category=${c.slug}`} key={c.id}>
              <h2>{c.name}</h2>
              <p>{c.description || 'Find a fresh perspective.'}</p>
              <span className="text-link">Explore books</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
