import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  ShieldCheck,
  Zap,
  BookOpen,
  Globe,
  Code,
  Lightbulb,
  Briefcase,
  Palette,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApi } from '../hooks/useApi';
import { api, message } from '../services/api';
import { BookCard, Cover, Loading, ErrorState, SEO } from '../components/UI';
const topics = [
  ['Technology', Code, 'technology', 'Tools for a changing world'],
  ['Personal Growth', Lightbulb, 'personal-growth', 'Become a little more you'],
  ['Business', Briefcase, 'business', 'Ideas worth building on'],
  ['Creativity', Palette, 'creativity', 'See things differently'],
];
export default function Home() {
  function tiltBook(event) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--book-tilt-x', `${(0.5 - (event.clientY - bounds.top) / bounds.height) * 10}deg`);
    event.currentTarget.style.setProperty('--book-tilt-y', `${((event.clientX - bounds.left) / bounds.width - 0.5) * 16}deg`);
  }
  function resetBook(event) {
    event.currentTarget.style.setProperty('--book-tilt-x', '0deg');
    event.currentTarget.style.setProperty('--book-tilt-y', '0deg');
  }
  const books = useApi('/ebooks'),
    [bookOpen, setBookOpen] = useState(false),
    [tab, setTab] = useState('Featured'),
    [email, setEmail] = useState(''),
    [sending, setSending] = useState(false);
  const hero =
    books.data?.find((b) => b.slug === 'the-art-of-deep-focus') ||
    books.data?.find((b) => b.is_bestseller);
  const selection = books.data
    ?.filter((b) =>
      tab === 'Featured' ? b.is_featured : tab === 'Best Sellers' ? b.is_bestseller : true,
    )
    .slice(0, 4);
  async function subscribe(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post('/newsletter', { email });
      toast.success('You’re on the list. Thank you!');
      setEmail('');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="home-page">
      <SEO title="Knowledge That Stays With You" />
      <section className="hero library-hero">
        <img className="library-backdrop" src="/images/library-shelves.png" alt="" fetchPriority="high" />
        <div className="library-light" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> WELCOME TO DREAM’S LIBRARY
            </div>
            <h1>
              Every shelf,
              <br />
              a new <em>possibility.</em>
            </h1>
            <p>
              Step into a world of stories, ideas, and discovery.
              <br className="desktop" /> Find your next favourite read and make a little room for wonder.
            </p>
            <div className="hero-buttons">
              <Link className="button primary" to="/ebooks">
                Browse eBooks <ArrowUpRight size={18} />
              </Link>
              <Link className="text-link" to="/ebooks?sort=popular">
                Explore Best Sellers
              </Link>
            </div>
            <div className="hero-footnote">
              <BookOpen size={18} />
              <span>Thoughtfully selected. Ready whenever you are.</span>
            </div>
          </div>
          <div className="hero-art" onPointerMove={tiltBook} onPointerLeave={resetBook} onPointerCancel={resetBook}>
            {hero && (
              <>
                <div className="hero-orbit" />
                <div className={`hero-book ${bookOpen ? 'is-open' : ''}`}>
                  <div className="hero-book-solid">
                    <div className="hero-book-inside" id="hero-library-story" aria-hidden={!bookOpen}>
                      <span className="inside-kicker">WELCOME TO</span>
                      <strong>Dream’s<br />Library</strong>
                      <span className="inside-rule" />
                      <p>Your little corner of discovery. Explore eBooks about technology, creativity, business, and personal growth.</p>
                      <p>Find your next idea. Build your own library. Keep your curiosity alive.</p>
                      <span className="inside-signoff">A new chapter starts here.</span>
                    </div>
                    <button className="hero-book-front" type="button" onClick={() => setBookOpen(!bookOpen)} aria-expanded={bookOpen} aria-controls="hero-library-story" aria-label={bookOpen ? 'Close the book about Dream’s Library' : 'Open the book to discover Dream’s Library'}>
                      <Cover book={hero} large />
                      <span className="hero-cover-lining" aria-hidden="true" />
                    </button>
                    <span className="hero-book-pages" aria-hidden="true" />
                    <span className="hero-book-back" aria-hidden="true" />
                  </div>
                </div>
                <div className="editor-note">
                  <span>THE EDITOR’S PICK</span>
                  <strong>
                    A quieter mind.
                    <br />A bigger possibility.
                  </strong>
                  <Link to={`/ebook/${hero.slug}`}>
                    Meet your next read <ArrowUpRight size={16} />
                  </Link>
                </div>
                <button className="hero-caption book-toggle" type="button" onClick={() => setBookOpen(!bookOpen)} aria-expanded={bookOpen} aria-controls="hero-library-story">{bookOpen ? 'Close this chapter ↗' : 'Tap the book. Discover our story ↗'}</button>
              </>
            )}
          </div>
        </div>
      </section>
      <div className="trust-strip">
        <div className="container">
          {[
            [Zap, 'Instant access'],
            [ShieldCheck, 'Secure payments'],
            [BookOpen, 'Yours to keep'],
            [Globe, 'Read anywhere'],
          ].map(([Icon, label]) => (
            <span key={label}>
              <Icon size={19} />
              {label}
            </span>
          ))}
        </div>
      </div>
      <section className="section container">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE GOOD STUFF, ALL IN ONE PLACE</div>
            <h2>Find your next “aha”.</h2>
          </div>
          <Link className="text-link" to="/ebooks">
            View all eBooks <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="tabs" role="tablist" aria-label="Book selections">
          {['Featured', 'Best Sellers', 'New Releases'].map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={t === tab}
              className={t === tab ? 'active' : ''}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        {books.loading ? (
          <Loading />
        ) : books.error ? (
          <ErrorState error={books.error} retry={books.reload} />
        ) : (
          <div className="book-grid">
            {selection?.map((b) => (
              <BookCard key={b.id} book={b} />
            ))}
          </div>
        )}
      </section>
      <section className="category-section">
        <div className="container section">
          <div className="section-heading">
            <div>
              <div className="eyebrow">FOLLOW YOUR CURIOSITY</div>
              <h2>There’s a chapter for that.</h2>
            </div>
            <p>What would you like to explore today?</p>
          </div>
          <div className="topic-grid">
            {topics.map(([title, Icon, slug, sub]) => (
              <Link to={`/ebooks?category=${slug}`} className={`topic ${slug}`} key={slug}>
                <Icon size={25} />
                <h3>{title}</h3>
                <p>{sub}</p>
                <ArrowUpRight className="topic-arrow" size={19} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="container section faq-section">
        <div>
          <div className="eyebrow">A FEW THINGS TO KNOW</div>
          <h2>
            Before you turn
            <br />
            the first page.
          </h2>
          <Link className="text-link" to="/contact">
            We’re here to help <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="faq-list">
          {[
            [
              'How do I get my eBook?',
              'After your payment is securely confirmed, your book appears in My Library. You can read it online or download your own copy.',
            ],
            [
              'Can I read on my phone or tablet?',
              'Yes. Our PDF eBooks work on phones, tablets, and computers. Download your copy and use your preferred PDF reader.',
            ],
            [
              'Do my books expire?',
              'Your library access does not expire. Download links are temporary for security; you can request a fresh link from your library.',
            ],
            [
              'What if I need help with an order?',
              'Visit Contact & Support with your order number. If a payment is still confirming, check Orders before trying again.',
            ],
          ].map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <Plus size={18} />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <section className="newsletter container">
        <div>
          <div className="eyebrow">A LITTLE INSPIRATION IN YOUR INBOX</div>
          <h2>Stay curious.</h2>
          <p>New reads, fresh ideas, and the occasional good deal.</p>
        </div>
        <form onSubmit={subscribe}>
          <div>
            <input
              required
              type="email"
              aria-label="Your email address"
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button disabled={sending} className="button primary">
              {sending ? 'Joining…' : 'Count me in'}
            </button>
          </div>
          <small>Only the good stuff. Unsubscribe anytime.</small>
        </form>
      </section>
    </div>
  );
}
