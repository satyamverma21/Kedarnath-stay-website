import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { BookingService, Booking } from '../../core/services/booking.service';
import { RoomService, Room } from '../../core/services/room.service';
import { TentService, Tent } from '../../core/services/tent.service';
import { AuthService, User } from '../../core/services/auth.service';
import { PromoCodeService, PromoCodeValidationResponse } from '../../core/services/promo-code.service';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

type PropertyType = 'room' | 'tent';

@Component({
  selector: 'app-booking',
  template: `
    <section class="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10" *ngIf="property">
      <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-6">Confirm your booking</h1>

      <div class="grid md:grid-cols-[1.2fr,1fr] gap-6 lg:gap-8">
        <div class="card p-5 sm:p-6 space-y-4">
          <h2 class="font-semibold text-dark">Booking summary</h2>
          <div class="text-sm text-muted space-y-1">
            <div><strong class="text-dark">{{ property.name }}</strong> ({{ type }})</div>
            <div>Check-in: {{ checkIn }}</div>
            <div>Check-out: {{ checkOut }}</div>
            <div>Guests: {{ guests }} · Nights: {{ nights }}</div>
          </div>
          <div class="border-t border-sand pt-4 mt-2 text-sm space-y-2">
            <div class="flex justify-between">
              <span class="text-muted">Base amount</span>
              <span>{{ baseAmount | currencyInr }}</span>
            </div>
            <div class="flex justify-between" *ngIf="discountAmount > 0">
              <span class="text-muted">Discount ({{ promoCode }})</span>
              <span class="text-green-600">-{{ discountAmount | currencyInr }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Tax (18% GST)</span>
              <span>{{ taxAmount | currencyInr }}</span>
            </div>
            <div class="flex justify-between font-semibold text-earth text-base pt-2">
              <span>Total</span>
              <span>{{ totalAmount | currencyInr }}</span>
            </div>
          </div>
          
          <!-- Promo Code Section -->
          <div class="border-t border-sand pt-4 mt-4">
            <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Promo Code</label>
            <div class="flex gap-2">
              <input 
                type="text" 
                [(ngModel)]="promoCode" 
                (ngModelChange)="onPromoCodeChange()"
                class="flex-1 px-3 py-2 border border-sand rounded-md text-sm" 
                placeholder="Enter promo code"
                [disabled]="loading"
              />
              <button 
                type="button" 
                (click)="applyPromoCode()" 
                class="btn-secondary text-sm px-4 py-2"
                [disabled]="!promoCode || loading"
              >
                Apply
              </button>
            </div>
            <div class="text-xs mt-1" *ngIf="promoError">
              <span class="text-red-600">{{ promoError }}</span>
            </div>
            <div class="text-xs mt-1" *ngIf="promoSuccess">
              <span class="text-green-600">{{ promoSuccess }}</span>
            </div>
          </div>
        </div>

        <div class="card p-5 sm:p-6">
          <h2 class="font-semibold text-dark mb-4">Guest details</h2>
          <form [formGroup]="form" (ngSubmit)="confirmBooking()" class="space-y-4 text-sm">
            <div class="flex justify-end mb-2" *ngIf="authService.isLoggedIn()">
              <button 
                type="button" 
                (click)="fetchUserDetails()" 
                class="btn-secondary text-xs"
                [disabled]="loading"
              >
                Fetch from logged-in user
              </button>
            </div>
            <div>
              <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Name</label>
              <input type="text" formControlName="name" class="w-full" />
              <div class="text-xs text-red-600 mt-1" *ngIf="submitted && form.get('name')?.invalid">
                Name is required.
              </div>
            </div>
            <div>
              <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Email</label>
              <input type="email" formControlName="email" class="w-full" />
              <div class="text-xs text-red-600 mt-1" *ngIf="submitted && form.get('email')?.invalid">
                Valid email is required.
              </div>
            </div>
            <div>
              <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Phone</label>
              <input type="tel" formControlName="phone" class="w-full" />
            </div>
            <div>
              <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Special requests</label>
              <textarea rows="3" formControlName="specialRequests" class="w-full"></textarea>
            </div>
            <button class="btn-primary w-full mt-2" type="submit" [disabled]="loading">
              Confirm Booking
            </button>
            <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
          </form>
        </div>
      </div>
    </section>
    <app-loading-spinner [show]="loading || !property"></app-loading-spinner>
  `
})
export class BookingComponent {
  type!: PropertyType;
  id!: number;
  property!: Room | Tent;
  checkIn = '';
  checkOut = '';
  guests = 1;
  nights = 1;
  baseAmount = 0;
  taxAmount = 0;
  totalAmount = 0;
  loading = false;
  submitted = false;
  error = '';

  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    specialRequests: ['']
  });

  promoCode = '';
  discountAmount = 0;
  discountPercent = 0;
  promoError = '';
  promoSuccess = '';

  constructor(
    private route: ActivatedRoute,
    private roomService: RoomService,
    private tentService: TentService,
    private bookingService: BookingService,
    public authService: AuthService,
    private promoCodeService: PromoCodeService,
    private fb: FormBuilder,
    private router: Router
  ) {
    debugger;
    this.route.paramMap.subscribe((params) => {
      const typeParam = params.get('type') as PropertyType | null;
      const idParam = params.get('id');
      if (!typeParam || !idParam) {
        return;
      }
      this.type = typeParam;
      this.id = Number(idParam);
    });

    this.route.queryParamMap.subscribe((params) => {
      this.checkIn = params.get('checkIn') || '';
      this.checkOut = params.get('checkOut') || '';
      this.guests = Number(params.get('guests') || 1);
      this.calculateNights();
      this.loadProperty();
    });
  }

  private calculateNights(): void {
    if (!this.checkIn || !this.checkOut) {
      this.nights = 1;
      return;
    }
    const inDate = new Date(this.checkIn);
    const outDate = new Date(this.checkOut);
    const diffMs = outDate.getTime() - inDate.getTime();
    const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    this.nights = nights > 0 ? nights : 1;
  }

  private loadProperty(): void {
    this.loading = true;
    const obs =
      this.type === 'room'
        ? this.roomService.getRoom(this.id)
        : this.tentService.getTent(this.id);
    obs.subscribe({
      next: (prop) => {
        this.property = prop;
        this.calculatePricing();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private calculatePricing(): void {
    if (!this.property) return;

    const baseAmount = this.property.basePrice * this.nights;
    const discountAmount = baseAmount * (this.discountPercent / 100);
    const afterDiscount = baseAmount - discountAmount;

    this.baseAmount = baseAmount;
    this.discountAmount = discountAmount;
    this.taxAmount = afterDiscount * 0.18;
    this.totalAmount = afterDiscount + this.taxAmount;
  }

  onPromoCodeChange(): void {
    this.promoError = '';
    this.promoSuccess = '';
  }

  applyPromoCode(): void {
    if (!this.promoCode) return;

    this.promoError = '';
    this.promoSuccess = '';
    this.loading = true;

    // Call backend API to validate promo code
    this.promoCodeService.validatePromoCode(this.promoCode.toUpperCase()).subscribe({
      next: (response: PromoCodeValidationResponse) => {
        if (response.valid && response.discount_percent) {
          this.discountPercent = response.discount_percent;
          this.promoSuccess = `Promo code applied successfully! ${response.discount_percent}% discount`;
          this.calculatePricing();
        } else {
          this.promoError = response.message || 'Invalid promo code';
          this.discountPercent = 0;
          this.calculatePricing();
        }
        this.loading = false;
      },
      error: (err) => {
        this.promoError = err?.error?.message || 'Failed to validate promo code';
        this.discountPercent = 0;
        this.calculatePricing();
        this.loading = false;
      }
    });
  }

  fetchUserDetails(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.form.patchValue({
        name: user.name,
        email: user.email,
        phone: user.phone || ''
      });
    }
  }

  confirmBooking(): void {
    this.submitted = true;
    this.error = '';
    if (this.form.invalid || !this.property) {
      this.error = 'Please fill in the required fields.';
      return;
    }
    this.loading = true;
    this.bookingService
      .createBooking({
        propertyType: this.type,
        propertyId: this.property.id,
        checkIn: this.checkIn,
        checkOut: this.checkOut,
        guests: this.guests,
        specialRequests: this.form.value.specialRequests || undefined,
        promoCode: this.promoCode || undefined,
        discountPercent: this.discountPercent || undefined
      })
      .subscribe({
        next: (booking: Booking) => {
          this.loading = false;
          this.router.navigate(['/payment', booking.id]);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Failed to create booking. Please try again.';
        }
      });
  }
}

