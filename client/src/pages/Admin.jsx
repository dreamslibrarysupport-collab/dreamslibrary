import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useApi } from '../hooks/useApi';
import { api, money, date, message } from '../services/api';
import { SEO, Loading, ErrorState, Empty, Field, Status } from '../components/UI';
import { OrderList } from './Account';
function Result({ result, children }) {
  return result.loading ? (
    <Loading />
  ) : result.error ? (
    <ErrorState error={result.error} retry={result.reload} />
  ) : (
    children(result.data)
  );
}
export function AdminDashboard() {
  const r = useApi('/admin/dashboard');
  return (
    <>
      <SEO title="Admin overview" />
      <h1>Your store at a glance.</h1>
      <Result result={r}>
        {(d) => (
          <>
            <div className="stats-grid">
              {[
                ['Revenue', money(d.revenue)],
                ['Orders', d.orders],
                ['Customers', d.customers],
                ['eBooks', d.ebooks],
                ['Paid orders', d.paid_orders],
              ].map(([k, v]) => (
                <div key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
            <div className="panel">
              <h2>Revenue · Last 30 days</h2>
              {d.series.length ? (
                <div className="bar-chart">
                  {d.series.map((s) => (
                    <div key={s.day}>
                      <span>{s.day}</span>
                      <meter
                        min="0"
                        max={Math.max(...d.series.map((x) => x.revenue), 1)}
                        value={s.revenue}
                      />
                      <strong>
                        {money(s.revenue)} · {s.orders} orders
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No paid orders in this period.</p>
              )}
            </div>
            <div className="panel">
              <h2>Best-selling books</h2>
              {d.bestsellers.length ? (
                d.bestsellers.map((b) => (
                  <p className="line-item" key={b.title}>
                    <span>{b.title}</span>
                    <strong>{b.sales} sales</strong>
                  </p>
                ))
              ) : (
                <p>Your most popular titles will appear here.</p>
              )}
            </div>
            <h2>Recent sales & orders</h2>
            <OrderList admin result={{ data: d.recent }} />
          </>
        )}
      </Result>
    </>
  );
}
export function AdminBooks() {
  const r = useApi('/admin/ebooks');
  async function archive(id) {
    try {
      await api.delete(`/admin/ebooks/${id}`);
      r.reload();
      toast.success('Book archived; existing buyers keep access');
    } catch (e) {
      toast.error(message(e));
    }
  }
  return (
    <>
      <SEO title="Manage eBooks" />
      <div className="section-heading">
        <h1>eBooks.</h1>
        <Link to="/admin/ebooks/new" className="button primary">
          Add eBook
        </Link>
      </div>
      <Result result={r}>
        {(rows) =>
          rows.length ? (
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
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <td>{b.title}</td>
                      <td>{money(b.price)}</td>
                      <td>
                        <Status value={b.status} />
                      </td>
                      <td>
                        <Link className="text-link" to={`/admin/ebooks/${b.id}/edit`}>
                          Edit
                        </Link>{' '}
                        <button className="text-link" onClick={() => archive(b.id)}>
                          Archive
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Start your collection"
              text="Add your first book, upload its PDF, and publish it."
            />
          )
        }
      </Result>
    </>
  );
}
export function AdminBookEditor() {
  const { id } = useParams(),
    r = useApi(id ? `/admin/ebooks/${id}` : null),
    cats = useApi('/categories');
  return (
    <>
      <SEO title={id ? 'Edit eBook' : 'New eBook'} />
      <h1>{id ? 'Edit eBook.' : 'Add a new eBook.'}</h1>
      {id && r.loading ? (
        <Loading />
      ) : r.error ? (
        <ErrorState error={r.error} />
      ) : (
        <BookForm key={id || 'new'} book={r.data} categories={cats.data || []} reload={r.reload} />
      )}
    </>
  );
}
function BookForm({ book, categories, reload }) {
  const [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(''),
    navigate = useNavigate();
  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    data.price = Math.round(Number(data.price) * 100);
    data.original_price = Math.round(Number(data.original_price) * 100);
    data.is_featured = data.is_featured === 'on';
    data.is_bestseller = data.is_bestseller === 'on';
    data.learning_points = data.learning_points.split('\n').filter(Boolean);
    data.publication_date = data.publication_date || null;
    setBusy(true);
    try {
      const r = await api[book ? 'patch' : 'post'](
        `/admin/ebooks${book ? `/${book.id}` : ''}`,
        data,
      );
      toast.success('Book saved');
      if (!book) navigate(`/admin/ebooks/${r.data.data.id}/edit`);
      else reload();
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(kind, file) {
    if (!file) return;
    setUploading(kind);
    try {
      const form = new FormData();
      form.append('file', file);
      await api.post(`/admin/ebooks/${book.id}/upload/${kind}`, form, { timeout: 120000 });
      toast.success('Upload complete');
      reload();
    } catch (e) {
      toast.error(message(e));
    } finally {
      setUploading('');
    }
  }
  return (
    <>
      <form className="panel" onSubmit={submit}>
        <div className="form-grid">
          {[
            ['Title', 'title'],
            ['Slug', 'slug'],
            ['Author', 'author'],
            ['Language', 'language'],
            ['Pages', 'pages'],
            ['Price (INR)', 'price'],
            ['Original price (INR)', 'original_price'],
            ['Publication date', 'publication_date'],
          ].map(([label, name]) => (
            <Field
              key={name}
              label={label}
              name={name}
              required={name !== 'publication_date'}
              type={
                name === 'publication_date'
                  ? 'date'
                  : ['price', 'original_price', 'pages'].includes(name)
                    ? 'number'
                    : 'text'
              }
              min={['price', 'original_price', 'pages'].includes(name) ? 1 : undefined}
              step={name.includes('price') ? '0.01' : undefined}
              defaultValue={
                name.includes('price')
                  ? (book?.[name] || 100) / 100
                  : book?.[name]?.slice?.(0, name === 'publication_date' ? 10 : undefined) ||
                    book?.[name] ||
                    (name === 'language' ? 'English' : '')
              }
            />
          ))}
          <Field label="Category">
            <select name="category_id" required defaultValue={book?.category_id || ''}>
              <option value="" disabled>
                Select category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={book?.status || 'draft'}>
              <option>draft</option>
              <option>published</option>
              <option>archived</option>
            </select>
          </Field>
        </div>
        <Field label="Short description">
          <textarea
            name="short_description"
            defaultValue={book?.short_description}
            maxLength={400}
          />
        </Field>
        <Field label="Full description">
          <textarea
            name="description"
            defaultValue={book?.description}
            required
            minLength={10}
            rows={6}
          />
        </Field>
        <Field label="What readers will learn (one per line)">
          <textarea
            name="learning_points"
            defaultValue={book?.learning_points?.join('\n')}
            rows={4}
          />
        </Field>
        <div className="checkboxes">
          <label>
            <input type="checkbox" name="is_featured" defaultChecked={book?.is_featured} /> Featured
          </label>
          <label>
            <input type="checkbox" name="is_bestseller" defaultChecked={book?.is_bestseller} />{' '}
            Bestseller
          </label>
        </div>
        <button className="button primary" disabled={busy || !!uploading}>
          {busy ? 'Saving…' : 'Save eBook'}
        </button>
        <p className="muted">Save a new book as a draft, upload its PDF below, then publish.</p>
      </form>
      {book && (
        <div className="panel">
          <h2>Book files</h2>
          <p>
            Upload only files you have rights to distribute. Samples and covers are public; paid
            PDFs are private.
          </p>
          {[
            [
              'cover',
              'Cover image (JPG/PNG/WebP, 5 MB)',
              'image/jpeg,image/png,image/webp',
              'cover_path',
            ],
            ['file', 'Private book (PDF, 50 MB)', 'application/pdf', 'private_file_path'],
            ['sample', 'Public sample (PDF, 10 MB)', 'application/pdf', 'sample_path'],
          ].map(([kind, label, accept, path]) => (
            <Field key={kind} label={`${label} ${book[path] ? '— uploaded' : ''}`}>
              <input
                type="file"
                accept={accept}
                disabled={!!uploading || busy}
                onChange={(e) => upload(kind, e.target.files[0])}
              />
            </Field>
          ))}
          {uploading && <p role="status">Uploading {uploading}…</p>}
        </div>
      )}
    </>
  );
}
export function AdminOrders() {
  const [status, setStatus] = useState(''),
    r = useApi(`/admin/orders?status=${status}`);
  return (
    <>
      <SEO title="Manage orders" />
      <h1>Orders.</h1>
      <Filter
        value={status}
        set={setStatus}
        choices={['paid', 'pending', 'failed', 'refunded', 'cancelled']}
      />
      <OrderList admin result={r} />
    </>
  );
}
function Filter({ value, set, choices }) {
  return (
    <label className="field narrow">
      Filter by status
      <select value={value} onChange={(e) => set(e.target.value)}>
        <option value="">All statuses</option>
        {choices.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
export function AdminCustomers() {
  const r = useApi('/admin/customers');
  return (
    <>
      <SEO title="Customers" />
      <h1>Your readers.</h1>
      <Result result={r}>
        {(rows) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Joined</th>
                  <th>Orders</th>
                  <th>Total spent</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/admin/customers/${c.id}`} className="text-link">
                        {c.full_name || c.email}
                      </Link>
                      <small className="block">{c.email}</small>
                    </td>
                    <td>{date(c.created_at)}</td>
                    <td>{c.purchases}</td>
                    <td>{money(c.total_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p>No customers yet.</p>}
          </div>
        )}
      </Result>
    </>
  );
}
export function AdminCustomer() {
  const { id } = useParams(),
    r = useApi(`/admin/customers/${id}`);
  return (
    <>
      <h1>Customer purchase history.</h1>
      <OrderList admin result={r} />
    </>
  );
}
export function AdminPayments() {
  const [status, setStatus] = useState(''),
    r = useApi(`/admin/payments?status=${status}`);
  return (
    <>
      <SEO title="Payments" />
      <h1>Payments.</h1>
      <Filter value={status} set={setStatus} choices={['captured', 'refunded']} />
      <Result result={r}>
        {(rows) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Order / customer</th>
                  <th>Payment ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {p.order_number}
                      <small className="block">{p.email}</small>
                    </td>
                    <td>{p.razorpay_payment_id}</td>
                    <td>{money(p.amount)}</td>
                    <td>
                      <Status value={p.status} />
                    </td>
                    <td>{date(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p>No payments match this filter.</p>}
          </div>
        )}
      </Result>
    </>
  );
}
export function AdminCoupons() {
  const r = useApi('/admin/coupons'),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget,
      data = Object.fromEntries(new FormData(form));
    data.active = true;
    data.max_uses = data.max_uses ? Number(data.max_uses) : null;
    data.minimum_order = Math.round(Number(data.minimum_order) * 100);
    data.discount_value =
      data.discount_type === 'fixed'
        ? Math.round(Number(data.discount_value) * 100)
        : Number(data.discount_value);
    data.starts_at = new Date(data.starts_at).toISOString();
    data.expires_at = new Date(data.expires_at).toISOString();
    setBusy(true);
    try {
      await api.post('/admin/coupons', data);
      form.reset();
      r.reload();
      toast.success('Coupon created');
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function toggle(c) {
    try {
      await api.patch(`/admin/coupons/${c.id}`, { ...c, active: !c.active });
      r.reload();
    } catch (e) {
      toast.error(message(e));
    }
  }
  return (
    <>
      <SEO title="Coupons" />
      <h1>A little incentive.</h1>
      <form onSubmit={submit} className="panel">
        <h2>Create a coupon</h2>
        <div className="form-grid">
          <Field label="Code" name="code" required />
          <Field label="Discount type">
            <select name="discount_type">
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed INR amount</option>
            </select>
          </Field>
          <Field
            label="Discount value (% or INR)"
            name="discount_value"
            type="number"
            min="1"
            required
          />
          <Field
            label="Minimum order (INR)"
            name="minimum_order"
            type="number"
            defaultValue="0"
            min="0"
          />
          <Field label="Max uses (empty = unlimited)" name="max_uses" type="number" min="1" />
          <Field label="Starts" name="starts_at" type="datetime-local" required />
          <Field label="Expires" name="expires_at" type="datetime-local" required />
        </div>
        <button className="button primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create coupon'}
        </button>
      </form>
      <Result result={r}>
        {(rows) => (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Used</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>{c.code}</td>
                    <td>
                      {c.discount_type === 'percentage'
                        ? `${c.discount_value}%`
                        : money(c.discount_value)}
                    </td>
                    <td>
                      {c.used_count}/{c.max_uses || '∞'}
                    </td>
                    <td>{date(c.expires_at)}</td>
                    <td>
                      <button className="text-link" onClick={() => toggle(c)}>
                        {c.active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Result>
    </>
  );
}
