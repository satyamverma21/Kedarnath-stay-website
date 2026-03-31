import { Component } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';

interface AdminTent {
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
  selector: 'app-manage-tents',
  template: `
    <h1 class="font-heading text-2xl mb-4">Manage Tents</h1>
    <div class="flex justify-between items-center mb-4">
      <div class="text-sm text-muted">
        Add, edit and manage all tent listings.
      </div>
      <a routerLink="/admin/tents/new" class="btn-primary text-xs">Add Tent</a>
    </div>
    <app-loading-spinner [show]="loading"></app-loading-spinner>
    <div *ngIf="!loading">
      <div *ngIf="groupedTents.length === 0" class="text-sm text-muted">
        No tents created yet.
      </div>
      <div *ngFor="let group of groupedTents" class="mb-6">
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
              <tr *ngFor="let t of group.tents" class="border-t border-sand">
                <td class="px-3 py-2">{{ t.id }}</td>
                <td class="px-3 py-2">{{ t.name }}</td>
                <td class="px-3 py-2">{{ t.type }}</td>
                <td class="px-3 py-2">{{ t.capacity }}</td>
                <td class="px-3 py-2">{{ t.registrationAmount | currencyInr }}</td>
                <td class="px-3 py-2">{{ t.arrivalAmount | currencyInr }}</td>
                <td class="px-3 py-2">{{ t.totalPrice | currencyInr }}</td>
                <td class="px-3 py-2">{{ t.status }}</td>
                <td class="px-3 py-2 space-x-2">
                  <a
                    [routerLink]="['/admin/tents', t.id, 'edit']"
                    class="btn-primary text-xs inline-block"
                    >Edit</a
                  >
                  <button class="btn-gold text-xs" (click)="toggleStatus(t)">
                    Toggle Status
                  </button>
                  <button class="btn-primary text-xs" (click)="delete(t)">
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
export class ManageTentsComponent {
  tents: AdminTent[] = [];
  groupedTents: { hotelName: string; tents: AdminTent[] }[] = [];
  loading = false;

  constructor(private http: HttpClient) {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<AdminTent[]>(`${environment.apiUrl}/admin/tents`).subscribe({
      next: (tents) => {
        this.tents = tents;
        const groups = new Map<string, AdminTent[]>();
        tents.forEach((t: any) => {
          const name = t.hotel_name || 'Unassigned';
          if (!groups.has(name)) {
            groups.set(name, []);
          }
          groups.get(name)!.push(t);
        });
        this.groupedTents = Array.from(groups.entries()).map(([hotelName, ts]) => ({
          hotelName,
          tents: ts
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggleStatus(tent: AdminTent): void {
    const newStatus = tent.status === 'active' ? 'inactive' : 'active';
    this.http
      .put<AdminTent>(`${environment.apiUrl}/admin/tents/${tent.id}`, {
        ...tent,
        status: newStatus
      })
      .subscribe({
        next: () => this.load(),
        error: () => {}
      });
  }

  delete(tent: AdminTent): void {
    if (!confirm('Delete this tent?')) {
      return;
    }
    this.http.delete(`${environment.apiUrl}/admin/tents/${tent.id}`).subscribe({
      next: () => this.load(),
      error: () => {}
    });
  }
}
