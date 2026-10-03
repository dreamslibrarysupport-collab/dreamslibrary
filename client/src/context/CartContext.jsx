import { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('folio-cart') || '[]');
      return Array.isArray(data)
        ? data.filter((b) => b && typeof b.id === 'string').slice(0, 30)
        : [];
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem('folio-cart', JSON.stringify(items)), [items]);
  const add = (book) => {
    if (items.some((b) => b.id === book.id)) {
      toast('Already in your bag');
      return;
    }
    setItems((v) => [...v, book]);
    toast.success('Added to your bag');
  };
  return (
    <CartContext.Provider
      value={{
        items,
        add,
        replace: (books) => setItems(books),
        remove: (id) => setItems((v) => v.filter((b) => b.id !== id)),
        clear: () => setItems([]),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
export const useCart = () => useContext(CartContext);
