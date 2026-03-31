import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
// import { AdminGuard } from './core/guards/admin.guard';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent)
  },
  {
    path: 'rooms',
    loadComponent: () =>
      import('./pages/room-search/room-search.component').then((m) => m.RoomSearchComponent)
  },
  {
    path: 'tents',
    loadComponent: () =>
      import('./pages/tent-search/tent-search.component').then((m) => m.TentSearchComponent)
  },
  {
    path: 'property/:type/:id',
    loadComponent: () =>
      import('./pages/property-detail/property-detail.component').then(
        (m) => m.PropertyDetailComponent
      )
  },
  {
    path: 'booking/:type/:id',
    loadComponent: () =>
      import('./pages/booking/booking.component').then((m) => m.BookingComponent)
  },
  {
    path: 'payment/:bookingId',
    loadComponent: () =>
      import('./pages/payment/payment.component').then((m) => m.PaymentComponent)
  },
  {
    path: 'receipt/:bookingId',
    loadComponent: () =>
      import('./pages/receipt/receipt.component').then((m) => m.ReceiptComponent)
  },
  {
    path: 'my-bookings',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/my-bookings/my-bookings.component').then((m) => m.MyBookingsComponent)
  },
  {
    path: 'enquiry',
    loadComponent: () =>
      import('./pages/enquiry/enquiry.component').then((m) => m.EnquiryComponent)
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then((m) => m.RegisterComponent)
  },
  {
    path: 'admin',
    // canActivate: [AdminGuard],
    loadComponent: () =>
      import('./pages/admin/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          )
      },
      {
        path: 'rooms',
        loadComponent: () =>
          import('./pages/admin/manage-rooms/manage-rooms.component').then(
            (m) => m.ManageRoomsComponent
          )
      },
      {
        path: 'rooms/new',
        loadComponent: () =>
          import('./pages/admin/room-form/room-form.component').then(
            (m) => m.RoomFormComponent
          )
      },
      {
        path: 'rooms/:id/edit',
        loadComponent: () =>
          import('./pages/admin/room-form/room-form.component').then(
            (m) => m.RoomFormComponent
          )
      },
      {
        path: 'tents',
        loadComponent: () =>
          import('./pages/admin/manage-tents/manage-tents.component').then(
            (m) => m.ManageTentsComponent
          )
      },
      {
        path: 'tents/new',
        loadComponent: () =>
          import('./pages/admin/tent-form/tent-form.component').then(
            (m) => m.TentFormComponent
          )
      },
      {
        path: 'tents/:id/edit',
        loadComponent: () =>
          import('./pages/admin/tent-form/tent-form.component').then(
            (m) => m.TentFormComponent
          )
      },
      {
        path: 'price-settings',
        loadComponent: () =>
          import('./pages/admin/price-settings/price-settings.component').then(
            (m) => m.PriceSettingsComponent
          )
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./pages/admin/bookings-list/bookings-list.component').then(
            (m) => m.BookingsListComponent
          )
      },
      {
        path: 'enquiries',
        loadComponent: () =>
          import('./pages/admin/enquiries-list/enquiries-list.component').then(
            (m) => m.EnquiriesListComponent
          )
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' }
    ]
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/home/home.component').then((m) => m.HomeComponent)
  }
];

