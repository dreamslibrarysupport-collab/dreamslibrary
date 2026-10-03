import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, api, message } from '../services/api';
import { Field, SEO } from '../components/UI';
import { useAuth } from '../context/AuthContext';
export default function Auth() {
  const location = useLocation(),
    navigate = useNavigate(),
    mode = location.pathname.slice(1),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState('');
  const titles = {
    login: 'Welcome back.',
    register: 'Your next chapter starts here.',
    'forgot-password': 'Let’s get you back in.',
    'reset-password': 'A fresh start.',
  };
  const { setUser } = useAuth();
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setNotice('');
    const form = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (!supabase)
        throw new Error(
          'Accounts are not enabled in the catalog preview. Configure Supabase to continue.',
        );
      let result;
      if (mode === 'register') {
        result = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.full_name },
            emailRedirectTo: `${window.location.origin}/account`,
          },
        });
        if (result.error) throw result.error;
        setNotice('Check your email to confirm your account, then sign in.');
      } else if (mode === 'login') {
        result = await supabase.auth.signInWithPassword(form);
        if (result.error) throw result.error;
        const profile = await api.get('/auth/me');
        setUser(profile.data.data);
        const to = new URLSearchParams(location.search).get('next');
        navigate(to?.startsWith('/') && !to.startsWith('//') ? to : '/account', { replace: true });
      } else if (mode === 'forgot-password') {
        result = await supabase.auth.resetPasswordForEmail(form.email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw result.error;
        setNotice('If this address has an account, a password reset link is on its way.');
      } else {
        result = await supabase.auth.updateUser({ password: form.password });
        if (result.error) throw result.error;
        toast.success('Password updated');
        navigate('/account');
      }
    } catch (error) {
      toast.error(message(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-section container">
      <SEO title={titles[mode]} />
      <div className="auth-story">
        <BookOpen size={36} />
        <h2>
          A little reading.
          <br />A world of
          <br />
          <em>possibility.</em>
        </h2>
        <p>
          Your books, your ideas, your next big thing.
          <br />
          Keep them all in one place.
        </p>
      </div>
      <div className="auth-form">
        <div className="eyebrow">YOUR PERSONAL BOOKSHELF</div>
        <h1>{titles[mode]}</h1>
        <p>
          {mode === 'login'
            ? 'Sign in to pick up where you left off.'
            : mode === 'register'
              ? 'Join a community of curious minds.'
              : 'We’ll help you securely update your password.'}
        </p>
        {notice && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}
        <form onSubmit={submit} key={mode}>
          {mode === 'register' && (
            <Field label="Full name" name="full_name" required minLength={2} autoComplete="name" />
          )}
          {mode !== 'reset-password' && (
            <Field label="Email address" name="email" type="email" required autoComplete="email" />
          )}
          {mode !== 'forgot-password' && (
            <Field
              label={mode === 'reset-password' ? 'New password' : 'Password'}
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          )}
          <button disabled={busy} className="button primary wide">
            {busy
              ? 'Please wait…'
              : {
                  login: 'Sign in',
                  register: 'Create account',
                  'forgot-password': 'Send reset link',
                  'reset-password': 'Update password',
                }[mode]}
          </button>
        </form>
        {mode === 'login' ? (
          <>
            <Link to="/forgot-password">Forgot password?</Link>
            <p>
              New to Dream's Library? <Link to="/register">Create an account</Link>
            </p>
          </>
        ) : (
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        )}
      </div>
    </section>
  );
}
