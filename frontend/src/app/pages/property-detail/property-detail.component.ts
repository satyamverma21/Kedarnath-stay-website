import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { RoomService, Room } from '../../core/services/room.service';
import { TentService, Tent } from '../../core/services/tent.service';
import { CurrencyInrPipe } from '../../shared/pipes/currency-inr.pipe';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
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
            <h2 class="font-semibold text-dark mb-2 text-sm">Already Booked Dates</h2>
            <div *ngIf="bookedDateRanges.length; else noBookedDates" class="space-y-2">
              <div class="text-xs text-muted">These date ranges are unavailable for new bookings:</div>
              <div class="grid sm:grid-cols-2 gap-2">
                <div
                  *ngFor="let range of bookedDateRanges"
                  class="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"
                >
                  {{ formatDate(range.checkIn) }} to {{ formatDate(range.checkOut) }}
                </div>
              </div>
            </div>
            <ng-template #noBookedDates>
              <p class="text-sm text-muted leading-relaxed">
                No upcoming blocked dates right now.
              </p>
            </ng-template>
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
                <div class="relative">
                  <input
                    type="text"
                    class="w-full pr-10 cursor-pointer"
                    [value]="checkInDisplay"
                    placeholder="DD/MM/YYYY"
                    readonly
                    (click)="openCheckInPicker()"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 px-3 text-muted"
                    (click)="openCheckInPicker()"
                    aria-label="Select check-in date"
                  >
                    <span class="text-xs font-semibold">CAL</span>
                  </button>
                  <input
                    #checkInPicker
                    type="date"
                    class="sr-only"
                    [attr.min]="todayDate"
                    [value]="bookingForm.value.checkIn || ''"
                    (change)="onCheckInDatePicked($any($event.target).value)"
                  />
                </div>
                <div class="text-xs text-muted mt-1">Format: DD/MM/YYYY</div>
                <div class="text-xs text-red-600 mt-1" *ngIf="submitted && bookingForm.get('checkIn')?.invalid">
                  Check-in is required.
                </div>
              </div>
              <div>
                <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Check-out</label>
                <div class="relative">
                  <input
                    type="text"
                    class="w-full pr-10 cursor-pointer"
                    [value]="checkOutDisplay"
                    placeholder="DD/MM/YYYY"
                    readonly
                    (click)="openCheckOutPicker()"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 px-3 text-muted"
                    (click)="openCheckOutPicker()"
                    aria-label="Select check-out date"
                  >
                    <span class="text-xs font-semibold">CAL</span>
                  </button>
                  <input
                    #checkOutPicker
                    type="date"
                    class="sr-only"
                    [attr.min]="minCheckoutDate"
                    [value]="bookingForm.value.checkOut || ''"
                    (change)="onCheckOutDatePicked($any($event.target).value)"
                  />
                </div>
                <div class="text-xs text-muted mt-1">Format: DD/MM/YYYY</div>
                <div class="text-xs text-red-600 mt-1" *ngIf="submitted && bookingForm.get('checkOut')?.invalid">
                  Check-out is required.
                </div>
              </div>
              <div class="text-xs text-red-600 -mt-1" *ngIf="dateOverlapError">
                {{ dateOverlapError }}
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
    const obs =
      this.type === 'room'
        ? this.roomService.getRoom(this.id)
        : this.tentService.getTent(this.id);
    obs.subscribe({
      next: (prop) => {
        this.property = prop;
        this.bookedDateRanges = [...(prop.bookedDateRanges || [])].sort((a, b) =>
          a.checkIn.localeCompare(b.checkIn)
        );
        this.allImages = (prop.images || []).map((i) => i.url);
        this.currentImageIndex = Math.max(0, (prop.images || []).findIndex((i) => i.isPrimary));
        if (this.currentImageIndex < 0) this.currentImageIndex = 0;
        this.dateOverlapError = this.getDateOverlapError(
          this.bookingForm.value.checkIn || '',
          this.bookingForm.value.checkOut || ''
        );
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
    const hasOverlap = this.bookedDateRanges.some(
      (range) => !(checkOut <= range.checkIn || checkIn >= range.checkOut)
    );
    return hasOverlap
      ? 'Selected dates overlap with an existing booking. Please choose different dates.'
      : '';
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
