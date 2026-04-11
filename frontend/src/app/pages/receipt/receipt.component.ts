import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingService, Booking } from '../../core/services/booking.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-receipt',
  template: `
    <section class="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10" *ngIf="booking">
      <div class="card p-6 sm:p-8">
        <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-6">Booking Receipt</h1>
        <div class="text-sm text-muted space-y-1 mb-6">
          <div class="font-semibold text-dark">Booking {{ booking.booking_ref }}</div>
          <div>Dates: {{ formatDate(booking.check_in) }} to {{ formatDate(booking.check_out) }} ({{ booking.nights }} nights)</div>
          <div>Guests: {{ booking.guests }}</div>
          <div>Status: {{ booking.status }} | Payment: {{ booking.payment_status }}</div>
        </div>
        <div class="border-t border-sand pt-4 mb-6 text-sm space-y-2">
          <div class="flex justify-between">
            <span class="text-muted">Downpayment Paid</span>
            <span>{{ booking.registration_amount | currencyInr }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-muted">Amount Due at Arrival</span>
            <span>{{ booking.arrival_amount | currencyInr }} (Cash only)</span>
          </div>
          <div class="flex justify-between font-semibold text-earth text-base pt-2">
            <span>Total Booking Amount</span>
            <span>{{ booking.total_amount | currencyInr }}</span>
          </div>
        </div>
        <div class="text-sm text-muted mb-6">
          Bring your booking reference and valid ID at check-in. Arrival balance is collected at the property.
        </div>
        <div class="flex flex-wrap gap-3">
          <button class="btn-primary" (click)="downloadPdf()">Download PDF</button>
          <button class="btn-gold" (click)="printPage()">Print</button>
          <button class="btn-primary" (click)="goHome()">Back Home</button>
        </div>
      </div>
    </section>
    <app-loading-spinner [show]="loading || !booking"></app-loading-spinner>
  `
})
export class ReceiptComponent {
  bookingId!: number;
  booking: Booking | null = null;
  loading = false;
  guestPhone = '';
  private routeParamsReady = false;
  private queryParamsReady = false;

  constructor(
    private route: ActivatedRoute,
    private bookingService: BookingService,
    private router: Router
  ) {
    this.route.queryParamMap.subscribe((params) => {
      this.guestPhone = (params.get('phone') || '').trim();
      this.queryParamsReady = true;
      this.tryLoadBooking();
    });

    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('bookingId');
      if (idParam) {
        this.bookingId = Number(idParam);
      }
      this.routeParamsReady = true;
      this.tryLoadBooking();
    });
  }

  private tryLoadBooking(): void {
    if (!this.routeParamsReady || !this.queryParamsReady || !this.bookingId) {
      return;
    }
    this.loadBooking();
  }

  private loadBooking(): void {
    this.loading = true;
    const request = this.guestPhone
      ? this.bookingService.getGuestBooking(this.bookingId, this.guestPhone)
      : this.bookingService.getBooking(this.bookingId);

    request.subscribe({
      next: (booking) => {
        this.booking = booking;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.router.navigate(['/']);
      }
    });
  }

  downloadPdf(): void {
    const url = this.guestPhone
      ? `${environment.apiUrl}/receipts/${this.bookingId}?phone=${encodeURIComponent(this.guestPhone)}`
      : `${environment.apiUrl}/receipts/${this.bookingId}`;
    window.open(url, '_blank');
  }

  printPage(): void {
    window.print();
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  formatDate(value: string): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
  }
}
