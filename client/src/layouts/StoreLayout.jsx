import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BookOpen, Search, ShoppingBag, Menu, X, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
export default function StoreLayout() {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  const { items } = useCart(),
    { user } = useAuth(),
    navigate = useNavigate();
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        Big ideas. Small prices. <span>Your next chapter starts here.</span>
      </div>
      <header className="site-header">
        <div className="container nav">
          <Link to="/" className="logo" aria-label="Dream's Library home">
            <BookOpen /> Dream's Library
          </Link>
          <nav className={open ? 'main-nav open' : 'main-nav'} aria-label="Main navigation">
            {[
              ['/', 'Home'],
              ['/ebooks', 'eBooks'],
              ['/categories', 'Categories'],
              ['/library', 'My Library'],
              ['/about', 'About'],
              ['/contact', 'Contact'],
            ].map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="nav-actions">
            <form
              className="nav-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate(`/ebooks?search=${encodeURIComponent(search)}`);
              }}
            >
              <input
                aria-label="Search books"
                placeholder="Find your next read"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button aria-label="Search">
                <Search size={18} />
              </button>
            </form>
            <Link className="cart-icon" to="/cart" aria-label={`Cart, ${items.length} books`}>
              <ShoppingBag size={20} />
              {items.length > 0 && <span>{items.length}</span>}
            </Link>
            <Link
              to={user ? '/account' : '/login'}
              aria-label={user ? 'Your account' : 'Sign in'}
              className="account-link"
            >
              <User size={19} />
              <span>{user ? 'Account' : 'Sign in'}</span>
            </Link>
            <button
              className="mobile-toggle"
              aria-label="Toggle navigation"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="container footer-grid">
          <div>
            <Link to="/" className="logo">
              <BookOpen /> Dream's Library
            </Link>
            <p>
              Good books. Fresh perspectives.
              <br />A little something for every curious mind.
            </p>
            <span className="footer-note">Read a little. Grow a lot.</span>
          </div>
          <div>
            <h3>Discover</h3>
            <Link to="/ebooks">All eBooks</Link>
            <Link to="/ebooks?sort=popular">Best Sellers</Link>
            <Link to="/ebooks?sort=newest">New Releases</Link>
            <Link to="/categories">Categories</Link>
          </div>
          <div>
            <h3>Your Dream's Library</h3>
            <Link to="/library">My Library</Link>
            <Link to="/account/orders">Your Orders</Link>
            <Link to="/about">Our Story</Link>
            <Link to="/contact">Contact & Support</Link>
          </div>
          <div>
            <h3>The fine print</h3>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/refund-policy">Refund Policy</Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} Dream's Library. Made for curious minds.</span>
          <span>Secure checkout · Instant digital delivery</span>
        </div>
      </footer>
    </>
  );
}
