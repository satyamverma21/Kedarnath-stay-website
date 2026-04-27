// import { Component } from '@angular/core';

// @Component({
//   selector: 'app-root',
//   standalone: false,
//   templateUrl: './app.component.html',
//   styleUrl: './app.component.scss',
// })
// export class AppComponent {
//   title = 'tent-website-base-frontend';
// }


import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../environments/environment';
@Component({
  selector: 'app-root',

  template: `
    <div class="app-shell">
      <app-navbar></app-navbar>
      <section *ngIf="!isAdmin" class="app-notice">
        <div class="page-container">
          <div class="app-notice__inner">
            <div>
              <p class="app-notice__title">Pilgrim Registration</p>
              <p class="app-notice__copy">
                Complete the official Char Dham and Hemkund Sahib Yatra registration before arrival
                to keep your journey smooth and hassle-free.
              </p>
            </div>
            <a
              [href]="yatraRegistrationUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-secondary"
            >
              Open Official Portal
            </a>
          </div>
        </div>
      </section>
      <main class="app-main">
        <router-outlet></router-outlet>
      </main>
      <app-toast-container></app-toast-container>
      <app-footer></app-footer>
    </div>
  `
})
export class AppComponent {
  isAdmin = false;
  yatraRegistrationUrl = environment.yatraRegistrationUrl;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects;
        this.isAdmin = url.startsWith('/admin') || url.startsWith('/login') || url.startsWith('/register');
      });
  }
}

