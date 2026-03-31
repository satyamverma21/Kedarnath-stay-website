import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';
import { RoomService, Room } from '../../core/services/room.service';
import { TentService, Tent } from '../../core/services/tent.service';
import { GuestService } from '../../core/services/guest.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';

type PropertyType = 'room' | 'tent';

@Component({
  selector: 'app-booking',
  template: `
    <section class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-2">Confirm Your Booking</h1>
      <p class="text-muted text-sm sm:text-base mb-6">
        Confirm your guest details and continue to payment.
      </p>

      <div class="grid lg:grid-cols-[1fr,360px] gap-6" *ngIf="property">
        <form class="card p-5 sm:p-6 space-y-4" [formGroup]="form" (ngSubmit)="confirmAndPay()">
          <div>
            <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Guest Name</label>
            <input type="text" formControlName="name" placeholder="Your full name" />
            <div class="text-xs text-red-600 mt-1" *ngIf="submitted && form.controls.name.invalid">
              Name is required.
            </div>
          </div>

          <div>
            <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Phone Number</label>
            <input type="tel" formControlName="phone" placeholder="+91XXXXXXXXXX" />
            <div class="text-xs text-red-600 mt-1" *ngIf="submitted && form.controls.phone.invalid">
              Valid phone number is required.
            </div>
          </div>

          <div>
            <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Email (Optional)</label>
            <input type="email" formControlName="email" placeholder="you@example.com" />
            <div class="text-xs text-red-600 mt-1" *ngIf="submitted && form.controls.email.invalid">
              Enter a valid email.
            </div>
          </div>

          <button class="btn-primary w-full mt-2" type="submit" [disabled]="loading">
            {{ loading ? 'Processing...' : 'Confirm & Pay' }}
          </button>
          <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
        </form>

        <aside class="card p-5 sm:p-6 h-fit">
          <h2 class="font-semibold text-dark mb-4">Booking Details</h2>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between gap-4">
              <span class="text-muted">Property</span>
              <span class="text-dark font-medium text-right">{{ property.name }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted">Type</span>
              <span class="text-dark text-right uppercase">{{ type }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted">Check-in</span>
              <span class="text-dark text-right">{{ checkIn }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted">Check-out</span>
              <span class="text-dark text-right">{{ checkOut }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted">Guests</span>
              <span class="text-dark text-right">{{ guests }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted">Rate</span>
              <span class="text-dark text-right">{{ property.basePrice | currencyInr }} / night</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
    <app-loading-spinner [show]="loading && !property"></app-loading-spinner>
  `
})
export class BookingComponent {
  type!: PropertyType;
  propertyId!: number;
  checkIn = '';
  checkOut = '';
  guests = 1;
  property: Room | Tent | null = null;
  loading = false;
  submitted = false;
  error = '';
  isLoggedIn = false;

  form = this.fb.group({
    name: ['', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^\+?\d{10,15}$/)]],
    email: ['', [Validators.email]]
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private roomService: RoomService,
    private tentService: TentService,
    private authService: AuthService,
    private guestService: GuestService,
    private bookingService: BookingService
  ) {
    this.route.paramMap.subscribe((params) => {
      const typeParam = params.get('type');
      const idParam = params.get('id');
      if (!typeParam || !idParam || !['room', 'tent'].includes(typeParam)) {
        this.router.navigate(['/']);
        return;
      }
      this.type = typeParam as PropertyType;
      this.propertyId = Number(idParam);
      this.loadProperty();
    });

    this.route.queryParamMap.subscribe((params) => {
      this.checkIn = params.get('checkIn') || '';
      this.checkOut = params.get('checkOut') || '';
      this.guests = Number(params.get('guests') || 1);
    });

    this.isLoggedIn = this.authService.isLoggedIn();
    if (this.isLoggedIn) {
      this.prefillFromProfile();
    }
  }

  private prefillFromProfile(): void {
    this.authService.me().subscribe({
      next: (user) => {
        this.form.patchValue({
          name: user.name || '',
          phone: user.phone || '',
          email: user.email || ''
        });
      },
      error: () => {
        this.authService.logout();
        this.isLoggedIn = false;
      }
    });
  }

  private loadProperty(): void {
    this.loading = true;
    const request =
      this.type === 'room'
        ? this.roomService.getRoom(this.propertyId)
        : this.tentService.getTent(this.propertyId);

    request.subscribe({
      next: (property) => {
        this.property = property;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.error = 'Unable to load property details.';
      }
    });
  }

  confirmAndPay(): void {
    this.submitted = true;
    this.error = '';

    if (!this.property || !this.checkIn || !this.checkOut) {
      this.error = 'Booking details are incomplete.';
      return;
    }
    if (this.form.invalid) {
      this.error = 'Please enter valid guest details.';
      return;
    }

    const name = (this.form.value.name || '').trim();
    const phone = (this.form.value.phone || '').trim();
    const email = (this.form.value.email || '').trim();

    this.loading = true;
    this.authService
      .phoneLogin({
        phone,
        name,
        email: email || undefined
      })
      .pipe(
        switchMap(() =>
          this.guestService.updateGuest({
            name,
            email: email || undefined
          })
        ),
        switchMap(() =>
          this.bookingService.createBooking({
            propertyType: this.type,
            propertyId: this.propertyId,
            checkIn: this.checkIn,
            checkOut: this.checkOut,
            guests: this.guests
          })
        )
      )
      .subscribe({
        next: (booking) => {
          this.loading = false;
          this.isLoggedIn = true;
          this.router.navigate(['/payment', booking.id], {
            queryParams: { phone }
          });
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Unable to continue to payment.';
        }
      });
  }
}
