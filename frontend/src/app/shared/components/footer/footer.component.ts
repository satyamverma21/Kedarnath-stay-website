import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  template: `
    <footer class="site-footer">
      <div class="page-container">
        <div class="site-footer__panel surface-panel surface-panel--dark">
          <div class="site-footer__grid">
            <div>
              <p class="eyebrow">Kedarnath Booking</p>
              <h2 class="site-footer__title">Quiet stays shaped for pilgrims, families, and mountain seekers.</h2>
              <p class="section-copy" style="color: rgba(255, 252, 246, 0.72); max-width: 28rem;">
                Choose refined rooms and thoughtfully hosted tents close to the Kedarnath route,
                with a clear booking journey from discovery to confirmation.
              </p>
            </div>
            <div>
              <p class="app-notice__title" style="color: rgba(255, 252, 246, 0.78);">Explore</p>
              <div class="site-footer__list">
                <a routerLink="/rooms">Rooms</a>
                <a routerLink="/tents">Tents</a>
                <a routerLink="/about">About</a>
              </div>
            </div>
            <div>
              <p class="app-notice__title" style="color: rgba(255, 252, 246, 0.78);">Plan</p>
              <div class="site-footer__list">
                <a routerLink="/enquiry">Custom enquiry</a>
                <a routerLink="/my-bookings">My bookings</a>
                <a routerLink="/login">Guest login</a>
              </div>
            </div>
          </div>
          <div class="site-footer__meta">
            <p>&copy; {{ year }} Kedar-Stays. All rights reserved.</p>
            <p>Designed for a calm, premium Kedarnath journey.</p>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class FooterComponent {
  year = new Date().getFullYear();
}

