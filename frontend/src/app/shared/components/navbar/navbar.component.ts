import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  template: `
    <header class="sticky top-0 z-50 bg-cream/95 backdrop-blur-sm border-b border-sand/80 shadow-soft">
      <div class="max-w-6xl mx-auto flex items-center justify-between py-3 px-4 sm:px-6">
        <a routerLink="/" class="flex items-center gap-2 shrink-0">
          <span class="font-heading text-xl sm:text-2xl tracking-wide text-forest">Wilderness Stays</span>
        </a>
        <button
          type="button"
          class="md:hidden no-style p-2 rounded-button text-dark hover:bg-sand/50"
          aria-label="Toggle menu"
          (click)="menuOpen = !menuOpen"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path *ngIf="!menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            <path *ngIf="menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <nav
          class="absolute md:relative top-full left-0 right-0 md:top-auto md:left-auto bg-cream md:bg-transparent border-b md:border-0 border-sand md:shadow-none shadow-soft flex flex-col md:flex-row items-stretch md:items-center gap-0 md:gap-6 text-sm tracking-widest uppercase overflow-hidden transition-all duration-300 md:max-h-none md:opacity-100"
          [class.max-h-0]="!menuOpen"
          [class.max-h-[320px]]="menuOpen"
        >
          <a routerLink="/rooms" routerLinkActive="text-forest font-medium" class="hover:text-forest px-4 py-3 md:py-0 border-b md:border-0 border-sand/50" (click)="menuOpen = false">Rooms</a>
          <a routerLink="/tents" routerLinkActive="text-forest font-medium" class="hover:text-forest px-4 py-3 md:py-0 border-b md:border-0 border-sand/50" (click)="menuOpen = false">Tents</a>
          <a routerLink="/enquiry" routerLinkActive="text-forest font-medium" class="hover:text-forest px-4 py-3 md:py-0 border-b md:border-0 border-sand/50" (click)="menuOpen = false">Enquiry</a>
          <a *ngIf="isLoggedIn" routerLink="/my-bookings" routerLinkActive="text-forest font-medium" class="hover:text-forest px-4 py-3 md:py-0 border-b md:border-0 border-sand/50" (click)="menuOpen = false">My Bookings</a>
          <a *ngIf="isAdmin" routerLink="/admin/dashboard" routerLinkActive="text-forest font-medium" class="hover:text-forest px-4 py-3 md:py-0 border-b md:border-0 border-sand/50" (click)="menuOpen = false">Admin</a>
          <div class="p-3 md:p-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
            <span *ngIf="isLoggedIn" class="text-muted text-sm px-4 py-2 md:py-0 md:px-0">
              Hi, <span class="text-dark font-medium">{{ userName }}</span>
            </span>
            <button *ngIf="!isLoggedIn" class="btn-primary text-xs w-full md:w-auto" routerLink="/login" (click)="menuOpen = false">Login</button>
            <button *ngIf="isLoggedIn" class="btn-gold text-xs w-full md:w-auto" (click)="logout()">Logout</button>
          </div>
        </nav>
      </div>
    </header>
  `
})
export class NavbarComponent {
  menuOpen = false;
  constructor(private auth: AuthService) {}

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get userName(): string {
    const user = this.auth.getCurrentUser();
    return user?.name ?? '';
  }

  logout(): void {
    this.auth.logout();
    window.location.href = '/';
  }
}

