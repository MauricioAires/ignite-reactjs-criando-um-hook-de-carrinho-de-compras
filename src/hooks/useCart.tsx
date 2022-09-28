import { error } from "console";
import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

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
    // Buscar dados do localStorage
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const alredyExistProduct = cart.findIndex(
        (product) => product.id === productId
      );

      if (alredyExistProduct !== -1) {
        updateProductAmount({
          productId,
          amount: cart.find((p) => p.id === productId)!.amount + 1,
        });

        return;
      }

      await api.get<Product>(`/products/${productId}`).then((res) => {
        const newCart = [
          ...cart,
          {
            ...res.data,
            amount: 1,
          },
        ];

        setCartLocalstorage(newCart);
        setCart(newCart);
      });
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (!cart.find((p) => p.id === productId)) {
        throw "Erro na remoção do produto";
      }

      const currentCart = cart;
      const newCart = currentCart.filter((product) => product.id !== productId);

      setCart(newCart);
      setCartLocalstorage(newCart);
    } catch (err) {
      toast.error(err);
    }
  };

  const setCartLocalstorage = (cart: Product[]) => {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    if (amount < 1) return;

    try {
      await api.get<Stock>(`/stock/${productId}`).then(({ data }) => {
        if (data.amount < amount) {
          toast.error("Quantidade solicitada fora de estoque");

          return;
        }

        const currentCart = cart;
        const newCart = currentCart.map((i) =>
          i.id === productId ? { ...i, amount: amount } : i
        );
        setCart(newCart);
        setCartLocalstorage(newCart);
      });
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
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
