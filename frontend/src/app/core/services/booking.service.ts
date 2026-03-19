import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Booking {
  id: number;
  booking_ref: string;
  user_id: number;
  property_type: 'room' | 'tent';
  property_id: number;
  check_in: string;
  check_out: string;
  guests: number;
  nights: number;
  base_amount: number;
  tax_amount: number;
  total_amount: number;
  special_requests?: string;
  status: string;
  payment_status: string;
  promo_code?: string;
  discount_percent?: number;
  discount_amount?: number;
}

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(private http: HttpClient) {}

  createBooking(payload: {
    propertyType: 'room' | 'tent';
    propertyId: number;
    checkIn: string;
    checkOut: string;
    guests: number;
    specialRequests?: string;
    promoCode?: string;
    discountPercent?: number;
  }): Observable<Booking> {
    return this.http.post<Booking>(`${environment.apiUrl}/bookings`, payload);
  }

  getMyBookings(): Observable<Booking[]> {
    return this.http.get<Booking[]>(`${environment.apiUrl}/bookings/my`);
  }

  getBooking(id: number): Observable<Booking> {
    return this.http.get<Booking>(`${environment.apiUrl}/bookings/${id}`);
  }

  cancelBooking(id: number): Observable<Booking> {
    return this.http.put<Booking>(`${environment.apiUrl}/bookings/${id}/cancel`, {});
  }
}

