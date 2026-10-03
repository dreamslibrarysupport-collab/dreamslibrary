import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import App from './routes/App';
import './styles.css';
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="container section">
        <h1>Something interrupted this chapter.</h1>
        <p>Refresh the page and try again.</p>
        <button className="button primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{ style: { background: '#152e45', color: '#fff' }, duration: 4500 }}
          />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>,
);
