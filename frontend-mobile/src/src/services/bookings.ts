import { apiPost, apiGet } from './api';

export interface BookingPayload {
  user_id: number;
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_reserved: number;
}

export interface BookingResponse {
  id: number;
  user_id: number;
  venue_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_reserved: number;
  status: string;
  order_id: string;
  payment_status: string;
}

export interface UserBookingItem {
  booking_id: number;
  venue_id: string;
  venue_name: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  seats_reserved: number;
  status: string;
  order_id: string;
  payment_status: string;
  lat: number | null;
  lon: number | null;
}

export interface UserBookingsResponse {
  upcoming: UserBookingItem[];
  completed: UserBookingItem[];
  cancelled: UserBookingItem[];
}

export async function createBooking(payload: BookingPayload, token?: string): Promise<BookingResponse> {
  return apiPost<BookingResponse>('/api/bookings', payload, token);
}

export async function fetchUserBookings(token?: string): Promise<UserBookingsResponse> {
  return apiGet<UserBookingsResponse>('/api/users/me/bookings', token);
}

export async function cancelBooking(bookingId: number, token?: string): Promise<{ booking_id: number; status: string; message: string }> {
  return apiPost<{ booking_id: number; status: string; message: string }>(`/api/bookings/${bookingId}/cancel`, {}, token);
}
