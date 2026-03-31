import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
  bookingRef?: string;
  paymentBreakdown?: {
    paidNow: number;
    dueOnArrival: number;
    total: number;
  };
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
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    bookingId: number;
    phone?: string;
  }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/payments/verify`, payload);
  }

  loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.body.appendChild(script);
    });
  }
}

