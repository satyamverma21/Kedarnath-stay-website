import { Component } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';

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
    <section class="space-y-4">
      <div class="flex flex-wrap justify-between items-start sm:items-center gap-3">
        <div>
          <h1 class="font-heading text-2xl">Manage Tents</h1>
          <p class="text-sm text-muted mt-1">Tent inventory grouped by hotel.</p>
        </div>
        <a routerLink="/admin/tents/new" class="btn-primary text-xs">Add Tent</a>
      </div>

      <app-loading-spinner [show]="loading"></app-loading-spinner>

      <div *ngIf="!loading && groupedTents.length === 0" class="card p-6 text-sm text-muted">
        No tents created yet.
      </div>

      <div *ngFor="let group of groupedTents" class="card p-3 sm:p-4">
        <h2 class="font-semibold mb-3 text-sm uppercase tracking-widest">Hotel: {{ group.hotelName }}</h2>
        <div class="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Downpayment</th>
                <th>Arrival</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let t of group.tents">
                <td>{{ t.id }}</td>
                <td class="font-medium">{{ t.name }}</td>
                <td>{{ t.type }}</td>
                <td>{{ t.capacity }}</td>
                <td>{{ t.registrationAmount | currencyInr }}</td>
                <td>{{ t.arrivalAmount | currencyInr }}</td>
                <td>{{ t.totalPrice | currencyInr }}</td>
                <td>
                  <span class="status-pill" [ngClass]="t.status === 'active' ? 'confirmed' : 'cancelled'">{{ t.status }}</span>
                </td>
                <td>
                  <div class="admin-actions">
                    <a [routerLink]="['/admin/tents', t.id, 'edit']" class="btn-secondary text-xs">Edit</a>
                    <button class="btn-gold text-xs" (click)="toggleStatus(t)" [disabled]="isActionLoading(t.id, 'toggle')" [class.btn-loading]="isActionLoading(t.id, 'toggle')">Toggle Status</button>
                    <button class="btn-danger text-xs" (click)="delete(t)" [disabled]="isActionLoading(t.id, 'delete')" [class.btn-loading]="isActionLoading(t.id, 'delete')">Delete</button>
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
export class ManageTentsComponent {
  tents: AdminTent[] = [];
  groupedTents: { hotelName: string; tents: AdminTent[] }[] = [];
  loading = false;
  activeActionKey: string | null = null;

  constructor(private http: HttpClient, private toast: ToastService) {
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
    this.activeActionKey = this.actionKey(tent.id, 'toggle');
    this.http
      .put<AdminTent>(`${environment.apiUrl}/admin/tents/${tent.id}`, { status: newStatus })
      .subscribe({
        next: () => {
          this.activeActionKey = null;
          this.toast.success('Tent updated.');
          this.load();
        },
        error: () => {
          this.activeActionKey = null;
          this.toast.error('Unable to update tent status.');
        }
      });
  }

  delete(tent: AdminTent): void {
    if (!confirm('Delete this tent?')) {
      return;
    }
    this.activeActionKey = this.actionKey(tent.id, 'delete');
    this.http.delete(`${environment.apiUrl}/admin/tents/${tent.id}`).subscribe({
      next: () => {
        this.activeActionKey = null;
        this.toast.success('Tent deleted.');
        this.load();
      },
      error: () => {
        this.activeActionKey = null;
        this.toast.error('Unable to delete tent.');
      }
    });
  }

  private actionKey(id: number, action: 'toggle' | 'delete'): string {
    return `${action}:${id}`;
  }

  isActionLoading(id: number, action: 'toggle' | 'delete'): boolean {
    return this.activeActionKey === this.actionKey(id, action);
  }
}
