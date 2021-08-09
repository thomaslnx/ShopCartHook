import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = await api.get(`products/${productId}`)
      const stock = await api.get(`stock/${productId}`);

      const productsOnCart = [...cart];
      const productExist = productsOnCart.find(item => item.id === productId);
      
      const currentProductStock = stock.data.amount;
      
      const currentProductAmount = productExist ? productExist.amount : 0;
      const currentCartProductAmount = currentProductAmount + 1;

      if (currentCartProductAmount > currentProductStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExist) {
        productExist.amount = currentCartProductAmount;
      } else {
        const newProduct = {
          ...product.data,
          amount: 1,
        }

        productsOnCart.push(newProduct);
      }

      setCart(productsOnCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(productsOnCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartItems = [...cart];
      const productToRemove = cartItems.findIndex(item => item.id === productId);

      if (productToRemove >= 0) {
        cartItems.splice(productToRemove, 1);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartItems));
        setCart(cartItems);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stock = await api.get(`stock/${productId}`);
      const currentProductStock = stock.data.amount;

      if (amount > currentProductStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartItems = [...cart];
      const productExist = cartItems.find(item => item.id === productId);

      if (productExist) {
        productExist.amount = amount;
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartItems));
        setCart(cartItems);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
