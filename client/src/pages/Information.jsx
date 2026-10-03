import { Link, useLocation } from 'react-router-dom';
import { SEO } from '../components/UI';
const content = {
  '/about': [
    'A home for curious minds.',
    'Dream\'s Library is a small digital bookshop with a simple belief: a good idea can change the shape of your day. We bring together approachable books about technology, business, personal growth, and creativity.',
    'Our collection is designed for people who like to keep learning. Explore a subject, find your next book, and build a library that grows with you.',
  ],
  '/contact': [
    'Let’s talk books.',
    'Need help with an order, accessing your library, or choosing your next read? Email our store team and include your order number if you have one. Never send your password or payment credentials.',
    'Contact Dream\'s Library at dreamslibrarysupport@gmail.com for help with your books and orders.',
  ],
  '/privacy': [
    'Privacy Policy',
    'Dream\'s Library uses account information to provide your personal library, process orders, and support your purchases. Payment credentials are handled by Razorpay; we do not store card details. Supabase provides authentication, database, and file storage.',
    'Download access requests are logged with your account, book, IP address, and browser information to help prevent unauthorized access. Cart items and authentication sessions are stored in your browser. Newsletter emails are collected only when you subscribe.',
    'Launch template: the operator must add their legal identity, privacy contact, retention periods, and applicable privacy rights before opening the store.',
  ],
  '/terms': [
    'Terms & Conditions',
    'Digital books are licensed for your personal use. Please do not redistribute, resell, or publicly share the files or temporary access links. Prices are listed in INR. A purchase is available only after the payment provider confirms a captured payment.',
    'This is a launch template. Before trading, the store operator must add legal business information, licensing terms, tax details, applicable jurisdiction, and customer support procedures.',
  ],
  '/refund-policy': [
    'Refund Policy',
    'If your payment is duplicated or your book cannot be accessed, contact support with your order number so the issue can be investigated. Do not submit a second payment while the first one is confirming.',
    'The operator must publish their final digital-goods refund conditions and timelines before accepting live payments. Full processed refunds revoke future library access; previously downloaded copies cannot be remotely removed.',
  ],
};
export default function Information() {
  const { pathname } = useLocation(),
    [title, ...paragraphs] = content[pathname] || [
      'Page not found',
      'This chapter seems to be missing.',
    ];
  return (
    <section className="container section prose">
      <SEO title={title} />
      <div className="eyebrow">DREAM&#39;S LIBRARY / A LITTLE MORE TO KNOW</div>
      <h1 className="page-title">{title}</h1>
      {pathname === '/contact' && (
        <a className="text-link" href="mailto:dreamslibrarysupport@gmail.com">
          Email Dream’s Library support
        </a>
      )}
      {paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
      <Link className="button secondary" to="/ebooks">
        Explore the bookshop
      </Link>
    </section>
  );
}
