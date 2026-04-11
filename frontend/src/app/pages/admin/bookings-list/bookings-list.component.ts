import { Component } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface AdminBooking {
  id: number;
  booking_ref: string;
  guest_name?: string;
  guest_phone?: string;
  hotel_name?: string;
  property_name?: string;
  property_type: string;
  check_in: string;
  check_out: string;
  total_amount?: number;
  registration_amount?: number;
  due_on_arrival?: number;
  status: string;
  payment_status?: string;
  payment_record_status?: string;
  submitted_transaction_id?: string;
  submitted_method?: string;
  payment_submitted_at?: string;
}

interface AdminHotel {
  id: number;
  name: string;
}

@Component({
  selector: 'app-bookings-list',
  template: `
    <section class="space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-heading text-2xl">Bookings</h1>
          <p class="text-sm text-muted mt-1">Enterprise booking operations with payment verification controls.</p>
        </div>
        <button class="btn-secondary text-xs" (click)="load()" [disabled]="loading" [class.btn-loading]="loading">Refresh</button>
      </div>

      <div class="card p-4 sm:p-5 text-sm">
        <div class="grid md:grid-cols-5 gap-3">
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Status</label>
            <select [(ngModel)]="filter.status" class="w-full" [disabled]="isHotelAdmin">
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Property Type</label>
            <select [(ngModel)]="filter.propertyType" class="w-full">
              <option value="">All</option>
              <option value="room">Room</option>
              <option value="tent">Tent</option>
            </select>
          </div>

          <div *ngIf="!isHotelAdmin">
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Payment</label>
            <select [(ngModel)]="filter.paymentStatus" class="w-full">
              <option value="">All</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div *ngIf="!isHotelAdmin">
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Hotel</label>
            <select [(ngModel)]="filter.hotelId" class="w-full">
              <option value="">All Hotels</option>
              <option *ngFor="let h of hotels" [value]="h.id">{{ h.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Booked From</label>
            <input type="date" [(ngModel)]="filter.from" class="w-full" />
          </div>

          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Booked To</label>
            <input type="date" [(ngModel)]="filter.to" class="w-full" />
          </div>
        </div>

        <div class="grid md:grid-cols-3 gap-3 mt-3">
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Check-in From</label>
            <input type="date" [(ngModel)]="filter.checkInFrom" class="w-full" />
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Check-in To</label>
            <input type="date" [(ngModel)]="filter.checkInTo" class="w-full" />
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Search</label>
            <input
              type="text"
              [(ngModel)]="filter.search"
              class="w-full"
              placeholder="Ref / guest / contact / property"
            />
          </div>
        </div>

        <div class="mt-4 admin-actions">
          <button class="btn-primary text-xs" (click)="load()" [disabled]="loading" [class.btn-loading]="loading">Apply Filters</button>
          <button class="btn-tertiary text-xs" (click)="resetFilters()" [disabled]="loading" [class.btn-loading]="loading">Reset</button>
        </div>
      </div>

      <app-loading-spinner [show]="loading"></app-loading-spinner>

      <div *ngIf="!loading && bookings.length === 0" class="card p-6 text-sm text-muted">
        No bookings found for the current filters.
      </div>

      <div *ngIf="bookings.length" class="card p-3 sm:p-4">
        <div class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Guest</th>
                <th>Contact Number (Booking)</th>
                <th>Stay</th>
                <th *ngIf="!isHotelAdmin">Downpayment Received</th>
                <th>Due On Arrival</th>
                <th>Booking Status</th>
                <th>{{ isHotelAdmin ? 'Cash Payment' : 'Payment' }}</th>
                <th *ngIf="!isHotelAdmin">Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr *ngFor="let b of bookings">
                <td>
                  <div class="admin-ref">{{ b.booking_ref }}</div>
                  <div class="admin-subtext mt-1">{{ b.hotel_name || '-' }}</div>
                </td>
                <td>
                  <div class="font-medium">{{ b.guest_name || '-' }}</div>
                </td>
                <td>{{ b.guest_phone || '-' }}</td>
                <td>
                  <div class="font-medium">{{ b.property_name || '-' }} <span class="admin-subtext">({{ b.property_type }})</span></div>
                  <div class="admin-subtext">{{ formatDateRange(b.check_in, b.check_out) }}</div>
                </td>
                <td *ngIf="!isHotelAdmin">
                  <div class="font-semibold">{{ downpaymentReceived(b) | currencyInr }}</div>
                </td>
                <td>
                  <div class="font-semibold">{{ (b.due_on_arrival ?? b.total_amount) | currencyInr }}</div>
                </td>
                <td>
                  <span class="status-pill" [ngClass]="statusClass(b.status)">{{ b.status }}</span>
                </td>
                <td>
                  <ng-container *ngIf="isHotelAdmin; else fullPaymentDetails">
                    <span class="status-pill confirmed">Cash on Arrival</span>
                  </ng-container>
                  <ng-template #fullPaymentDetails>
                    <div>
                      <span class="status-pill" [ngClass]="statusClass(b.payment_status || '')">{{ b.payment_status }}</span>
                    </div>
                    <div class="admin-subtext mt-1" *ngIf="b.submitted_transaction_id">
                      Txn: {{ b.submitted_transaction_id }}
                    </div>
                    <div class="admin-subtext" *ngIf="b.submitted_method">
                      Method: {{ b.submitted_method }}
                    </div>
                  </ng-template>
                </td>
                <td *ngIf="!isHotelAdmin">
                  <div class="admin-actions">
                    <select
                      class="text-xs"
                      [value]="b.status"
                      [disabled]="updatingBookingId === b.id || approvingBookingId === b.id"
                      (change)="updateStatus(b, $any($event.target).value)"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>

                    <a [routerLink]="['/receipt', b.id]" class="btn-secondary text-xs">Receipt</a>

                    <button
                      type="button"
                      class="btn-success text-xs"
                      *ngIf="b.payment_status === 'pending_verification'"
                      (click)="approvePayment(b)"
                      [disabled]="approvingBookingId === b.id"
                      [class.btn-loading]="approvingBookingId === b.id"
                    >
                      Approve Payment
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `
})
export class BookingsListComponent {
  bookings: AdminBooking[] = [];
  hotels: AdminHotel[] = [];
  loading = false;
  isHotelAdmin = false;
  updatingBookingId: number | null = null;
  approvingBookingId: number | null = null;

  filter = {
    status: '',
    paymentStatus: '',
    propertyType: '',
    hotelId: '',
    from: '',
    to: '',
    checkInFrom: '',
    checkInTo: '',
    search: ''
  };

  private readonly dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  constructor(private http: HttpClient, private auth: AuthService, private toast: ToastService) {
    const user = this.auth.getCurrentUser();
    this.isHotelAdmin = user?.role === 'hotel-admin';
    if (this.isHotelAdmin) {
      this.filter.status = 'confirmed';
    } else {
      this.loadHotels();
    }
    this.load();
  }

  load(): void {
    this.loading = true;

    let params = new HttpParams();
    if (this.isHotelAdmin) {
      params = params.set('status', 'confirmed');
    } else if (this.filter.status) {
      params = params.set('status', this.filter.status);
    }
    if (!this.isHotelAdmin && this.filter.paymentStatus) params = params.set('paymentStatus', this.filter.paymentStatus);
    if (this.filter.propertyType) params = params.set('propertyType', this.filter.propertyType);
    if (!this.isHotelAdmin && this.filter.hotelId) params = params.set('hotelId', this.filter.hotelId);
    if (this.filter.from) params = params.set('from', this.filter.from);
    if (this.filter.to) params = params.set('to', this.filter.to);
    if (this.filter.checkInFrom) params = params.set('checkInFrom', this.filter.checkInFrom);
    if (this.filter.checkInTo) params = params.set('checkInTo', this.filter.checkInTo);
    if (this.filter.search?.trim()) params = params.set('search', this.filter.search.trim());

    this.http
      .get<AdminBooking[]>(`${environment.apiUrl}/admin/bookings`, { params })
      .subscribe({
        next: (list) => {
          this.bookings = list;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  resetFilters(): void {
    this.filter = {
      status: this.isHotelAdmin ? 'confirmed' : '',
      paymentStatus: '',
      propertyType: '',
      hotelId: '',
      from: '',
      to: '',
      checkInFrom: '',
      checkInTo: '',
      search: ''
    };
    this.load();
  }

  private loadHotels(): void {
    this.http.get<AdminHotel[]>(`${environment.apiUrl}/admin/hotels`).subscribe({
      next: (list) => {
        this.hotels = list || [];
      },
      error: () => {
        this.hotels = [];
      }
    });
  }

  updateStatus(b: AdminBooking, status: string): void {
    this.updatingBookingId = b.id;
    this.http
      .put(`${environment.apiUrl}/admin/bookings/${b.id}/status`, { status })
      .subscribe({
        next: () => {
          this.updatingBookingId = null;
          this.toast.success('Booking updated.');
          this.load();
        },
        error: () => {
          this.updatingBookingId = null;
          this.toast.error('Unable to update booking status.');
        }
      });
  }

  approvePayment(b: AdminBooking): void {
    const ok = window.confirm(
      `Approve payment for booking ${b.booking_ref}? This will mark booking as paid.`
    );
    if (!ok) {
      return;
    }
    this.approvingBookingId = b.id;
    this.http
      .put(`${environment.apiUrl}/admin/bookings/${b.id}/approve-payment`, {})
      .subscribe({
        next: () => {
          this.approvingBookingId = null;
          this.toast.success('Payment approved successfully.');
          this.load();
        },
        error: () => {
          this.approvingBookingId = null;
          this.toast.error('Unable to approve payment.');
        }
      });
  }

  formatDateRange(checkIn: string, checkOut: string): string {
    return `${this.formatDate(checkIn)} to ${this.formatDate(checkOut)}`;
  }

  private formatDate(value: string): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return this.dateFormatter.format(parsed);
  }

  statusClass(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (['pending', 'pending_verification', 'unpaid'].includes(normalized)) return 'pending';
    if (['confirmed', 'paid', 'active', 'success'].includes(normalized)) return 'confirmed';
    if (['cancelled', 'inactive', 'failed'].includes(normalized)) return 'cancelled';
    if (['completed', 'replied'].includes(normalized)) return 'completed';
    if (normalized === 'read') return 'read';
    return 'read';
  }

  downpaymentReceived(booking: AdminBooking): number {
    return booking.payment_status === 'paid' ? Number(booking.registration_amount || 0) : 0;
  }
}
