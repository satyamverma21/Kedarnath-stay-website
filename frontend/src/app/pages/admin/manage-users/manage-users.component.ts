import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';

interface AdminHotelOption {
  id: number;
  name: string;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  hotel_id?: number | null;
  hotel_name?: string | null;
}

@Component({
  selector: 'app-manage-users',
  standalone: false,
  template: `
    <h1 class="font-heading text-2xl mb-4">User Master (Hotel-wise)</h1>
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-2 text-sm">
        <label class="text-xs uppercase tracking-widest text-muted">Hotel</label>
        <select class="text-sm" [(ngModel)]="selectedHotelId" (change)="load()">
          <option [ngValue]="null">All</option>
          <option *ngFor="let h of hotels" [ngValue]="h.id">{{ h.name }}</option>
        </select>
      </div>
      <a routerLink="/admin/users/new" class="btn-primary text-xs">Add User</a>
    </div>
    <app-loading-spinner [show]="loading"></app-loading-spinner>
    <div *ngIf="!loading">
      <div *ngIf="users.length === 0" class="text-sm text-muted">
        No users found for selected filter.
      </div>
      <div *ngIf="users.length" class="overflow-x-auto">
        <table class="min-w-full text-sm border border-sand">
          <thead class="bg-sand text-xs uppercase tracking-widest">
            <tr>
              <th class="px-3 py-2 text-left">ID</th>
              <th class="px-3 py-2 text-left">Name</th>
              <th class="px-3 py-2 text-left">Phone</th>
              <th class="px-3 py-2 text-left">Email</th>
              <th class="px-3 py-2 text-left">Role</th>
              <th class="px-3 py-2 text-left">Hotel</th>
              <th class="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of users" class="border-t border-sand">
              <td class="px-3 py-2">{{ u.id }}</td>
              <td class="px-3 py-2">{{ u.name }}</td>
              <td class="px-3 py-2">{{ u.phone || '–' }}</td>
              <td class="px-3 py-2">{{ u.email }}</td>
              <td class="px-3 py-2">{{ u.role }}</td>
              <td class="px-3 py-2">{{ u.hotel_name || '–' }}</td>
              <td class="px-3 py-2 space-x-2">
                <a
                  [routerLink]="['/admin/users', u.id, 'edit']"
                  class="btn-primary text-xs inline-block"
                  >Edit</a
                >
                <button class="btn-primary text-xs" (click)="delete(u)">
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
export class ManageUsersComponent {
  users: AdminUser[] = [];
  hotels: AdminHotelOption[] = [];
  selectedHotelId: number | null = null;
  loading = false;

  constructor(private http: HttpClient) {
    this.loadHotels();
    this.load();
  }

  loadHotels(): void {
    this.http.get<AdminHotelOption[]>(`${environment.apiUrl}/admin/hotels`).subscribe({
      next: (hotels) => {
        this.hotels = hotels;
      },
      error: () => {}
    });
  }

  load(): void {
    this.loading = true;
    const params: any = {};
    if (this.selectedHotelId != null) {
      params.hotelId = this.selectedHotelId;
    }
    this.http.get<AdminUser[]>(`${environment.apiUrl}/admin/users`, { params }).subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  delete(user: AdminUser): void {
    if (!confirm('Delete this user?')) {
      return;
    }
    this.http.delete(`${environment.apiUrl}/admin/users/${user.id}`).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }
}

