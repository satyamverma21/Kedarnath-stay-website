import { Component } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { RouterLink } from '@angular/router';

interface AdminHotel {
  id: number;
  name: string;
}

interface InventoryRow {
  room_id: number;
  room_name: string;
  room_type: string;
  room_status: string;
  capacity: number;
  hotel_id: number | null;
  hotel_name: string;
  registered_quantity: number;
  actual_booked_quantity?: number;
  manual_booked_quantity?: number;
  booked_quantity: number;
  available_quantity: number;
  occupancy_percent: number;
  registration_amount: number;
  arrival_amount: number;
  total_price: number;
}

interface InventoryHotelSummary {
  hotel_id: number | null;
  hotel_name: string;
  room_types: number;
  registered_quantity: number;
  booked_quantity: number;
  available_quantity: number;
  occupancy_percent: number;
}

interface InventoryResponse {
  period: {
    from: string;
    to: string;
  };
  summary: {
    room_types: number;
    hotels: number;
    registered_quantity: number;
    booked_quantity: number;
    available_quantity: number;
    occupancy_percent: number;
  };
  hotelSummary: InventoryHotelSummary[];
  rows: InventoryRow[];
}

@Component({
  selector: 'app-inventory',
  template: `
    <section class="space-y-5">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="font-heading text-2xl">Inventory</h1>
          <p class="text-sm text-muted mt-1">
            Registered room stock vs booked rooms for the selected period.
          </p>
        </div>
        <button class="btn-secondary text-xs" (click)="load()" [disabled]="loading" [class.btn-loading]="loading">
          Refresh
        </button>
      </div>

      <div class="card p-4 sm:p-5 text-sm">
        <div class="grid md:grid-cols-5 gap-3">
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">From</label>
            <input type="date" [(ngModel)]="filter.from" class="w-full" />
          </div>

          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">To</label>
            <input type="date" [(ngModel)]="filter.to" class="w-full" />
          </div>

          <div *ngIf="!isHotelAdmin">
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Hotel</label>
            <select [(ngModel)]="filter.hotelId" class="w-full">
              <option value="">All Hotels</option>
              <option *ngFor="let h of hotels" [value]="h.id">{{ h.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Type</label>
            <select [(ngModel)]="filter.type" class="w-full">
              <option value="">All</option>
              <option value="standard">Standard</option>
              <option value="deluxe">Deluxe</option>
              <option value="suite">Suite</option>
              <option value="family">Family</option>
            </select>
          </div>

          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Status</label>
            <select [(ngModel)]="filter.status" class="w-full">
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div class="grid md:grid-cols-[1fr,auto,auto] gap-3 mt-3 items-end">
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Search</label>
            <input
              type="text"
              [(ngModel)]="filter.search"
              class="w-full"
              placeholder="Room / type / hotel"
            />
          </div>
          <button class="btn-primary text-xs h-10" (click)="load()" [disabled]="loading" [class.btn-loading]="loading">
            Apply Filters
          </button>
          <button class="btn-tertiary text-xs h-10" (click)="resetFilters()" [disabled]="loading">
            Reset
          </button>
        </div>
      </div>

      <div class="card p-4 sm:p-5 text-sm">
        <h2 class="font-semibold text-sm uppercase tracking-widest mb-3">Manual Room Booking</h2>
        <p class="text-muted text-xs mb-3">
          Mark a room as manually booked for a date range. Use quantity 0 to remove an existing manual block for the same room and dates.
        </p>

        <div class="grid md:grid-cols-5 gap-3 items-end">
          <div class="md:col-span-2">
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Room</label>
            <select [(ngModel)]="manualBooking.roomId" class="w-full" [disabled]="!rows.length || loading || savingManualBooking">
              <option value="" disabled>Select room</option>
              <option *ngFor="let row of rows" [value]="row.room_id">
                {{ row.room_name }} ({{ row.hotel_name }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">From</label>
            <input type="date" [(ngModel)]="manualBooking.from" class="w-full" />
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">To</label>
            <input type="date" [(ngModel)]="manualBooking.to" class="w-full" />
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Booked Qty</label>
            <input type="number" min="0" class="w-full" [(ngModel)]="manualBooking.bookedQuantity" />
          </div>
        </div>

        <div class="mt-3 grid md:grid-cols-[1fr,auto] gap-3 items-end">
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest text-muted">Notes (Optional)</label>
            <input
              type="text"
              [(ngModel)]="manualBooking.notes"
              class="w-full"
              maxlength="500"
              placeholder="e.g. corporate hold, maintenance, internal booking"
            />
          </div>
          <button
            class="btn-primary text-xs h-10"
            (click)="saveManualBooking()"
            [disabled]="loading || savingManualBooking || !rows.length"
            [class.btn-loading]="savingManualBooking"
          >
            Save Manual Booking
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="card p-4">
          <div class="text-xs uppercase tracking-widest text-muted">Room Types</div>
          <div class="text-2xl font-semibold mt-1">{{ data.summary.room_types }}</div>
        </div>
        <div class="card p-4">
          <div class="text-xs uppercase tracking-widest text-muted">Registered Rooms</div>
          <div class="text-2xl font-semibold mt-1">{{ data.summary.registered_quantity }}</div>
        </div>
        <div class="card p-4">
          <div class="text-xs uppercase tracking-widest text-muted">Booked Rooms</div>
          <div class="text-2xl font-semibold mt-1">{{ data.summary.booked_quantity }}</div>
        </div>
        <div class="card p-4">
          <div class="text-xs uppercase tracking-widest text-muted">Available Rooms</div>
          <div class="text-2xl font-semibold mt-1">{{ data.summary.available_quantity }}</div>
        </div>
      </div>

      <div *ngIf="!isHotelAdmin && data.hotelSummary.length" class="card p-3 sm:p-4">
        <h2 class="font-semibold text-sm uppercase tracking-widest mb-3">Hotel-Wise Inventory</h2>
        <div class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Hotel</th>
                <th>Types</th>
                <th>Registered</th>
                <th>Booked</th>
                <th>Available</th>
                <th>Occupancy</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let h of data.hotelSummary">
                <td class="font-medium">{{ h.hotel_name }}</td>
                <td>{{ h.room_types }}</td>
                <td>{{ h.registered_quantity }}</td>
                <td>{{ h.booked_quantity }}</td>
                <td>{{ h.available_quantity }}</td>
                <td>{{ h.occupancy_percent }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <app-loading-spinner [show]="loading"></app-loading-spinner>

      <div *ngIf="!loading && !rows.length" class="card p-6 text-sm text-muted">
        No inventory rows found for the selected filters.
      </div>

      <div *ngIf="rows.length" class="card p-3 sm:p-4">
        <h2 class="font-semibold text-sm uppercase tracking-widest mb-3">
          Room Inventory
          <span class="text-muted normal-case font-normal ml-1">
            ({{ data.period.from }} to {{ data.period.to }})
          </span>
        </h2>
        <div class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th *ngIf="!isHotelAdmin">Hotel</th>
                <th>Room</th>
                <th>Type</th>
                <th>Status</th>
                <th>Capacity</th>
                <th>Registered</th>
                <th>Manual</th>
                <th>Booked</th>
                <th>Available</th>
                <th>Occupancy</th>
                <th>Price / Night</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of rows">
                <td *ngIf="!isHotelAdmin">{{ row.hotel_name }}</td>
                <td class="font-medium">
                  <a [routerLink]="['/admin/inventory/rooms', row.room_id, 'bookings']" class="text-blue-600 hover:underline">
                    {{ row.room_name }}
                  </a>
                </td>
                <td>{{ row.room_type }}</td>
                <td>
                  <span class="status-pill" [ngClass]="row.room_status === 'active' ? 'confirmed' : 'cancelled'">
                    {{ row.room_status }}
                  </span>
                </td>
                <td>{{ row.capacity }}</td>
                <td>{{ row.registered_quantity }}</td>
                <td>{{ row.manual_booked_quantity || 0 }}</td>
                <td>{{ row.booked_quantity }}</td>
                <td>{{ row.available_quantity }}</td>
                <td>{{ row.occupancy_percent }}%</td>
                <td>{{ row.arrival_amount | currencyInr }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `
})
export class InventoryComponent {
  hotels: AdminHotel[] = [];
  rows: InventoryRow[] = [];
  loading = false;
  savingManualBooking = false;
  isHotelAdmin = false;

  data: InventoryResponse = {
    period: { from: '', to: '' },
    summary: {
      room_types: 0,
      hotels: 0,
      registered_quantity: 0,
      booked_quantity: 0,
      available_quantity: 0,
      occupancy_percent: 0
    },
    hotelSummary: [],
    rows: []
  };

  filter = {
    from: '',
    to: '',
    hotelId: '',
    type: '',
    status: '',
    search: ''
  };

  manualBooking = {
    roomId: '',
    from: '',
    to: '',
    bookedQuantity: 1,
    notes: ''
  };

  constructor(private http: HttpClient, private auth: AuthService, private toast: ToastService) {
    const user = this.auth.getCurrentUser();
    this.isHotelAdmin = user?.role === 'hotel-admin';
    this.resetFilters();
    if (!this.isHotelAdmin) {
      this.loadHotels();
    }
    this.load();
  }

  private loadHotels(): void {
    this.http.get<AdminHotel[]>(`${environment.apiUrl}/admin/hotels`).subscribe({
      next: (hotels) => {
        this.hotels = hotels || [];
      },
      error: () => {
        this.hotels = [];
      }
    });
  }

  resetFilters(): void {
    const today = this.toYmd(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = this.toYmd(tomorrowDate);

    this.filter = {
      from: today,
      to: tomorrow,
      hotelId: '',
      type: '',
      status: '',
      search: ''
    };

    this.manualBooking.from = today;
    this.manualBooking.to = tomorrow;
  }

  load(): void {
    this.loading = true;
    let params = new HttpParams()
      .set('from', this.filter.from)
      .set('to', this.filter.to);

    if (!this.isHotelAdmin && this.filter.hotelId) params = params.set('hotelId', this.filter.hotelId);
    if (this.filter.type) params = params.set('type', this.filter.type);
    if (this.filter.status) params = params.set('status', this.filter.status);
    if (this.filter.search?.trim()) params = params.set('search', this.filter.search.trim());

    this.http.get<InventoryResponse>(`${environment.apiUrl}/admin/inventory`, { params }).subscribe({
      next: (resp) => {
        this.data = resp;
        this.rows = resp.rows || [];
        const roomStillVisible = this.rows.some((row) => String(row.room_id) === this.manualBooking.roomId);
        if (!roomStillVisible) {
          this.manualBooking.roomId = this.rows.length ? String(this.rows[0].room_id) : '';
        }
        this.loading = false;
      },
      error: () => {
        this.rows = [];
        this.loading = false;
      }
    });
  }

  saveManualBooking(): void {
    const roomId = Number(this.manualBooking.roomId);
    const bookedQuantity = Number(this.manualBooking.bookedQuantity);

    if (!roomId) {
      this.toast.error('Please select a room.');
      return;
    }
    if (!this.manualBooking.from || !this.manualBooking.to || this.manualBooking.to <= this.manualBooking.from) {
      this.toast.error('Please choose a valid date range.');
      return;
    }
    if (!Number.isInteger(bookedQuantity) || bookedQuantity < 0) {
      this.toast.error('Booked quantity must be a whole number.');
      return;
    }

    this.savingManualBooking = true;
    this.http
      .post(`${environment.apiUrl}/admin/inventory/manual-bookings`, {
        roomId,
        from: this.manualBooking.from,
        to: this.manualBooking.to,
        bookedQuantity,
        notes: this.manualBooking.notes?.trim() || null
      })
      .subscribe({
        next: () => {
          this.savingManualBooking = false;
          this.toast.success(bookedQuantity === 0 ? 'Manual booking removed.' : 'Manual booking saved.');
          this.load();
        },
        error: (err) => {
          this.savingManualBooking = false;
          this.toast.error(err?.error?.message || 'Unable to save manual booking.');
        }
      });
  }

  private toYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
