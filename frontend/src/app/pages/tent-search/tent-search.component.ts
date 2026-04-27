import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TentService, Tent } from '../../core/services/tent.service';
import { PropertyCardComponent } from '../../shared/components/property-card/property-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-tent-search',
  template: `
    <section class="page-section page-section--tight">
      <div class="page-container search-shell">
        <div class="search-shell__header">
          <p class="eyebrow">Tent collection</p>
          <h1 class="section-title">Immersive tent stays for quieter, more atmospheric nights.</h1>
          <p class="section-copy">
            Compare glamping options with a cleaner layout that keeps availability and decision
            signals close together.
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
              <p class="field-label">Tent type</p>
              <div class="check-list">
                <label class="check-item"><input type="checkbox" value="standard" (change)="onTypeChange($event)" /> <span>Standard</span></label>
                <label class="check-item"><input type="checkbox" value="luxury" (change)="onTypeChange($event)" /> <span>Luxury</span></label>
                <label class="check-item"><input type="checkbox" value="safari" (change)="onTypeChange($event)" /> <span>Safari</span></label>
                <label class="check-item"><input type="checkbox" value="honeymoon" (change)="onTypeChange($event)" /> <span>Honeymoon</span></label>
              </div>
            </div>

            <p class="micro-copy">Bonfire, view, and special setup details stay visible inside each property card and detail page.</p>
            <button class="btn-primary" (click)="applyFilters()" [disabled]="loading" [class.btn-loading]="loading">Apply Filters</button>
          </aside>

          <div class="search-results">
            <div class="search-results__header">
              <div>
                <p class="field-label">Available options</p>
                <p class="section-copy">Browse tent styles and open only the stays worth deeper attention.</p>
              </div>
              <div class="pill">{{ tents.length }} tent{{ tents.length === 1 ? '' : 's' }}</div>
            </div>

            <app-loading-spinner [show]="loading"></app-loading-spinner>

            <div *ngIf="!loading && tents.length === 0" class="surface-panel surface-panel--dense">
              <h3 class="section-title" style="font-size: 1.5rem;">No tents match your filters.</h3>
              <p class="section-copy">Adjust price, dates, or type to reveal more options.</p>
            </div>

            <div class="results-grid" *ngIf="!loading && tents.length">
              <app-property-card
                *ngFor="let tent of tents"
                [name]="tent.name"
                [type]="tent.type"
                [hotelName]="tent.hotel_name || null"
                [description]="tent.description || null"
                [capacity]="tent.capacity"
                [price]="tent.totalPrice"
                [amenities]="tent.amenities"
                [images]="tent.images"
                (book)="goToTent(tent.id)"
              ></app-property-card>
            </div>
          </div>
        </div>
      </div>
    </section>
  `
})
export class TentSearchComponent {
  tents: Tent[] = [];
  loading = false;
  selectedTypes = new Set<string>();

  filterForm = this.fb.group({
    minPrice: [''],
    maxPrice: [''],
    capacity: ['']
  });

  constructor(
    private fb: FormBuilder,
    private tentService: TentService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParams.subscribe((params) => {
      const { checkin, checkout, guests, type } = params;
      if (checkin && checkout && guests) {
        this.searchWithDates(checkin, checkout, guests, type);
      } else {
        this.loadTents();
      }
    });
  }

  private loadTents(): void {
    this.loading = true;
    this.tentService.listTents().subscribe({
      next: (tents) => {
        this.tents = tents;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  private searchWithDates(checkin: string, checkout: string, guests: number, type?: string): void {
    this.loading = true;
    this.tentService.searchTents({ checkin, checkout, guests: Number(guests), type }).subscribe({
      next: (tents) => {
        this.tents = tents;
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
    this.tentService
      .listTents({
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        capacity: capacity ? Number(capacity) : undefined,
        type
      })
      .subscribe({
        next: (tents) => {
          this.tents = tents;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  goToTent(id: number): void {
    this.router.navigate(['/property', 'tent', id]);
  }
}
