import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO, Field, Status } from '../components/UI';
import { money } from '../services/api';

const initialBooks = [
  { title: 'The Art of Deep Focus', author: 'Maya Bennett', price: 349, status: 'published' },
  { title: 'JavaScript, Clearly', author: 'Alex Morgan', price: 499, status: 'published' },
  { title: 'Build Something Good', author: 'Daniel Reed', price: 449, status: 'published' },
  { title: 'A Creative Practice', author: 'Sofia Chen', price: 299, status: 'draft' },
  { title: 'Small Steps, Lasting Change', author: 'Emma Brooks', price: 249, status: 'published' },
  { title: 'Designing for People', author: 'Oliver James', price: 599, status: 'draft' },
];
const sales = [
  ['DEMO-1003', 'Reader A', 'JavaScript, Clearly', 49900, 'paid'],
  ['DEMO-1002', 'Reader B', 'The Art of Deep Focus', 34900, 'paid'],
  ['DEMO-1001', 'Reader C', 'Build Something Good', 44900, 'pending'],
];
const tabs = ['Overview', 'eBooks', 'Orders', 'Customers', 'Payments', 'Coupons'];
export default function AdminDemo() {
  const [tab, setTab] = useState('Overview'),
    [books, setBooks] = useState(initialBooks),
    [editing, setEditing] = useState(null),
    [notice, setNotice] = useState('');
  const select = (t) => {
    setTab(t);
    setEditing(null);
    setNotice('');
  };
  function save(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setBooks((current) =>
      editing === 'new' ? [...current, data] : current.map((b, i) => (i === editing ? data : b)),
    );
    setEditing(null);
    setNotice('Demo book saved for this preview session. Nothing was uploaded or published.');
  }
  return (
    <div className="container section dashboard-layout">
      <SEO title="Admin demo" />
      <aside className="dashboard-nav">
        <div className="eyebrow">DREAM&#39;S LIBRARY ADMIN · DEMO</div>
        <h2>The bookshop.</h2>
        {tabs.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? 'page' : undefined}
            style={tab === t ? { background: '#eaf0ec', fontWeight: 600 } : undefined}
            onClick={() => select(t)}
          >
            {t}
          </button>
        ))}
        <Link to="/">Back to store</Link>
      </aside>
      <div className="dashboard-content">
        <div className="notice" role="note">
          <strong>Admin preview</strong>
          <br />
          All figures and customers below are fictional demo data. Changes stay in this tab until
          refresh. Real admin access requires your configured admin account.
        </div>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        {tab === 'Overview' && (
          <>
            <div className="section-heading">
              <div>
                <div className="eyebrow">WELCOME TO YOUR BOOKSHOP</div>
                <h1>Your store at a glance.</h1>
              </div>
              <button
                className="button primary"
                onClick={() => {
                  select('eBooks');
                  setEditing('new');
                }}
              >
                Add eBook
              </button>
            </div>
            <div className="stats-grid">
              {[
                ['Revenue', money(84800)],
                ['Orders', 3],
                ['Customers', 3],
                ['eBooks', books.length],
                ['Paid orders', 2],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <div className="panel">
              <h2>Revenue · Sample sales</h2>
              <div className="bar-chart">
                {[
                  ['Day 1', 34900],
                  ['Day 2', 49900],
                ].map(([day, revenue]) => (
                  <div key={day}>
                    <span>{day}</span>
                    <meter min="0" max="49900" value={revenue} />
                    <strong>{money(revenue)}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <h2>Best-selling books</h2>
              {sales
                .filter((s) => s[4] === 'paid')
                .map((s) => (
                  <p key={s[0]} className="line-item">
                    <span>{s[2]}</span>
                    <strong>1 sale</strong>
                  </p>
                ))}
            </div>
            <h2>Recent orders</h2>
            <SalesTable />
          </>
        )}
        {tab === 'eBooks' && (
          <>
            <div className="section-heading">
              <h1>{editing !== null ? 'Book details.' : 'Your eBooks.'}</h1>
              <button
                className="button primary"
                onClick={() => {
                  setEditing(editing === null ? 'new' : null);
                  setNotice('');
                }}
              >
                {editing === null ? 'Add eBook' : 'Back to books'}
              </button>
            </div>
            {editing !== null ? (
              <form key={editing} onSubmit={save} className="panel">
                <div className="form-grid">
                  <Field label="Title" name="title" required defaultValue={books[editing]?.title} />
                  <Field
                    label="Author"
                    name="author"
                    required
                    defaultValue={books[editing]?.author}
                  />
                  <Field
                    label="Price (INR)"
                    name="price"
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    defaultValue={books[editing]?.price}
                  />
                  <Field label="Status">
                    <select name="status" defaultValue={books[editing]?.status || 'draft'}>
                      <option>draft</option>
                      <option>published</option>
                      <option>archived</option>
                    </select>
                  </Field>
                  <Field label="Category">
                    <select name="category">
                      <option>Technology</option>
                      <option>Personal Growth</option>
                      <option>Business</option>
                      <option>Creativity</option>
                    </select>
                  </Field>
                  <Field label="Language" name="language" defaultValue="English" />
                </div>
                <Field label="Description">
                  <textarea
                    name="description"
                    rows="4"
                    defaultValue={books[editing]?.description}
                  />
                </Field>
                <Field label="Cover image — enabled after setup">
                  <input type="file" disabled accept="image/jpeg,image/png,image/webp" />
                </Field>
                <Field label="Private PDF — enabled after setup">
                  <input type="file" disabled accept="application/pdf" />
                </Field>
                <p className="muted">
                  This shows the book-entry workflow. PDF uploads need Supabase private storage.
                </p>
                <button className="button primary">Save demo book</button>
              </form>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Price</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.map((b, i) => (
                      <tr key={i}>
                        <td>
                          {b.title}
                          <small className="block">{b.author}</small>
                        </td>
                        <td>{money(Number(b.price) * 100)}</td>
                        <td>
                          <Status value={b.status} />
                        </td>
                        <td>
                          <button className="text-link" onClick={() => setEditing(i)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        {tab === 'Orders' && (
          <>
            <h1>Orders.</h1>
            <SalesTable />
          </>
        )}
        {tab === 'Customers' && (
          <>
            <h1>Your readers.</h1>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Paid orders</th>
                    <th>Total spent</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s[0]}>
                      <td>
                        {s[1]}
                        <small className="block">Fictional demo customer</small>
                      </td>
                      <td>{s[4] === 'paid' ? 1 : 0}</td>
                      <td>{money(s[4] === 'paid' ? s[3] : 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === 'Payments' && (
          <>
            <h1>Payments.</h1>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Payment ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales
                    .filter((s) => s[4] === 'paid')
                    .map((s) => (
                      <tr key={s[0]}>
                        <td>{s[0]}</td>
                        <td>demo_payment_{s[0].slice(-4)}</td>
                        <td>{money(s[3])}</td>
                        <td>
                          <Status value="captured" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {tab === 'Coupons' && (
          <>
            <h1>A little incentive.</h1>
            <div className="panel">
              <h2>Coupon management preview</h2>
              <p>
                Create percentage or fixed-price discounts with start dates, expiry dates, minimum
                orders and usage limits in the configured admin panel.
              </p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Example code</th>
                    <th>Discount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>DEMO10</td>
                    <td>10%</td>
                    <td>Example only — cannot be redeemed</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function SalesTable() {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer / book</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s[0]}>
              <td>{s[0]}</td>
              <td>
                {s[1]}
                <small className="block">{s[2]}</small>
              </td>
              <td>{money(s[3])}</td>
              <td>
                <Status value={s[4]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
