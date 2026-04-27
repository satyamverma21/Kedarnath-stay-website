import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RoomService, Room } from '../../core/services/room.service';
import { TentService, Tent } from '../../core/services/tent.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

type PropertyType = 'room' | 'tent';

type BookedDateRange = {
  checkIn: string;
  checkOut: string;
  status: string;
};

@Component({
  selector: 'app-property-detail',
  template: `
    <section class="page-section page-section--tight" *ngIf="property">
      <div class="page-container detail-layout">
        <div class="detail-body">
          <div class="detail-gallery">
            <div class="detail-gallery__hero">
              <img *ngIf="allImages.length" [src]="allImages[currentImageIndex]" [alt]="property.name" />
              <div *ngIf="allImages.length > 1" class="detail-gallery__nav">
                <button type="button" class="detail-gallery__arrow" (click)="prevImage(); $event.stopPropagation()" aria-label="Previous image">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </button>
                <div class="detail-gallery__dots">
                  <button
                    *ngFor="let img of allImages; let i = index"
                    type="button"
                    class="detail-gallery__dot"
                    [class.is-active]="i === currentImageIndex"
                    (click)="goToImage(i); $event.stopPropagation()"
                    [attr.aria-label]="'Image ' + (i + 1)"
                  ></button>
                </div>
                <button type="button" class="detail-gallery__arrow" (click)="nextImage(); $event.stopPropagation()" aria-label="Next image">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="detail-header">
            <div class="action-row">
              <span class="pill">{{ property.type }}</span>
              <span class="pill">Sleeps up to {{ property.capacity }}</span>
              <span class="pill" *ngIf="property.hotel_name">{{ property.hotel_name }}</span>
            </div>
            <h1 class="section-title">{{ property.name }}</h1>
            <p class="section-copy">{{ property.description }}</p>
          </div>

          <div class="surface-panel surface-panel--dense">
            <p class="eyebrow">Included amenities</p>
            <div class="amenity-grid">
              <div *ngFor="let amenity of property.amenities" class="amenity-item">
                <span>{{ amenity }}</span>
              </div>
            </div>
          </div>

          <div class="surface-panel surface-panel--dense">
            <p class="eyebrow">Availability context</p>
            <h2 class="section-title" style="font-size: 1.6rem;">Already booked dates</h2>
            <div *ngIf="bookedDateRanges.length; else noBookedDates" class="section-stack">
              <p class="section-copy">These dates are unavailable for new reservations.</p>
              <div class="chip-list">
                <span *ngFor="let range of bookedDateRanges" class="chip">
                  {{ formatDate(range.checkIn) }} to {{ formatDate(range.checkOut) }}
                </span>
              </div>
            </div>
            <ng-template #noBookedDates>
              <p class="section-copy">No upcoming blocked dates are visible right now.</p>
            </ng-template>
          </div>
        </div>

        <aside class="surface-panel surface-panel--feature booking-panel">
          <div>
            <p class="eyebrow">Reserve this stay</p>
            <h2 class="section-title" style="font-size: 1.9rem;">Transparent pricing before you commit.</h2>
          </div>

          <div class="price-breakdown">
            <div class="price-row">
              <span class="text-muted">Total stay</span>
              <strong>{{ property.totalPrice | currencyInr }}</strong>
            </div>
            <div class="price-row">
              <span class="text-muted">Pay now</span>
              <span>{{ property.registrationAmount | currencyInr }}</span>
            </div>
            <div class="price-row">
              <span class="text-muted">Pay on arrival</span>
              <span>{{ property.arrivalAmount | currencyInr }}</span>
            </div>
          </div>

          <form [formGroup]="bookingForm" (ngSubmit)="goToBooking()" class="form-grid">
            <div class="field-stack">
              <label class="field-label">Check-in</label>
              <div class="relative">
                <input type="text" [value]="checkInDisplay" placeholder="DD/MM/YYYY" readonly (click)="openCheckInPicker()" />
                <input #checkInPicker type="date" class="sr-only" [attr.min]="todayDate" [value]="bookingForm.value.checkIn || ''" (change)="onCheckInDatePicked($any($event.target).value)" />
              </div>
              <div class="field-note">Tap to choose your arrival date.</div>
              <div class="field-error" *ngIf="submitted && bookingForm.get('checkIn')?.invalid">Check-in is required.</div>
            </div>

            <div class="field-stack">
              <label class="field-label">Check-out</label>
              <div class="relative">
                <input type="text" [value]="checkOutDisplay" placeholder="DD/MM/YYYY" readonly (click)="openCheckOutPicker()" />
                <input #checkOutPicker type="date" class="sr-only" [attr.min]="minCheckoutDate" [value]="bookingForm.value.checkOut || ''" (change)="onCheckOutDatePicked($any($event.target).value)" />
              </div>
              <div class="field-note">Departure must be after arrival.</div>
              <div class="field-error" *ngIf="submitted && bookingForm.get('checkOut')?.invalid">Check-out is required.</div>
            </div>

            <div class="feedback-banner feedback-banner--warning" *ngIf="dateOverlapError">{{ dateOverlapError }}</div>
            <div class="micro-copy">Capacity guidance: up to {{ property.capacity }} guest{{ property.capacity === 1 ? '' : 's' }} per {{ type }}.</div>
            <button class="btn-primary" type="submit">Continue to Booking</button>
            <div class="field-error" *ngIf="error">{{ error }}</div>
          </form>
        </aside>
      </div>
    </section>
    <app-loading-spinner [show]="loading"></app-loading-spinner>
  `
})
export class PropertyDetailComponent {
  @ViewChild('checkInPicker') private checkInPicker?: ElementRef<HTMLInputElement>;
  @ViewChild('checkOutPicker') private checkOutPicker?: ElementRef<HTMLInputElement>;

  type!: PropertyType;
  id!: number;
  property!: Room | Tent;
  loading = false;
  submitted = false;
  error = '';
  allImages: string[] = [];
  currentImageIndex = 0;
  bookedDateRanges: BookedDateRange[] = [];
  todayDate = this.toYmd(new Date());
  minCheckoutDate = this.todayDate;
  dateOverlapError = '';
  checkInDisplay = '';
  checkOutDisplay = '';

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
    this.bookingForm.valueChanges.subscribe((value) => {
      const checkIn = value.checkIn || '';
      this.minCheckoutDate = checkIn || this.todayDate;
      this.dateOverlapError = this.getDateOverlapError(checkIn, value.checkOut || '');
    });

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
    const obs = this.type === 'room' ? this.roomService.getRoom(this.id) : this.tentService.getTent(this.id);
    obs.subscribe({
      next: (prop) => {
        this.property = prop;
        this.bookedDateRanges = [...(prop.bookedDateRanges || [])].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
        this.allImages = (prop.images || []).map((i) => i.url);
        this.currentImageIndex = Math.max(0, (prop.images || []).findIndex((i) => i.isPrimary));
        if (this.currentImageIndex < 0) this.currentImageIndex = 0;
        this.dateOverlapError = this.getDateOverlapError(this.bookingForm.value.checkIn || '', this.bookingForm.value.checkOut || '');
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
    const { checkIn, checkOut } = this.bookingForm.value;
    this.dateOverlapError = this.getDateOverlapError(checkIn || '', checkOut || '');

    if (this.bookingForm.invalid) {
      this.error = 'Please select valid dates.';
      return;
    }
    if (this.dateOverlapError) {
      this.error = this.dateOverlapError;
      return;
    }

    const guests = this.property?.capacity || 1;
    this.router.navigate(['/booking', this.type, this.id], {
      queryParams: { checkIn, checkOut, guests }
    });
  }

  onCheckInDatePicked(isoDate: string): void {
    this.bookingForm.patchValue({ checkIn: isoDate || '' }, { emitEvent: true });
    this.checkInDisplay = this.formatDate(isoDate);
  }

  onCheckOutDatePicked(isoDate: string): void {
    this.bookingForm.patchValue({ checkOut: isoDate || '' }, { emitEvent: true });
    this.checkOutDisplay = this.formatDate(isoDate);
  }

  openCheckInPicker(): void {
    this.openNativePicker(this.checkInPicker?.nativeElement);
  }

  openCheckOutPicker(): void {
    this.openNativePicker(this.checkOutPicker?.nativeElement);
  }

  formatDate(dateText: string): string {
    if (!dateText) {
      return '';
    }
    const [year, month, day] = dateText.split('-');
    if (!year || !month || !day) {
      return dateText;
    }
    return `${day}/${month}/${year}`;
  }

  private getDateOverlapError(checkIn: string, checkOut: string): string {
    if (!checkIn || !checkOut) {
      return '';
    }
    if (checkIn < this.todayDate) {
      return 'Check-in cannot be in the past.';
    }
    if (checkOut <= checkIn) {
      return 'Check-out must be after check-in.';
    }
    const hasOverlap = this.bookedDateRanges.some((range) => !(checkOut <= range.checkIn || checkIn >= range.checkOut));
    return hasOverlap ? 'Selected dates overlap with an existing booking. Please choose different dates.' : '';
  }

  private toYmd(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private openNativePicker(input?: HTMLInputElement): void {
    if (!input) {
      return;
    }
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
      return;
    }
    input.click();
  }
}
