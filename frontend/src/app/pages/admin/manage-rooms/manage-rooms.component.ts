import { Component } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';

interface AdminRoom {
  id: number;
  name: string;
  type: string;
  capacity: number;
  registrationAmount: number;
  arrivalAmount: number;
  totalPrice: number;
  status: string;
}

@Component({
  selector: 'app-manage-rooms',
  template: `
    <h1 class="font-heading text-2xl mb-4">Manage Rooms</h1>
    <div class="flex justify-between items-center mb-4">
      <div class="text-sm text-muted">
        Add, edit and manage all room listings.
      </div>
      <a routerLink="/admin/rooms/new" class="btn-primary text-xs">Add Room</a>
    </div>
    <app-loading-spinner [show]="loading"></app-loading-spinner>
    <div *ngIf="!loading">
      <div *ngIf="groupedRooms.length === 0" class="text-sm text-muted">
        No rooms created yet.
      </div>
      <div *ngFor="let group of groupedRooms" class="mb-6">
        <h2 class="font-semibold mb-2 text-sm uppercase tracking-widest">
          Hotel: {{ group.hotelName }}
        </h2>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm border border-sand">
            <thead class="bg-sand text-xs uppercase tracking-widest">
              <tr>
                <th class="px-3 py-2 text-left">ID</th>
                <th class="px-3 py-2 text-left">Name</th>
                <th class="px-3 py-2 text-left">Type</th>
                <th class="px-3 py-2 text-left">Capacity</th>
                <th class="px-3 py-2 text-left">Reg.</th>
                <th class="px-3 py-2 text-left">Arrival</th>
                <th class="px-3 py-2 text-left">Total</th>
                <th class="px-3 py-2 text-left">Status</th>
                <th class="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of group.rooms" class="border-t border-sand">
                <td class="px-3 py-2">{{ r.id }}</td>
                <td class="px-3 py-2">{{ r.name }}</td>
                <td class="px-3 py-2">{{ r.type }}</td>
                <td class="px-3 py-2">{{ r.capacity }}</td>
                <td class="px-3 py-2">{{ r.registrationAmount | currencyInr }}</td>
                <td class="px-3 py-2">{{ r.arrivalAmount | currencyInr }}</td>
                <td class="px-3 py-2">{{ r.totalPrice | currencyInr }}</td>
                <td class="px-3 py-2">{{ r.status }}</td>
                <td class="px-3 py-2 space-x-2">
                  <a
                    [routerLink]="['/admin/rooms', r.id, 'edit']"
                    class="btn-primary text-xs inline-block"
                    >Edit</a
                  >
                  <button class="btn-gold text-xs" (click)="toggleStatus(r)">
                    Toggle Status
                  </button>
                  <button class="btn-primary text-xs" (click)="delete(r)">
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
export class ManageRoomsComponent {
  rooms: AdminRoom[] = [];
  groupedRooms: { hotelName: string; rooms: AdminRoom[] }[] = [];
  loading = false;

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<AdminRoom[]>(`${environment.apiUrl}/admin/rooms`).subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        const groups = new Map<string, AdminRoom[]>();
        rooms.forEach((r: any) => {
          const name = r.hotel_name || 'Unassigned';
          if (!groups.has(name)) {
            groups.set(name, []);
          }
          groups.get(name)!.push(r);
        });
        this.groupedRooms = Array.from(groups.entries()).map(([hotelName, rs]) => ({
          hotelName,
          rooms: rs
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggleStatus(room: AdminRoom): void {
    const newStatus = room.status === 'active' ? 'inactive' : 'active';
    this.http
      .put<AdminRoom>(`${environment.apiUrl}/admin/rooms/${room.id}`, {
        ...room,
        status: newStatus
      })
      .subscribe({
        next: () => this.load(),
        error: () => {}
      });
  }

  delete(room: AdminRoom): void {
    if (!confirm('Delete this room?')) {
      return;
    }
    this.http.delete(`${environment.apiUrl}/admin/rooms/${room.id}`).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }
}
