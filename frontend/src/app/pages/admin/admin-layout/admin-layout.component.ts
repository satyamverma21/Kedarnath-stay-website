import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  template: `
    <div class="admin-layout min-h-screen">
      <header class="admin-mobile-topbar lg:hidden">
        <button
          type="button"
          class="admin-mobile-toggle"
          (click)="toggleMobileMenu()"
          [attr.aria-expanded]="mobileMenuOpen"
          aria-controls="admin-side-nav"
        >
          <span>{{ mobileMenuOpen ? 'Close' : 'Menu' }}</span>
        </button>
        <div class="font-heading text-cream text-xs uppercase tracking-widest">Admin Panel</div>
      </header>

      <button
        type="button"
        *ngIf="mobileMenuOpen"
        class="admin-sidebar-backdrop lg:hidden"
        (click)="closeMobileMenu()"
        aria-label="Close navigation"
      ></button>

      <aside class="admin-sidebar w-56 lg:w-60 shrink-0" [class.is-open]="mobileMenuOpen" id="admin-side-nav">
        <div class="px-4 py-4 border-b border-white/10 font-heading text-cream text-sm uppercase tracking-widest">
          Admin Panel
        </div>
        <nav class="mt-2 text-sm">
          <a routerLink="/admin/dashboard" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" (click)="closeMobileMenu()">Dashboard</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/hotels" routerLinkActive="active" (click)="closeMobileMenu()">Hotels</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/users" routerLinkActive="active" (click)="closeMobileMenu()">Users</a>
          <a routerLink="/admin/rooms" routerLinkActive="active" (click)="closeMobileMenu()">Rooms</a>
          <a routerLink="/admin/inventory" routerLinkActive="active" (click)="closeMobileMenu()">Inventory</a>
          <a routerLink="/admin/tents" routerLinkActive="active" (click)="closeMobileMenu()">Tents</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/promo-codes" routerLinkActive="active" (click)="closeMobileMenu()">Promo Codes</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/price-settings" routerLinkActive="active" (click)="closeMobileMenu()">Price Settings</a>
          <a routerLink="/admin/bookings" routerLinkActive="active" (click)="closeMobileMenu()">Bookings</a>
          <a *ngIf="isSuperAdmin" routerLink="/admin/enquiries" routerLinkActive="active" (click)="closeMobileMenu()">Enquiries</a>
        </nav>
      </aside>

      <main class="admin-shell flex-1 min-w-0">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `
})
export class AdminLayoutComponent {
  mobileMenuOpen = false;

  constructor(private auth: AuthService) {}

  get isSuperAdmin(): boolean {
    const user = this.auth.getCurrentUser();
    return !!user && user.role === 'admin';
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}

