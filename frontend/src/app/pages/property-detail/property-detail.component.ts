import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { RoomService, Room } from '../../core/services/room.service';
import { TentService, Tent } from '../../core/services/tent.service';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

type PropertyType = 'room' | 'tent';

@Component({
  selector: 'app-property-detail',
  template: `
    <section class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8" *ngIf="property">
      <div class="grid lg:grid-cols-[1.5fr,400px] gap-8 lg:gap-10">
        <div class="min-w-0">
          <div class="mb-6 rounded-card overflow-hidden">
            <div class="relative h-56 sm:h-72 lg:h-80 bg-sand overflow-hidden group">
              <img
                *ngIf="allImages.length"
                [src]="allImages[currentImageIndex]"
                [alt]="property.name"
                class="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
              />
              <div *ngIf="allImages.length > 1" class="absolute inset-0 flex items-center justify-between px-2 pointer-events-none group-hover:pointer-events-auto">
                <button
                  type="button"
                  class="flex-shrink-0 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all"
                  (click)="prevImage(); $event.stopPropagation()"
                  aria-label="Previous image"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <button
                  type="button"
                  class="flex-shrink-0 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all"
                  (click)="nextImage(); $event.stopPropagation()"
                  aria-label="Next image"
                >
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
              <div *ngIf="allImages.length > 1" class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
            <button
  *ngFor="let img of allImages; let i = index"
  type="button"
  class="w-2 h-2 rounded-full transition-colors"
  [ngClass]="{
    'bg-white': i === currentImageIndex,
    'bg-white/50': i !== currentImageIndex,
    'ring-2 ring-white/50': i === currentImageIndex
  }"
  (click)="goToImage(i); $event.stopPropagation()"
  [attr.aria-label]="'Image ' + (i + 1)"
></button>
              </div>
            </div>
          </div>

          <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-2">{{ property.name }}</h1>
          <div class="flex flex-wrap items-center gap-3 mb-4 text-sm text-muted">
            <span class="uppercase tracking-widest px-2.5 py-1 rounded-button bg-sand/80 text-dark font-medium">
              {{ property.type }}
            </span>
            <span>Sleeps up to {{ property.capacity }} guests</span>
          </div>
          <p class="text-muted text-sm sm:text-base leading-relaxed mb-6">
            {{ property.description }}
          </p>

          <h2 class="font-semibold text-dark mb-3">Amenities</h2>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-6 text-sm">
            <div
              *ngFor="let amenity of property.amenities"
              class="flex items-center gap-2 text-muted"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-forest shrink-0"></span>
              <span>{{ amenity }}</span>
            </div>
          </div>

          <div class="card p-4 bg-sand/30 border-sand/60">
            <h2 class="font-semibold text-dark mb-2 text-sm">Availability</h2>
            <p class="text-sm text-muted leading-relaxed">
              Select your check‑in and check‑out dates in the booking panel to see pricing. Confirmed
              bookings are blocked and cannot be double‑booked.
            </p>
          </div>
        </div>

        <aside class="lg:sticky lg:top-24 h-fit">
          <div class="card p-5 sm:p-6">
            <div class="mb-4">
              <div class="text-earth font-semibold text-xl">
                <span>{{ property.totalPrice | currencyInr }}</span>
                <span class="text-sm text-muted font-normal ml-1">total</span>
              </div>
              <div class="text-xs text-muted mt-1">
                {{ property.registrationAmount | currencyInr }} now + {{ property.arrivalAmount | currencyInr }} on arrival
              </div>
            </div>
            <form [formGroup]="bookingForm" (ngSubmit)="goToBooking()" class="space-y-4">
              <div>
                <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Check-in</label>
                <input type="date" formControlName="checkIn" class="w-full" />
                <div class="text-xs text-red-600 mt-1" *ngIf="submitted && bookingForm.get('checkIn')?.invalid">
                  Check-in is required.
                </div>
              </div>
              <div>
                <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Check-out</label>
                <input type="date" formControlName="checkOut" class="w-full" />
                <div class="text-xs text-red-600 mt-1" *ngIf="submitted && bookingForm.get('checkOut')?.invalid">
                  Check-out is required.
                </div>
              </div>
              <div class="text-sm text-red-600 font-medium my-3">
                Sleeps up to {{ property.capacity }} guests means max {{ property.capacity }} adults per {{ type === 'room' ? 'room' : 'tent' }}.
              </div>
              <button class="btn-primary w-full mt-2" type="submit">
                Book Now
              </button>
              <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
            </form>
          </div>
        </aside>
      </div>
    </section>
    <app-loading-spinner [show]="loading"></app-loading-spinner>
  `
})
export class PropertyDetailComponent {
  type!: PropertyType;
  id!: number;
  property!: Room | Tent;
  loading = false;
  submitted = false;
  error = '';
  allImages: string[] = [];
  currentImageIndex = 0;

  bookingForm = this.fb.group({
    checkIn: ['', Validators.required],
    checkOut: ['', Validators.required]
  });

  constructor(
    private route: ActivatedRoute,
    private roomService: RoomService,
    private tentService: TentService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.route.paramMap.subscribe((params) => {
      const typeParam = params.get('type') as PropertyType | null;
      const idParam = params.get('id');
      if (!typeParam || !idParam) {
        return;
      }
      this.type = typeParam;
      this.id = Number(idParam);
      this.loadProperty();
    });
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
        this.allImages = (prop.images || []).map((i) => i.url);
        this.currentImageIndex = Math.max(0, (prop.images || []).findIndex((i) => i.isPrimary));
        if (this.currentImageIndex < 0) this.currentImageIndex = 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  prevImage(): void {
    if (this.allImages.length <= 1) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.allImages.length) % this.allImages.length;
  }

  nextImage(): void {
    if (this.allImages.length <= 1) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.allImages.length;
  }

  goToImage(index: number): void {
    this.currentImageIndex = index;
  }

  goToBooking(): void {
    this.submitted = true;
    this.error = '';
    if (this.bookingForm.invalid) {
      this.error = 'Please select valid dates.';
      return;
    }
    const { checkIn, checkOut } = this.bookingForm.value;
    const guests = this.property?.capacity || 1;
    this.router.navigate(['/booking', this.type, this.id], {
      queryParams: { checkIn, checkOut, guests }
    });
  }
}

