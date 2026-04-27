import { Component } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';

interface RoomBookingItem {
  id: number;
  source_type?: 'booking' | 'manual';
  manual_booking_id?: number | null;
  booking_ref: string;
  check_in: string;
  check_out: string;
  room_unit_label?: string;
  room_unit_ids?: number[];
  manual_booked_quantity?: number;
  status: string;
  payment_status?: string;
  registration_amount?: number;
  arrival_amount?: number;
  total_amount?: number;
  created_at?: string;
  guest_name?: string;
  guest_phone?: string;
}

interface RoomBookingResponse {
  room: {
    id: number;
    name: string;
    type: string;
    quantity: number;
    hotel_id: number | null;
    hotel_name: string;
  };
  currentAndUpcoming: RoomBookingItem[];
  past: RoomBookingItem[];
}

@Component({
  selector: 'app-room-bookings',
  template: `
    <section class="space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <a routerLink="/admin/inventory" class="text-xs text-blue-600 hover:underline">&larr; Back to Inventory</a>
          <h1 class="font-heading text-2xl mt-1">Room Bookings</h1>
          <p class="text-sm text-muted mt-1" *ngIf="roomName">
            {{ roomName }} ({{ roomType }}) &middot; {{ hotelName }}
          </p>
        </div>
        <button class="btn-secondary text-xs" (click)="load()" [disabled]="loading" [class.btn-loading]="loading">
          Refresh
        </button>
      </div>

      <app-loading-spinner [show]="loading"></app-loading-spinner>

      <div class="card p-3 sm:p-4">
        <h2 class="font-semibold text-sm uppercase tracking-widest mb-3">Current & Upcoming</h2>
        <div *ngIf="!loading && !currentAndUpcoming.length" class="text-sm text-muted">
          No current or upcoming bookings for this room.
        </div>
        <div *ngIf="currentAndUpcoming.length" class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Room ID(s)</th>
                <th>Guest</th>
                <th>Contact</th>
                <th>Stay</th>
                <th>Status</th>
                <th>Due On Arrival</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of currentAndUpcoming">
                <td>{{ b.booking_ref }}</td>
                <td>{{ b.room_unit_label || '-' }}</td>
                <td>{{ b.guest_name || '-' }}</td>
                <td>{{ b.guest_phone || '-' }}</td>
                <td>{{ b.check_in }} to {{ b.check_out }}</td>
                <td><span class="status-pill" [ngClass]="statusClass(b.status)">{{ b.status }}</span></td>
                <td>{{ (b.arrival_amount ?? 0) | currencyInr }}</td>
                <td>
                  <button
                    class="btn-danger text-xs"
                    (click)="cancelBooking(b)"
                    [disabled]="cancelingBookingId === b.id || !canCancel(b)"
                    [class.btn-loading]="cancelingBookingId === b.id"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card p-3 sm:p-4">
        <h2 class="font-semibold text-sm uppercase tracking-widest mb-3">Past Bookings</h2>
        <div *ngIf="!loading && !past.length" class="text-sm text-muted">No past bookings for this room.</div>
        <div *ngIf="past.length" class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Room ID(s)</th>
                <th>Guest</th>
                <th>Contact</th>
                <th>Stay</th>
                <th>Status</th>
                <th>Due On Arrival</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of past">
                <td>{{ b.booking_ref }}</td>
                <td>{{ b.room_unit_label || '-' }}</td>
                <td>{{ b.guest_name || '-' }}</td>
                <td>{{ b.guest_phone || '-' }}</td>
                <td>{{ b.check_in }} to {{ b.check_out }}</td>
                <td><span class="status-pill" [ngClass]="statusClass(b.status)">{{ b.status }}</span></td>
                <td>{{ (b.arrival_amount ?? 0) | currencyInr }}</td>
                <td>
                  <button
                    class="btn-danger text-xs"
                    (click)="cancelBooking(b)"
                    [disabled]="cancelingBookingId === b.id || !canCancel(b)"
                    [class.btn-loading]="cancelingBookingId === b.id"
                  >
                    Cancel
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `
})
export class RoomBookingsComponent {
  roomId = 0;
  roomName = '';
  roomType = '';
  hotelName = '';
  loading = false;
  cancelingBookingId: number | null = null;
  currentAndUpcoming: RoomBookingItem[] = [];
  past: RoomBookingItem[] = [];

  constructor(private route: ActivatedRoute, private http: HttpClient, private toast: ToastService) {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('roomId'));
      if (!Number.isInteger(id) || id <= 0) {
        this.toast.error('Invalid room.');
        return;
      }
      this.roomId = id;
      this.load();
    });
  }

  load(): void {
    if (!this.roomId) return;
    this.loading = true;
    this.http
      .get<RoomBookingResponse>(`${environment.apiUrl}/admin/inventory/rooms/${this.roomId}/bookings`)
      .subscribe({
        next: (resp) => {
          this.roomName = resp.room?.name || '';
          this.roomType = resp.room?.type || '';
          this.hotelName = resp.room?.hotel_name || '';
          this.currentAndUpcoming = resp.currentAndUpcoming || [];
          this.past = resp.past || [];
          this.loading = false;
        },
        error: (err) => {
          this.loading = false;
          this.currentAndUpcoming = [];
          this.past = [];
          this.toast.error(err?.error?.message || 'Unable to load room bookings.');
        }
      });
  }

  canCancel(booking: RoomBookingItem): boolean {
    return booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'manual';
  }

  cancelBooking(booking: RoomBookingItem): void {
    if (!this.canCancel(booking)) {
      return;
    }
    if (!window.confirm(`Cancel booking ${booking.booking_ref}?`)) {
      return;
    }
    this.cancelingBookingId = booking.id;
    const request$ =
      booking.source_type === 'manual' && booking.manual_booking_id
        ? this.http.delete(`${environment.apiUrl}/admin/inventory/manual-bookings/${booking.manual_booking_id}`)
        : this.http.put(`${environment.apiUrl}/admin/bookings/${booking.id}/status`, { status: 'cancelled' });
    request$.subscribe({
      next: () => {
        this.cancelingBookingId = null;
        this.toast.success(booking.source_type === 'manual' ? 'Manual booking cancelled.' : 'Booking cancelled.');
        this.load();
      },
      error: (err) => {
        this.cancelingBookingId = null;
        this.toast.error(err?.error?.message || 'Unable to cancel booking.');
      }
    });
  }

  statusClass(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'manual') return 'confirmed';
    if (['pending', 'pending_verification', 'unpaid'].includes(normalized)) return 'pending';
    if (['confirmed', 'paid', 'active', 'success'].includes(normalized)) return 'confirmed';
    if (['cancelled', 'inactive', 'failed'].includes(normalized)) return 'cancelled';
    if (['completed', 'replied'].includes(normalized)) return 'completed';
    if (normalized === 'read') return 'read';
    return 'read';
  }
}

