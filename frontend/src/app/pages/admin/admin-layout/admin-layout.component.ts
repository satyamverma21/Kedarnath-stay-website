import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  template: `
    <div class="flex min-h-screen">
      <aside class="admin-sidebar w-56 lg:w-60 shrink-0">
        <div class="px-4 py-4 border-b border-white/10 font-heading text-cream text-sm uppercase tracking-widest">
          Admin Panel
        </div>
        <nav class="mt-2 text-sm">
          <a routerLink="/admin/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Dashboard</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/hotels" routerLinkActive="active">Hotels</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/users" routerLinkActive="active">Users</a>
          <a routerLink="/admin/rooms" routerLinkActive="active">Rooms</a>
          <a routerLink="/admin/tents" routerLinkActive="active">Tents</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/promo-codes" routerLinkActive="active">Promo Codes</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/price-settings" routerLinkActive="active">Price Settings</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/bookings" routerLinkActive="active">Bookings</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/enquiries" routerLinkActive="active">Enquiries</a>
        </nav>
      </aside>
      <main class="flex-1 bg-cream min-w-0">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  constructor(private auth: AuthService) {}

  get isSuperAdmin(): boolean {
    const user = this.auth.getCurrentUser();
    return !!user && user.role === 'admin';
  }
}

