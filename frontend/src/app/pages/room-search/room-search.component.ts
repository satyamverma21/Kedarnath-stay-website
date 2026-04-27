import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RoomService, Room } from '../../core/services/room.service';
import { PropertyCardComponent } from '../../shared/components/property-card/property-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-room-search',
  template: `
    <section class="page-section page-section--tight">
      <div class="page-container search-shell">
        <div class="search-shell__header">
          <p class="eyebrow">Room collection</p>
          <h1 class="section-title">Rooms curated for comfort, clarity, and easier decisions.</h1>
          <p class="section-copy">
            Filter by price, guest count, and room type to find the right stay without leaving the
            decision context.
          </p>
        </div>

        <div class="search-layout">
          <aside class="surface-panel search-rail">
            <div>
              <p class="field-label">Price range</p>
              <div class="form-grid" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
                <input type="number" placeholder="Minimum" [formControl]="filterForm.controls.minPrice" />
                <input type="number" placeholder="Maximum" [formControl]="filterForm.controls.maxPrice" />
              </div>
            </div>

            <div class="field-stack">
              <label class="field-label">Guests</label>
              <input type="number" min="1" [formControl]="filterForm.controls.capacity" />
            </div>

            <div class="field-stack">
              <p class="field-label">Room type</p>
              <div class="check-list">
                <label class="check-item"><input type="checkbox" value="standard" (change)="onTypeChange($event)" /> <span>Standard</span></label>
                <label class="check-item"><input type="checkbox" value="deluxe" (change)="onTypeChange($event)" /> <span>Deluxe</span></label>
                <label class="check-item"><input type="checkbox" value="suite" (change)="onTypeChange($event)" /> <span>Suite</span></label>
                <label class="check-item"><input type="checkbox" value="family" (change)="onTypeChange($event)" /> <span>Family</span></label>
              </div>
            </div>

            <p class="micro-copy">Use filters to narrow the stay style, then compare property details and payment structure.</p>
            <button class="btn-primary" (click)="applyFilters()" [disabled]="loading" [class.btn-loading]="loading">Apply Filters</button>
          </aside>

          <div class="search-results">
            <div class="search-results__header">
              <div>
                <p class="field-label">Available options</p>
                <p class="section-copy">Browse the available rooms and move into details only when one feels right.</p>
              </div>
              <div class="pill">{{ rooms.length }} room{{ rooms.length === 1 ? '' : 's' }}</div>
            </div>

            <app-loading-spinner [show]="loading"></app-loading-spinner>

            <div *ngIf="!loading && rooms.length === 0" class="surface-panel surface-panel--dense">
              <h3 class="section-title" style="font-size: 1.5rem;">No rooms match your filters.</h3>
              <p class="section-copy">Adjust price, dates, or guest count to widen the result set.</p>
            </div>

            <div class="results-grid" *ngIf="!loading && rooms.length">
              <app-property-card
                *ngFor="let room of rooms"
                [name]="room.name"
                [type]="room.type"
                [hotelName]="room.hotel_name || null"
                [description]="room.description || null"
                [capacity]="room.capacity"
                [price]="room.totalPrice"
                [amenities]="room.amenities"
                [images]="room.images"
                (book)="goToRoom(room.id)"
              ></app-property-card>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class RoomSearchComponent {
  rooms: Room[] = [];
  loading = false;
  selectedTypes = new Set<string>();

  filterForm = this.fb.group({
    minPrice: [''],
    maxPrice: [''],
    capacity: ['']
  });

  constructor(
    private fb: FormBuilder,
    private roomService: RoomService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParams.subscribe((params) => {
      const { checkin, checkout, guests, type } = params;
      if (checkin && checkout && guests) {
        this.searchWithDates(checkin, checkout, guests, type);
      } else {
        this.loadRooms();
      }
    });
  }

  private loadRooms(): void {
    this.loading = true;
    this.roomService.listRooms().subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private searchWithDates(checkin: string, checkout: string, guests: number, type?: string): void {
    this.loading = true;
    this.roomService.searchRooms({ checkin, checkout, guests: Number(guests), type }).subscribe({
      next: (rooms) => {
        this.rooms = rooms;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onTypeChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.checked) {
      this.selectedTypes.add(input.value);
    } else {
      this.selectedTypes.delete(input.value);
    }
  }

  applyFilters(): void {
    const { minPrice, maxPrice, capacity } = this.filterForm.value;
    const type = this.selectedTypes.size === 1 ? Array.from(this.selectedTypes)[0] : undefined;
    this.loading = true;
    this.roomService
      .listRooms({
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        capacity: capacity ? Number(capacity) : undefined,
        type
      })
      .subscribe({
        next: (rooms) => {
          this.rooms = rooms;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  goToRoom(id: number): void {
    this.router.navigate(['/property', 'room', id]);
  }
}
