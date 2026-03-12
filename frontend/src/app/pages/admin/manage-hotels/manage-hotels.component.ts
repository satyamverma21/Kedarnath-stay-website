import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';

interface AdminHotel {
  id: number;
  name: string;
  city?: string | null;
  status: string;
}

@Component({
  selector: 'app-manage-hotels',
  standalone: false,
  template: `
    <h1 class="font-heading text-2xl mb-4">Hotel Master</h1>
    <div class="flex justify-between items-center mb-4">
      <div class="text-sm text-muted">
        Create, edit and manage hotels/branches.
      </div>
      <a routerLink="/admin/hotels/new" class="btn-primary text-xs">Add Hotel</a>
    </div>
    <app-loading-spinner [show]="loading"></app-loading-spinner>
    <div *ngIf="!loading">
      <div *ngIf="hotels.length === 0" class="text-sm text-muted">
        No hotels created yet.
      </div>
      <div *ngIf="hotels.length" class="overflow-x-auto">
        <table class="min-w-full text-sm border border-sand">
          <thead class="bg-sand text-xs uppercase tracking-widest">
            <tr>
              <th class="px-3 py-2 text-left">ID</th>
              <th class="px-3 py-2 text-left">Name</th>
              <th class="px-3 py-2 text-left">City</th>
              <th class="px-3 py-2 text-left">Status</th>
              <th class="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of hotels" class="border-t border-sand">
              <td class="px-3 py-2">{{ h.id }}</td>
              <td class="px-3 py-2">{{ h.name }}</td>
              <td class="px-3 py-2">{{ h.city || '–' }}</td>
              <td class="px-3 py-2">{{ h.status }}</td>
              <td class="px-3 py-2 space-x-2">
                <a
                  [routerLink]="['/admin/hotels', h.id, 'edit']"
                  class="btn-primary text-xs inline-block"
                  >Edit</a
                >
                <button class="btn-gold text-xs" (click)="toggleStatus(h)">
                  Toggle Status
                </button>
                <button class="btn-primary text-xs" (click)="delete(h)">
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ManageHotelsComponent {
  hotels: AdminHotel[] = [];
  loading = false;

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<AdminHotel[]>(`${environment.apiUrl}/admin/hotels`).subscribe({
      next: (hotels) => {
        this.hotels = hotels;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggleStatus(hotel: AdminHotel): void {
    const newStatus = hotel.status === 'active' ? 'inactive' : 'active';
    this.http
      .put<AdminHotel>(`${environment.apiUrl}/admin/hotels/${hotel.id}`, {
        ...hotel,
        status: newStatus
      })
      .subscribe({
        next: () => this.load(),
        error: () => {}
      });
  }

  delete(hotel: AdminHotel): void {
    if (!confirm('Delete this hotel?')) {
      return;
    }
    this.http.delete(`${environment.apiUrl}/admin/hotels/${hotel.id}`).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }
}

