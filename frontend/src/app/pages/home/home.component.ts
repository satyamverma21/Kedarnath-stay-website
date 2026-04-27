import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RoomService, Room } from '../../core/services/room.service';
import { TentService, Tent } from '../../core/services/tent.service';
import { PropertyCardComponent } from '../../shared/components/property-card/property-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  template: `
    <section class="hero-immersive">
      <div class="hero-immersive__media">
        <img src="assets/image/background.jpeg" alt="Kedarnath mountain stay backdrop" />
      </div>
      <div class="hero-immersive__content">
        <div class="hero-immersive__grid">
          <div class="hero-immersive__text">
            <p class="eyebrow">Kedarnath stay design</p>
            <h1 class="display-title">A smoother, calmer way to book your stay near Kedarnath.</h1>
            <p class="section-copy">
              Explore premium rooms and immersive tents with clearer pricing, cleaner decisions,
              and a booking flow designed for pilgrims, families, and mountain travellers.
            </p>
            <div class="hero-immersive__actions">
              <button class="btn-primary" routerLink="/rooms">Explore Rooms</button>
              <button class="btn-secondary" routerLink="/tents">Explore Tents</button>
            </div>
            <div class="hero-immersive__facts">
              <div class="hero-fact">
                <span class="hero-fact__label">Stay range</span>
                <span class="hero-fact__value">Rooms, suites, family and tent options</span>
              </div>
              <div class="hero-fact">
                <span class="hero-fact__label">Booking rhythm</span>
                <span class="hero-fact__value">Search, compare, reserve, verify</span>
              </div>
              <div class="hero-fact">
                <span class="hero-fact__label">Guest promise</span>
                <span class="hero-fact__value">Clear hierarchy and less friction</span>
              </div>
            </div>
          </div>

          <div class="surface-panel surface-panel--feature booking-orbit">
            <p class="eyebrow">Plan your stay</p>
            <div class="booking-tabs">
              <button
                type="button"
                class="pill booking-tabs__button"
                [class.is-active]="searchTab === 'room'"
                (click)="searchTab = 'room'"
              >
                Rooms
              </button>
              <button
                type="button"
                class="pill booking-tabs__button"
                [class.is-active]="searchTab === 'tent'"
                (click)="searchTab = 'tent'"
              >
                Tents
              </button>
            </div>

            <form [formGroup]="searchForm" (ngSubmit)="onSearch()" class="form-grid">
              <div class="form-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
                <div class="field-stack">
                  <label class="field-label">Check-in</label>
                  <input type="date" formControlName="checkin" />
                  <div class="field-error" *ngIf="submitted && searchForm.get('checkin')?.invalid">
                    Check-in date is required.
                  </div>
                </div>

                <div class="field-stack">
                  <label class="field-label">Check-out</label>
                  <input type="date" formControlName="checkout" />
                  <div class="field-error" *ngIf="submitted && searchForm.get('checkout')?.invalid">
                    Check-out date is required.
                  </div>
                </div>
              </div>

              <div class="form-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
                <div class="field-stack">
                  <label class="field-label">Guests</label>
                  <input type="number" min="1" formControlName="guests" />
                  <div class="field-error" *ngIf="submitted && searchForm.get('guests')?.invalid">
                    Guests must be at least 1.
                  </div>
                </div>

                <div class="field-stack">
                  <label class="field-label">Stay type</label>
                  <select formControlName="type">
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

              <button class="btn-primary" type="submit">Search Availability</button>
              <div class="field-error" *ngIf="error">{{ error }}</div>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section page-section--tight">
      <div class="page-container">
        <div class="stats-grid">
          <div class="stat-tile">
            <span class="stat-tile__value">Clear</span>
            <span class="stat-tile__label">price split between pay now and arrival balance</span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile__value">Focused</span>
            <span class="stat-tile__label">layout that prioritizes choices, timing, and next steps</span>
          </div>
          <div class="stat-tile">
            <span class="stat-tile__value">Flexible</span>
            <span class="stat-tile__label">room and tent journeys for different travel styles</span>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section page-section--tight">
      <div class="page-container section-stack">
        <div>
          <p class="eyebrow">Featured rooms</p>
          <h2 class="section-title">Restful rooms for pilgrims, couples, and families.</h2>
        </div>
        <app-loading-spinner [show]="loadingRooms"></app-loading-spinner>
        <div class="results-grid" *ngIf="!loadingRooms">
          <app-property-card
            *ngFor="let room of featuredRooms"
            [name]="room.name"
            [type]="room.type"
            [hotelName]="room.hotel_name || null"
            [description]="room.description || null"
            [capacity]="room.capacity"
            [price]="room.totalPrice"
            [amenities]="room.amenities"
            [images]="room.images"
            (book)="goToProperty('room', room.id)"
          ></app-property-card>
        </div>
      </div>
    </section>

    <section class="page-section page-section--tight">
      <div class="page-container section-stack">
        <div>
          <p class="eyebrow">Featured tents</p>
          <h2 class="section-title">Immersive tent stays with warmth, openness, and mountain atmosphere.</h2>
        </div>
        <app-loading-spinner [show]="loadingTents"></app-loading-spinner>
        <div class="results-grid" *ngIf="!loadingTents">
          <app-property-card
            *ngFor="let tent of featuredTents"
            [name]="tent.name"
            [type]="tent.type"
            [hotelName]="tent.hotel_name || null"
            [description]="tent.description || null"
            [capacity]="tent.capacity"
            [price]="tent.totalPrice"
            [amenities]="tent.amenities"
            [images]="tent.images"
            (book)="goToProperty('tent', tent.id)"
          ></app-property-card>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="page-container">
        <div class="feature-grid">
          <div class="surface-panel feature-block">
            <p class="eyebrow">Designed for clarity</p>
            <h3 class="section-title" style="font-size: 2rem;">A calmer path from search to check-in.</h3>
            <p class="section-copy">
              The interface reduces visual noise, keeps decisions grouped together, and gives each
              section one clear job in the journey.
            </p>
          </div>
          <div class="surface-panel feature-block">
            <h4>Thoughtful hospitality</h4>
            <p class="text-muted">Property details, amenities, and pricing are surfaced with better balance and scanability.</p>
          </div>
          <div class="surface-panel feature-block">
            <h4>Smoother commitment</h4>
            <p class="text-muted">Guests see what to pay now, what remains on arrival, and what happens next without digging.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section page-section--tight">
      <div class="page-container">
        <div class="surface-panel surface-panel--dark cta-band">
          <div>
            <p class="eyebrow">Custom planning</p>
            <h3 class="section-title" style="color: var(--color-white);">Planning a group pilgrimage, retreat, or family stay?</h3>
            <p class="section-copy" style="color: rgba(255, 252, 246, 0.76);">
              Share your dates, headcount, and room mix. We will help shape a stay plan that fits
              your journey.
            </p>
          </div>
          <button class="btn-gold" routerLink="/enquiry">Send an Enquiry</button>
        </div>
      </div>
    </section>
  `
})
export class HomeComponent {
  yatraRegistrationUrl = environment.yatraRegistrationUrl;
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
    if (checkin && checkout && checkout <= checkin) {
      this.error = 'Check-out date must be after check-in date.';
      return;
    }
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
