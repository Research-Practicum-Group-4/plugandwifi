import { apiPost } from './api';

export interface BookingPayload {
  user_id: number;
  venue_id: string;
  booking_date: string; // YYYY-MM-DD
  start_time: string;   // HH:MM:SS
  end_time: string;     // HH:MM:SS
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

export async function createBooking(
  payload: BookingPayload,
  token?: string,
): Promise<BookingResponse> {
  return apiPost<BookingResponse>('/api/bookings', payload, token);
}
