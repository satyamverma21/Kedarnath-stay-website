import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { map, switchMap } from 'rxjs';
import { RoomService, Room } from '../../core/services/room.service';
import { TentService, Tent } from '../../core/services/tent.service';
import { GuestService } from '../../core/services/guest.service';
import { BookingService } from '../../core/services/booking.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

type PropertyType = 'room' | 'tent';

@Component({
  selector: 'app-booking',
  template: `
    <section class="page-section page-section--tight">
      <div class="page-container booking-journey" *ngIf="property">
        <form class="surface-panel surface-panel--feature flow-card" [formGroup]="form" (ngSubmit)="confirmAndPay()">
          <div>
            <p class="eyebrow">Guest details</p>
            <h1 class="section-title">Confirm who is travelling and continue to payment.</h1>
            <p class="section-copy">The flow keeps only the essential inputs here so the next step stays clear and uninterrupted.</p>
          </div>

          <div class="step-list">
            <div class="step-item">
              <span class="step-item__index">1</span>
              <div>
                <div class="field-label">Guest name</div>
                <input type="text" formControlName="name" placeholder="Your full name" />
                <div class="field-error" *ngIf="submitted && form.controls.name.invalid">Name is required.</div>
              </div>
            </div>

            <div class="step-item">
              <span class="step-item__index">2</span>
              <div>
                <div class="field-label">Phone number</div>
                <input type="tel" formControlName="phone" placeholder="10-digit mobile number" />
                <div class="field-error" *ngIf="submitted && form.controls.phone.invalid">Enter a valid 10-digit mobile number.</div>
              </div>
            </div>

            <div class="step-item">
              <span class="step-item__index">3</span>
              <div>
                <div class="field-label">Email</div>
                <input type="email" formControlName="email" placeholder="Optional email address" />
                <div class="field-error" *ngIf="submitted && form.controls.email.invalid">Enter a valid email.</div>
              </div>
            </div>
          </div>

          <div class="feedback-banner feedback-banner--warning" *ngIf="error">{{ error }}</div>
          <button class="btn-primary" type="submit" [disabled]="loading" [class.btn-loading]="loading">
            {{ loading ? 'Processing' : 'Confirm and Pay' }}
          </button>
        </form>

        <aside class="surface-panel summary-card">
          <div>
            <p class="eyebrow">Booking summary</p>
            <h2 class="section-title" style="font-size: 1.8rem;">Review your stay before payment.</h2>
          </div>

          <div class="price-breakdown">
            <div class="price-row" *ngIf="property.hotel_name">
              <span class="text-muted">Hotel</span>
              <span>{{ property.hotel_name }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Property</span>
              <span>{{ property.name }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Type</span>
              <span>{{ type }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Check-in</span>
              <span>{{ formatDate(checkIn) }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Check-out</span>
              <span>{{ formatDate(checkOut) }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Guests</span>
              <span>{{ guests }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Nights</span>
              <span>{{ nights }}</span>
            </div>
          </div>

          <div class="price-breakdown">
            <div class="price-row">
              <span class="text-muted">Pay now</span>
              <strong>{{ registrationTotal | currencyInr }}</strong>
            </div>
            <div class="price-row">
              <span class="text-muted">Pay on arrival</span>
              <span>{{ arrivalTotal | currencyInr }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Total</span>
              <strong>{{ totalPrice | currencyInr }}</strong>
            </div>
          </div>
        </aside>
      </div>
    </section>
    <app-loading-spinner [show]="loading && !property"></app-loading-spinner>
  `
})
export class BookingComponent {
  private readonly mobilePattern = /^[0-9]{10}$/;

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
    phone: ['', [Validators.required, Validators.pattern(this.mobilePattern)]],
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
    private bookingService: BookingService,
    private toast: ToastService
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

  get nights(): number {
    const inDate = new Date(this.checkIn);
    const outDate = new Date(this.checkOut);
    const diffMs = outDate.getTime() - inDate.getTime();
    const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  }

  get registrationTotal(): number {
    return Number(this.property?.registrationAmount || 0) * this.nights;
  }

  get arrivalTotal(): number {
    return Number(this.property?.arrivalAmount || 0) * this.nights;
  }

  get totalPrice(): number {
    return Number(this.property?.totalPrice || 0) * this.nights;
  }

  formatDate(value: string): string {
    if (!value) {
      return '';
    }
    const [year, month, day] = value.split('-');
    if (!year || !month || !day) {
      return value;
    }
    return `${day}/${month}/${year}`;
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
    const request = this.type === 'room' ? this.roomService.getRoom(this.propertyId) : this.tentService.getTent(this.propertyId);

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

    const createBookingRequest = () =>
      this.bookingService.createBooking({
        propertyType: this.type,
        propertyId: this.propertyId,
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        guests: this.guests
      });

    if (this.isLoggedIn) {
      createBookingRequest().subscribe({
        next: (booking) => {
          this.loading = false;
          this.toast.success('Booking confirmed. Continue to payment.');
          this.router.navigate(['/payment', booking.id]);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Unable to continue to payment.';
          this.toast.error(this.error);
        }
      });
      return;
    }

    this.authService
      .phoneLogin({
        phone,
        name,
        email: email || undefined
      })
      .pipe(
        switchMap((phoneLoginResult) =>
          this.guestService.updateGuest({
            name,
            email: email || undefined
          }).pipe(map(() => phoneLoginResult))
        ),
        switchMap((phoneLoginResult) =>
          createBookingRequest().pipe(map((booking) => ({ booking, phoneLoginResult })))
        )
      )
      .subscribe({
        next: ({ booking, phoneLoginResult }) => {
          this.loading = false;
          this.isLoggedIn = true;
          const generatedCredentials = phoneLoginResult.generatedCredentials;
          if (generatedCredentials) {
            sessionStorage.setItem(`generated_credentials_${booking.id}`, JSON.stringify(generatedCredentials));
          }
          this.toast.success('Booking confirmed. Continue to payment.');
          this.router.navigate(['/payment', booking.id], {
            queryParams: { phone },
            state: generatedCredentials ? { generatedCredentials } : undefined
          });
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Unable to continue to payment.';
          this.toast.error(this.error);
        }
      });
  }
}
