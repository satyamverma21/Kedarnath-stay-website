import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RoomService, Room } from '../../core/services/room.service';
import { TentService, Tent } from '../../core/services/tent.service';
import { PropertyCardComponent } from '../../shared/components/property-card/property-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-home',
  template: `
    <section class="bg-gradient-to-b from-sand/30 to-cream py-12 sm:py-16 border-b border-sand/60">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 grid md:grid-cols-2 gap-10 lg:gap-14 items-center">
        <div class="order-2 md:order-1">
          <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl text-dark mb-4 leading-tight">
            Boutique rooms & luxury tents in the wild.
          </h1>
          <p class="text-muted text-base sm:text-lg mb-6 max-w-lg">
            Discover serene stays surrounded by forest, stars and silence. Handpicked rooms and
            glamping tents for couples, families and groups.
          </p>
          <div class="flex flex-wrap gap-3">
            <button class="btn-primary" routerLink="/rooms">Search Rooms</button>
            <button class="btn-gold" routerLink="/tents">Search Tents</button>
          </div>
        </div>
        <div class="card p-5 sm:p-6 order-1 md:order-2">
          <div class="flex rounded-button overflow-hidden border border-sand/60 mb-4">
            <button
              type="button"
              class="flex-1 py-2.5 text-sm tracking-widest uppercase transition-colors"
              [class.bg-sand]="searchTab === 'room'"
              [class.bg-white]="searchTab !== 'room'"
              (click)="searchTab = 'room'"
            >
              Rooms
            </button>
            <button
              type="button"
              class="flex-1 py-2.5 text-sm tracking-widest uppercase transition-colors"
              [class.bg-sand]="searchTab === 'tent'"
              [class.bg-white]="searchTab !== 'tent'"
              (click)="searchTab = 'tent'"
            >
              Tents
            </button>
          </div>
          <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="space-y-4">
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Check-in</label>
                <input type="date" formControlName="checkin" class="w-full" />
                <div class="text-xs text-red-600 mt-1" *ngIf="submitted && searchForm.get('checkin')?.invalid">
                  Check-in date is required.
                </div>
              </div>
              <div>
                <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Check-out</label>
                <input type="date" formControlName="checkout" class="w-full" />
                <div class="text-xs text-red-600 mt-1" *ngIf="submitted && searchForm.get('checkout')?.invalid">
                  Check-out date is required.
                </div>
              </div>
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Guests</label>
                <input type="number" min="1" formControlName="guests" class="w-full" />
                <div class="text-xs text-red-600 mt-1" *ngIf="submitted && searchForm.get('guests')?.invalid">
                  Guests must be at least 1.
                </div>
              </div>
              <div>
                <label class="block text-xs uppercase tracking-widest mb-1.5 text-muted">Type</label>
                <select formControlName="type" class="w-full">
                  <option value="">Any</option>
                  <option *ngIf="searchTab === 'room'" value="standard">Standard</option>
                  <option *ngIf="searchTab === 'room'" value="deluxe">Deluxe</option>
                  <option *ngIf="searchTab === 'room'" value="suite">Suite</option>
                  <option *ngIf="searchTab === 'room'" value="family">Family</option>
                  <option *ngIf="searchTab === 'tent'" value="standard">Standard</option>
                  <option *ngIf="searchTab === 'tent'" value="luxury">Luxury</option>
                  <option *ngIf="searchTab === 'tent'" value="safari">Safari</option>
                  <option *ngIf="searchTab === 'tent'" value="honeymoon">Honeymoon</option>
                </select>
              </div>
            </div>
            <button class="btn-primary w-full mt-1" type="submit">Search Availability</button>
            <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
          </form>
        </div>
      </div>
    </section>

    <section class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
      <h2 class="font-heading text-2xl sm:text-3xl text-dark mb-6">Featured Rooms</h2>
      <app-loading-spinner [show]="loadingRooms"></app-loading-spinner>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="!loadingRooms">
        <app-property-card
          *ngFor="let room of featuredRooms"
          [name]="room.name"
          [type]="room.type"
          [capacity]="room.capacity"
          [price]="room.totalPrice"
          [images]="room.images"
          (book)="goToProperty('room', room.id)"
        ></app-property-card>
      </div>
    </section>

    <section class="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h2 class="font-heading text-2xl sm:text-3xl text-dark mb-6">Featured Tents</h2>
      <app-loading-spinner [show]="loadingTents"></app-loading-spinner>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="!loadingTents">
        <app-property-card
          *ngFor="let tent of featuredTents"
          [name]="tent.name"
          [type]="tent.type"
          [capacity]="tent.capacity"
          [price]="tent.totalPrice"
          [images]="tent.images"
          (book)="goToProperty('tent', tent.id)"
        ></app-property-card>
      </div>
    </section>

    <section class="bg-sand/50 py-12 sm:py-14 mt-12 border-y border-sand/60">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div class="lg:col-span-1">
          <h3 class="font-heading text-xl text-dark mb-2">Why Choose Us</h3>
          <p class="text-muted text-sm leading-relaxed">
            Intimate stays with handcrafted experiences, curated for nature lovers and slow
            travellers.
          </p>
        </div>
        <div class="card p-4 bg-white/80">
          <h4 class="font-semibold text-dark mb-1">Thoughtful design</h4>
          <p class="text-sm text-muted leading-relaxed">
            Rooms and tents styled with earthy palettes, natural textures and soft lighting.
          </p>
        </div>
        <div class="card p-4 bg-white/80">
          <h4 class="font-semibold text-dark mb-1">Seamless journeys</h4>
          <p class="text-sm text-muted leading-relaxed">
            Instant confirmations, secure payments and clear communication at every step.
          </p>
        </div>
      </div>
    </section>

    <section class="py-12 sm:py-14">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="card flex flex-col md:flex-row items-center justify-between gap-6 p-6 sm:p-8 bg-forest text-cream border-0 shadow-card-hover">
          <div>
            <h3 class="font-heading text-xl sm:text-2xl mb-1 text-cream">Planning a group retreat or celebration?</h3>
            <p class="text-sm text-cream/90 mt-1">
              Tell us what you have in mind and we will help you design the perfect stay.
            </p>
          </div>
          <button class="btn-gold shrink-0" routerLink="/enquiry">Send an Enquiry</button>
        </div>
      </div>
    </section>
  `
})
export class HomeComponent {
  searchTab: 'room' | 'tent' = 'room';
  searchForm = this.fb.group({
    checkin: ['', Validators.required],
    checkout: ['', Validators.required],
    guests: [1, [Validators.required, Validators.min(1)]],
    type: ['']
  });
  submitted = false;
  error = '';

  featuredRooms: Room[] = [];
  featuredTents: Tent[] = [];
  loadingRooms = false;
  loadingTents = false;

  constructor(
    private fb: FormBuilder,
    private roomService: RoomService,
    private tentService: TentService,
    private router: Router
  ) {
    this.loadFeatured();
  }

  private loadFeatured(): void {
    this.loadingRooms = true;
    this.roomService.listRooms().subscribe({
      next: (rooms) => {
        ;
        this.featuredRooms = rooms;
        this.loadingRooms = false;
      },
      error: () => {
        this.loadingRooms = false;
      }
    });

    this.loadingTents = true;
    this.tentService.listTents().subscribe({
      next: (tents) => {
        ;
        this.featuredTents = tents;
        this.loadingTents = false;
      },
      error: () => {
        this.loadingTents = false;
      }
    });
  }

  onSearch(): void {
    this.submitted = true;
    this.error = '';
    if (this.searchForm.invalid) {
      this.error = 'Please fix the highlighted fields.';
      return;
    }
    const { checkin, checkout, guests, type } = this.searchForm.value;
    if (this.searchTab === 'room') {
      this.router.navigate(['/rooms'], {
        queryParams: { checkin, checkout, guests, type }
      });
    } else {
      this.router.navigate(['/tents'], {
        queryParams: { checkin, checkout, guests, type }
      });
    }
  }

  goToProperty(type: 'room' | 'tent', id: number): void {
    this.router.navigate(['/property', type, id]);
  }
}

