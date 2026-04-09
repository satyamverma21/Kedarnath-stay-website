import { Component } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService, Booking } from '../../core/services/booking.service';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-my-bookings',
  template: `
    <section class="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-6">My Bookings</h1>
      <app-loading-spinner [show]="loading"></app-loading-spinner>
      <div *ngIf="!loading && bookings.length === 0" class="card p-8 sm:p-10 text-center text-muted">
        You don't have any bookings yet.
      </div>
      <div *ngIf="!loading && bookings.length" class="overflow-x-auto -mx-4 sm:mx-0">
        <div class="inline-block min-w-full align-middle">
          <div class="card overflow-hidden">
            <table class="min-w-full text-sm">
              <thead class="bg-sand/70 text-xs uppercase tracking-widest text-dark">
                <tr>
                  <th class="px-3 sm:px-4 py-3 text-left font-semibold">Ref</th>
                  <th class="px-3 sm:px-4 py-3 text-left font-semibold hidden sm:table-cell">Type</th>
                  <th class="px-3 sm:px-4 py-3 text-left font-semibold">Dates</th>
                  <th class="px-3 sm:px-4 py-3 text-left font-semibold hidden md:table-cell">Guests</th>
                  <th class="px-3 sm:px-4 py-3 text-left font-semibold">Amount</th>
                  <th class="px-3 sm:px-4 py-3 text-left font-semibold">Status</th>
                  <th class="px-3 sm:px-4 py-3 text-left font-semibold hidden lg:table-cell">Payment</th>
                  <th class="px-3 sm:px-4 py-3 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let b of bookings" class="border-t border-sand/60 hover:bg-cream/50 transition-colors">
                  <td class="px-3 sm:px-4 py-3 font-medium">{{ b.booking_ref }}</td>
                  <td class="px-3 sm:px-4 py-3 hidden sm:table-cell text-muted">{{ b.property_type }}</td>
                  <td class="px-3 sm:px-4 py-3 text-muted">{{ formatDate(b.check_in) }} - {{ formatDate(b.check_out) }}</td>
                  <td class="px-3 sm:px-4 py-3 hidden md:table-cell">{{ b.guests }}</td>
                  <td class="px-3 sm:px-4 py-3 font-medium">{{ b.total_amount | currencyInr }}</td>
                  <td class="px-3 sm:px-4 py-3">
                    <span
                      [ngClass]="{
                        'badge-confirmed': b.status === 'confirmed',
                        'badge-pending': b.status === 'pending',
                        'badge-cancelled': b.status === 'cancelled'
                      }"
                    >
                      {{ b.status }}
                    </span>
                  </td>
                  <td class="px-3 sm:px-4 py-3 hidden lg:table-cell">
                    <span
                      [ngClass]="{
                        'badge-paid': b.payment_status === 'paid',
                        'badge-pending': b.payment_status !== 'paid'
                      }"
                    >
                      {{ b.payment_status }}
                    </span>
                  </td>
                  <td class="px-3 sm:px-4 py-3">
                    <div class="flex flex-wrap gap-2">
                      <a class="btn-secondary text-xs inline-block" [routerLink]="['/property', b.property_type, b.property_id]">
                        View {{ b.property_type === 'room' ? 'Room' : 'Tent' }}
                      </a>
                      <a *ngIf="b.payment_status === 'unpaid'" class="btn-primary text-xs inline-block" [routerLink]="['/payment', b.id]">
                        Pay Now
                      </a>
                      <button class="btn-primary text-xs" *ngIf="canCancel(b)" (click)="cancel(b)" [disabled]="loading" [class.btn-loading]="loading">Cancel</button>
                      <a *ngIf="b.payment_status === 'paid'" class="btn-gold text-xs inline-block" [routerLink]="['/receipt', b.id]">Receipt</a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  `
})
export class MyBookingsComponent {
  bookings: Booking[] = [];
  loading = false;

  constructor(private bookingService: BookingService, private toast: ToastService) {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.bookingService.getMyBookings().subscribe({
      next: (list) => {
        this.bookings = list;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  canCancel(b: Booking): boolean {
    const today = new Date().toISOString().slice(0, 10);
    return (
      (b.status === 'pending' || b.status === 'confirmed') &&
      b.check_in > today
    );
  }

  cancel(b: Booking): void {
    if (!confirm('Cancel this booking?')) {
      return;
    }
    this.loading = true;
    this.bookingService.cancelBooking(b.id).subscribe({
      next: () => {
        this.toast.success('Booking cancelled successfully.');
        this.load();
      },
      error: () => {
        this.loading = false;
        this.toast.error('Unable to cancel booking.');
      }
    });
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

