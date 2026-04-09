import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PaymentOrder {
  amount: number;
  currency: string;
  upiIds?: {
    paytm: string;
    phonepe: string;
  };
  deepLinks: {
    paytm: string;
    phonepe: string;
  };
  upiLinks: {
    paytm: string;
    phonepe: string;
  };
  bookingRef?: string;
  paymentBreakdown?: {
    paidNow: number;
    dueOnArrival: number;
    total: number;
  };
}

export interface SupportContacts {
  hotelAdminPhone?: string;
  mainAdminPhone?: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  verificationRequired?: boolean;
  message?: string;
  booking?: any;
  supportContacts?: SupportContacts;
}

export interface PaymentByBookingResponse {
  payment: any | null;
  supportContacts?: SupportContacts;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  constructor(private http: HttpClient) {}

  createOrder(bookingId: number, phone?: string): Observable<PaymentOrder> {
    return this.http.post<PaymentOrder>(`${environment.apiUrl}/payments/create-order`, {
      bookingId,
      phone
    });
  }

  verifyPayment(payload: {
    bookingId: number;
    method?: 'paytm' | 'phonepe' | 'upi';
    transactionId?: string;
    phone?: string;
  }): Observable<VerifyPaymentResponse> {
    return this.http.post<VerifyPaymentResponse>(`${environment.apiUrl}/payments/verify`, payload);
  }

  getPaymentByBooking(bookingId: number, phone?: string): Observable<PaymentByBookingResponse> {
    return this.http.get<PaymentByBookingResponse>(`${environment.apiUrl}/payments/booking/${bookingId}`, {
      params: phone ? { phone } : {}
    });
  }
}

