import { create } from 'zustand';

type CheckoutDraftState = {
  cartItemIds: number[];
  addressId: number | null;
  setCartItemIds: (ids: number[]) => void;
  setAddressId: (id: number | null) => void;
  reset: () => void;
};

export const useCheckoutDraftStore = create<CheckoutDraftState>((set) => ({
  cartItemIds: [],
  addressId: null,
  setCartItemIds: (cartItemIds) => set({ cartItemIds }),
  setAddressId: (addressId) => set({ addressId }),
  reset: () => set({ cartItemIds: [], addressId: null }),
}));
