import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

interface NavLink {
  label: string;
  route: string;
  tone: 'stay' | 'support' | 'account' | 'admin';
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

@Component({
  selector: 'app-navbar',
  template: `
    <header class="site-nav">
      <div class="page-container">
        <div class="site-nav__bar">
        <a routerLink="/" class="site-nav__brand" (click)="menuOpen = false">
          <span class="site-nav__brand-mark" aria-hidden="true">KS</span>
          <span>
            <span class="site-nav__brand-title">Kedar-Stays</span>
            <span class="site-nav__brand-tag">Premium Kedarnath stays</span>
          </span>
        </a>

        <button
          type="button"
          class="site-nav__menu-btn md:hidden no-style"
          aria-label="Toggle navigation menu"
          [attr.aria-expanded]="menuOpen"
          aria-controls="mobile-site-nav"
          (click)="menuOpen = !menuOpen"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path *ngIf="!menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
            <path *ngIf="menuOpen" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>

        <div class="site-nav__desktop hidden md:flex">
          <nav class="site-nav__links" aria-label="Primary navigation">
            <a
              *ngFor="let link of visibleLinks"
              [routerLink]="link.route"
              [routerLinkActiveOptions]="{ exact: link.route === '/' }"
              routerLinkActive="is-active"
              #desktopRla="routerLinkActive"
              [ngClass]="['site-nav__link', toneClass(link.tone)]"
              [attr.aria-current]="desktopRla.isActive ? 'page' : null"
            >
              {{ link.label }}
            </a>
          </nav>

          <div class="site-nav__actions">
            <span *ngIf="isLoggedIn" class="site-nav__welcome">
              Hi, <span class="font-semibold">{{ userName }}</span>
            </span>
            <button *ngIf="!isLoggedIn" class="btn-secondary" routerLink="/login">Login</button>
            <button *ngIf="isLoggedIn" class="btn-primary" (click)="logout()">Logout</button>
          </div>
        </div>
        </div>

        <div class="site-nav__mobile-panel md:hidden" [class.is-open]="menuOpen" id="mobile-site-nav">
        <div class="site-nav__mobile-inner">
          <nav class="site-nav__mobile-links" aria-label="Mobile navigation">
            <a
              *ngFor="let link of visibleLinks"
              [routerLink]="link.route"
              [routerLinkActiveOptions]="{ exact: link.route === '/' }"
              routerLinkActive="is-active"
              #mobileRla="routerLinkActive"
              [ngClass]="['site-nav__link', toneClass(link.tone)]"
              [attr.aria-current]="mobileRla.isActive ? 'page' : null"
              (click)="menuOpen = false"
            >
              {{ link.label }}
            </a>
          </nav>

          <div class="site-nav__mobile-actions">
            <span *ngIf="isLoggedIn" class="site-nav__welcome">
              Signed in as <strong>{{ userName }}</strong>
            </span>
            <button *ngIf="!isLoggedIn" class="btn-secondary w-full" routerLink="/login" (click)="menuOpen = false">Login</button>
            <button *ngIf="isLoggedIn" class="btn-primary w-full" (click)="logout()">Logout</button>
          </div>
        </div>
      </div>
      </div>
    </header>
  `
})
export class NavbarComponent {
  menuOpen = false;
  links: NavLink[] = [
    { label: 'Home', route: '/', tone: 'stay' },
    { label: 'Rooms', route: '/rooms', tone: 'stay' },
    { label: 'Tents', route: '/tents', tone: 'stay' },
    { label: 'Contact Us', route: '/about', tone: 'support' },
    { label: 'Enquiry', route: '/enquiry', tone: 'support' },
    { label: 'My Bookings', route: '/my-bookings', tone: 'account', requiresAuth: true },
    { label: 'Admin', route: '/admin/dashboard', tone: 'admin', requiresAdmin: true }
  ];

  constructor(private auth: AuthService) {}

  get visibleLinks(): NavLink[] {
    return this.links.filter((link) => {
      if (link.requiresAdmin) {
        return this.isAdmin;
      }
      if (link.requiresAuth) {
        return this.isLoggedIn;
      }
      return true;
    });
  }

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

  toneClass(tone: NavLink['tone']): string {
    if (tone === 'stay') return 'nav-tone-stay';
    if (tone === 'support') return 'nav-tone-support';
    if (tone === 'account') return 'nav-tone-account';
    return 'nav-tone-admin';
  }

  logout(): void {
    this.menuOpen = false;
    this.auth.logout();
    window.location.href = '/';
  }
}
