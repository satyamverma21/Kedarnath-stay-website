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
  recentBookings: any[];
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
          <div class="text-muted text-xs uppercase tracking-widest">This Month Revenue</div>
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

      <div class="card p-4">
        <h2 class="font-semibold mb-2 text-sm uppercase tracking-widest">Recent bookings</h2>
        <div *ngIf="!data.recentBookings.length" class="text-xs text-muted">
          No bookings yet.
        </div>
        <div *ngIf="data.recentBookings.length" class="overflow-x-auto">
          <table class="min-w-full text-xs">
            <thead class="bg-sand">
              <tr>
                <th class="px-3 py-2 text-left">Ref</th>
                <th class="px-3 py-2 text-left">Guest</th>
                <th class="px-3 py-2 text-left">Type</th>
                <th class="px-3 py-2 text-left">Dates</th>
                <th class="px-3 py-2 text-left">Amount</th>
                <th class="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let b of data.recentBookings" class="border-t border-sand">
                <td class="px-3 py-2">{{ b.booking_ref }}</td>
                <td class="px-3 py-2">{{ b.guest_name || '–' }}</td>
                <td class="px-3 py-2">{{ b.property_type }}</td>
                <td class="px-3 py-2">
                  {{ b.check_in }} – {{ b.check_out }}
                </td>
                <td class="px-3 py-2">{{ b.total_amount | currencyInr }}</td>
                <td class="px-3 py-2">{{ b.status }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent {
  data: DashboardData | null = null;
  loading = false;
  hotelName: string | null = null;

  constructor(private http: HttpClient) {
    this.load();
    this.loadHotelName();
  }

  private load(): void {
    this.loading = true;
    this.http.get<DashboardData>(`${environment.apiUrl}/admin/dashboard`).subscribe({
      next: (d) => {
        this.data = d;
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
      },
      error: () => {
        this.hotelName = null;
      }
    });
  }
}

