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
@Component({
  selector: 'app-root',

  template: `
    <div class="min-h-screen flex flex-col">
      <app-navbar></app-navbar>
      <div *ngIf="!isAdmin" class="site-banner"></div>
      <main class="flex-1">
        <router-outlet></router-outlet>
      </main>
      <app-footer></app-footer>
    </div>
  `
})
export class AppComponent {
  isAdmin = false;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects;
        this.isAdmin = url.startsWith('/admin') || url.startsWith('/login') || url.startsWith('/register');
      });
  }
}

