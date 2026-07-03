export type OrderStatus = 'pending' | 'accepted' | 'rejected' | 'ready' | 'completed' | 'cancelled';

export interface ShopSchedule {
  day: number; // 0=Sun
  open: string;
  close: string;
}

export interface Shop {
  id: string;
  shop_slug: string;
  shop_name: string;
  description: string | null;
  is_enabled: boolean;
  schedule: ShopSchedule[];
  manual_override: 'open' | 'closed' | null;
  delivery_enabled: boolean;
  delivery_fee: number;
  min_order_amount: number;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  delivery_radius_km: number | null;
}

export interface OnlineProduct {
  product_id: string;
  is_visible: boolean;
  online_price: number | null;
  // joined from local product info stored in online_products
  name: string;
  category: string;
  store_price: number;
  quantity: number;
  unit: string;
  image_url: string | null;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  label: string;                 // 'Home' | 'Work' | 'Other' | …
  receiver_name: string | null;
  receiver_phone: string | null;
  flat: string | null;           // House / Flat / Block no.
  building: string | null;       // Apartment / building / road
  landmark: string | null;
  area: string | null;           // Locality / sub-locality
  city: string | null;
  state: string | null;
  pincode: string | null;
  formatted_address: string;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

/** The delivery location currently selected in the header. Persisted locally.
 *  `addressId` is null when it's an ad-hoc detected/searched location (not saved). */
export interface SelectedLocation {
  addressId: string | null;
  label: string;
  formatted_address: string;
  area: string | null;
  city: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
}

export interface OnlineOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OnlineOrder {
  id: string;
  shop_id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  items: OnlineOrderItem[];
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}
