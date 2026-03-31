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
    <h1 class="font-heading text-2xl mb-4">User Master (Role-wise)</h1>
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
    <div *ngIf="errorMessage" class="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
      {{ errorMessage }}
    </div>
    <app-loading-spinner [show]="loading"></app-loading-spinner>
    <div *ngIf="!loading">
      <div *ngIf="groupedUsers.length === 0" class="text-sm text-muted">
        No users found for selected filter.
      </div>
      <div *ngFor="let group of groupedUsers" class="mb-6">
        <h2 class="font-semibold mb-2 text-sm uppercase tracking-widest">
          {{ group.role | titlecase }}
        </h2>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm border border-sand">
            <thead class="bg-sand text-xs uppercase tracking-widest">
              <tr>
                <th class="px-3 py-2 text-left">ID</th>
                <th class="px-3 py-2 text-left">Name</th>
                <th class="px-3 py-2 text-left">Phone</th>
                <th class="px-3 py-2 text-left">Email</th>
                <th class="px-3 py-2 text-left">Hotel</th>
                <th class="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let u of group.users" class="border-t border-sand">
                <td class="px-3 py-2">{{ u.id }}</td>
                <td class="px-3 py-2">{{ u.name }}</td>
                <td class="px-3 py-2">{{ u.phone || '–' }}</td>
                <td class="px-3 py-2">{{ u.email }}</td>
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
    </div>
  `
})
export class ManageUsersComponent {
  users: AdminUser[] = [];
  hotels: AdminHotelOption[] = [];
  selectedHotelId: number | null = null;
  loading = false;
  errorMessage = '';
  groupedUsers: { role: string; users: AdminUser[] }[] = [];

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
    this.errorMessage = '';
    const params: any = {};
    if (this.selectedHotelId != null) {
      params.hotelId = this.selectedHotelId;
    }
    this.http.get<AdminUser[]>(`${environment.apiUrl}/admin/users`, { params }).subscribe({
      next: (users) => {
        this.users = users;
        this.groupUsersByRole();
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to load users';
        this.loading = false;
      }
    });
  }

  groupUsersByRole(): void {
    const groups = new Map<string, AdminUser[]>();
    
    this.users.forEach(user => {
      const role = user.role || 'unknown';
      if (!groups.has(role)) {
        groups.set(role, []);
      }
      groups.get(role)!.push(user);
    });

    this.groupedUsers = Array.from(groups.entries()).map(([role, users]) => ({
      role,
      users
    }));
  }

  delete(user: AdminUser): void {
    if (!confirm('Delete this user?')) {
      return;
    }
    this.http.delete(`${environment.apiUrl}/admin/users/${user.id}`).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Failed to delete user';
      }
    });
  }
}

