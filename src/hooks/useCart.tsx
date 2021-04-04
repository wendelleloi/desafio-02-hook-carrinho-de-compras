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
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId)

      if (productInCart) {
        const { data } = await api.get<Stock>(`/stock/${productId}`)
        
        if (data.amount > productInCart.amount) {

          const updatedCart = cart.map((cartItem) => {
            if (cartItem.id === productId) {
              return { ...cartItem, amount: Number(cartItem.amount + 1)}
            } else {
              return cartItem
            }
          })

          setCart(updatedCart);

          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(updatedCart)
          );

        } else {
          toast.error("Quantidade solicitada fora de estoque")
        }
      }

      if (!productInCart) {
        const { data: product } = await api.get<Product>(`products/${productId}`)
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`)

        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }])
          localStorage.setItem("@RocketShoes:cart", JSON.stringify([...cart, { ...product, amount: 1 }]))
        }
      }

      
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // prevent should not be able to remove a product that does not exist
      const productInCart = cart.find((product) => product.id === productId)
      if (!productInCart) throw Error

      const filteredCart = cart.filter((product) => product.id !== productId)
      
      setCart(filteredCart);
    
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(filteredCart)
      );

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
        return
      }
      if (amount > 0) {
        // prevent should not be able to update a product that does not exist
        const productInCart = cart.find((product) => product.id === productId)
        if (!productInCart) throw Error

        const { data: stock } = await api.get<Stock>(`/stock/${productId}`)
        if (stock.amount >= amount) {
          const updatedCart = cart.map((cartItem) => {
            if (cartItem.id === productId) {
              return { ...cartItem, amount: amount}
            } else {
              return cartItem
            }
          })
    
          setCart(updatedCart);
    
          localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify(updatedCart)
          );
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
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
