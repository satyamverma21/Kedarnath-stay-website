import { Component } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CurrencyInrPipe } from '../../../shared/pipes/currency-inr.pipe';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

interface DashboardData {
  totalBookings: number;
  thisMonthRevenue: number;
  occupancy: number;
  pendingEnquiries: number;
  recentBookings: BookingRow[];
  hotelWiseSummary: HotelWiseSummary[];
}

interface HotelWiseSummary {
  hotel_name: string;
  total_bookings: number;
  confirmed_bookings: number;
  pending_bookings: number;
  paid_revenue: number;
}

interface BookingRow {
  booking_ref: string;
  guest_name: string;
  guest_phone: string;
  property_name: string;
  property_type: string;
  check_in: string;
  check_out: string;
  registration_amount?: number;
  arrival_amount: number;
  payment_status?: string;
  status: string;
  hotel_name?: string | null;
}

interface HotelBookingFilters {
  query: string;
  status: string;
  propertyType: string;
}

interface HotelBookingGroup {
  hotelName: string;
  bookings: BookingRow[];
  filters: HotelBookingFilters;
}

@Component({
  selector: 'app-dashboard',
  template: `
    <h1 class="font-heading text-2xl mb-1">Dashboard</h1>
    <p *ngIf="hotelName" class="text-sm text-muted mb-3">
      Hotel: {{ hotelName }}
    </p>
    <app-loading-spinner [show]="loading"></app-loading-spinner>
    <div *ngIf="data && !loading">
      <div class="grid md:grid-cols-4 gap-4 mb-6">
        <div class="card p-4 text-sm">
          <div class="text-muted text-xs uppercase tracking-widest">Total Bookings</div>
          <div class="text-2xl font-semibold">{{ data.totalBookings }}</div>
        </div>
        <div class="card p-4 text-sm">
          <div class="text-muted text-xs uppercase tracking-widest">
            {{ isHotelAdmin ? 'This Month Cash Revenue' : 'This Month Downpayment Revenue' }}
          </div>
          <div class="text-2xl font-semibold">{{ data.thisMonthRevenue | currencyInr }}</div>
        </div>
        <div class="card p-4 text-sm">
          <div class="text-muted text-xs uppercase tracking-widest">Occupancy</div>
          <div class="text-2xl font-semibold">{{ data.occupancy }}%</div>
        </div>
        <div class="card p-4 text-sm">
          <div class="text-muted text-xs uppercase tracking-widest">Pending Enquiries</div>
          <div class="text-2xl font-semibold">{{ data.pendingEnquiries }}</div>
        </div>
      </div>

      <div class="card p-4 mt-6">
        <h2 class="font-semibold mb-2 text-sm uppercase tracking-widest">Hotel-wise Booking Details</h2>
        <div *ngIf="!hotelBookingGroups.length" class="text-xs text-muted">
          No hotel-wise booking data yet.
        </div>
        <div *ngFor="let group of hotelBookingGroups" class="border border-sand rounded-lg p-4 mb-4 bg-cream-strong">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 class="font-semibold text-sm text-dark">{{ group.hotelName }}</h3>
            <span class="text-xs text-muted">
              {{ filteredBookings(group).length }} of {{ group.bookings.length }} bookings
            </span>
          </div>

          <div class="grid md:grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              class="form-input"
              placeholder="Search by ref, guest, contact or unit"
              [value]="group.filters.query"
              (input)="setGroupFilter(group.hotelName, 'query', $any($event.target).value)"
            />
            <select
              class="form-input"
              [value]="group.filters.status"
              (change)="setGroupFilter(group.hotelName, 'status', $any($event.target).value)"
            >
              <option value="">All statuses</option>
              <option *ngFor="let status of statusOptions(group)" [value]="status">{{ status }}</option>
            </select>
            <select
              class="form-input"
              [value]="group.filters.propertyType"
              (change)="setGroupFilter(group.hotelName, 'propertyType', $any($event.target).value)"
            >
              <option value="">All unit types</option>
              <option *ngFor="let type of propertyTypeOptions(group)" [value]="type">{{ type }}</option>
            </select>
          </div>

          <div *ngIf="!filteredBookings(group).length" class="text-xs text-muted">
            No bookings match these filters.
          </div>
          <div *ngIf="filteredBookings(group).length" class="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Guest</th>
                  <th>Contact Number (Booking)</th>
                  <th>Stay</th>
                  <th *ngIf="!isHotelAdmin">Downpayment Received</th>
                  <th>Due On Arrival</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let b of filteredBookings(group)">
                  <td>
                    <div class="admin-ref">{{ b.booking_ref }}</div>
                  </td>
                  <td>
                    <div class="font-medium">{{ b.guest_name || '-' }}</div>
                  </td>
                  <td>{{ b.guest_phone || '-' }}</td>
                  <td>
                    <div class="font-medium">{{ b.property_name || '-' }} <span class="admin-subtext">({{ b.property_type }})</span></div>
                    <div class="admin-subtext">{{ formatDateRange(b.check_in, b.check_out) }}</div>
                  </td>
                  <td *ngIf="!isHotelAdmin" class="font-semibold">{{ downpaymentReceived(b) | currencyInr }}</td>
                  <td class="font-semibold">{{ b.arrival_amount | currencyInr }}</td>
                  <td>
                    <span class="status-pill" [ngClass]="statusClass(b.status)">{{ b.status }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  data: DashboardData | null = null;
  loading = false;
  hotelName: string | null = null;
  isHotelAdmin = false;
  hotelBookingGroups: HotelBookingGroup[] = [];
  private readonly dateFormatter = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  constructor(private http: HttpClient) {
    this.load();
    this.loadHotelName();
  }

  private load(): void {
    this.loading = true;
    this.http.get<DashboardData>(`${environment.apiUrl}/admin/dashboard`).subscribe({
      next: (d) => {
        this.data = d;
        this.buildHotelBookingGroups(d.recentBookings || []);
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private loadHotelName(): void {
    this.http.get<any>(`${environment.apiUrl}/auth/me`).subscribe({
      next: (u) => {
        this.hotelName = u.hotel_name || null;
        this.isHotelAdmin = u?.role === 'hotel-admin';
      },
      error: () => {
        this.hotelName = null;
        this.isHotelAdmin = false;
      }
    });
  }

  private buildHotelBookingGroups(bookings: BookingRow[]): void {
    const byHotel = new Map<string, BookingRow[]>();
    bookings.forEach((booking) => {
      const hotel = booking.hotel_name || 'Unassigned';
      if (!byHotel.has(hotel)) {
        byHotel.set(hotel, []);
      }
      byHotel.get(hotel)!.push(booking);
    });

    this.hotelBookingGroups = Array.from(byHotel.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hotelName, hotelBookings]) => ({
        hotelName,
        bookings: hotelBookings,
        filters: {
          query: '',
          status: '',
          propertyType: ''
        }
      }));
  }

  setGroupFilter(
    hotelName: string,
    key: keyof HotelBookingFilters,
    value: string
  ): void {
    this.hotelBookingGroups = this.hotelBookingGroups.map((group) => {
      if (group.hotelName !== hotelName) {
        return group;
      }
      return {
        ...group,
        filters: {
          ...group.filters,
          [key]: value || ''
        }
      };
    });
  }

  statusOptions(group: HotelBookingGroup): string[] {
    return Array.from(new Set(group.bookings.map((b) => (b.status || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }

  propertyTypeOptions(group: HotelBookingGroup): string[] {
    return Array.from(new Set(group.bookings.map((b) => (b.property_type || '').trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
  }

  filteredBookings(group: HotelBookingGroup): BookingRow[] {
    const query = group.filters.query.trim().toLowerCase();
    const status = group.filters.status.trim().toLowerCase();
    const propertyType = group.filters.propertyType.trim().toLowerCase();

    return group.bookings.filter((booking) => {
      const matchesStatus = !status || (booking.status || '').toLowerCase() === status;
      const matchesType = !propertyType || (booking.property_type || '').toLowerCase() === propertyType;
      const matchesQuery = !query || [
        booking.booking_ref,
        booking.guest_name,
        booking.guest_phone,
        booking.property_name
      ].some((field) => (field || '').toLowerCase().includes(query));
      return matchesStatus && matchesType && matchesQuery;
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
    if (normalized === 'pending') return 'pending';
    if (normalized === 'confirmed') return 'confirmed';
    if (normalized === 'cancelled') return 'cancelled';
    if (normalized === 'completed') return 'completed';
    return 'read';
  }

  downpaymentReceived(booking: BookingRow): number {
    return booking.payment_status === 'paid' ? Number(booking.registration_amount || 0) : 0;
  }
}
