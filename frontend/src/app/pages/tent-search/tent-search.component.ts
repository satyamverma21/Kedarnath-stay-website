import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgForOf, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { TentService, Tent } from '../../core/services/tent.service';
import { PropertyCardComponent } from '../../shared/components/property-card/property-card.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-tent-search',
  template: `
    <section class="bg-gradient-to-b from-sand/20 to-cream border-b border-sand/60 py-6 sm:py-8">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-1">Tents</h1>
        <p class="text-muted text-sm sm:text-base">Find glamping tents for starry nights.</p>
      </div>
    </section>

    <section class="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid md:grid-cols-[280px,1fr] gap-6 lg:gap-8">
      <aside class="card p-4 sm:p-5 space-y-4 h-fit md:sticky md:top-24">
        <h2 class="font-semibold text-dark mb-3 text-sm tracking-widest uppercase">Filters</h2>
        <div>
          <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Price range (₹)</label>
          <div class="flex gap-2">
            <input type="number" placeholder="Min" class="flex-1" [formControl]="filterForm.controls.minPrice" />
            <input type="number" placeholder="Max" class="flex-1" [formControl]="filterForm.controls.maxPrice" />
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Guests</label>
          <input type="number" min="1" [formControl]="filterForm.controls.capacity" />
        </div>
        <div>
          <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Tent type</label>
          <div class="space-y-2 text-sm mt-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="standard" (change)="onTypeChange($event)" class="rounded" />
              <span>Standard</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="luxury" (change)="onTypeChange($event)" class="rounded" />
              <span>Luxury</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="safari" (change)="onTypeChange($event)" class="rounded" />
              <span>Safari</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" value="honeymoon" (change)="onTypeChange($event)" class="rounded" />
              <span>Honeymoon</span>
            </label>
          </div>
        </div>
        <div class="text-xs text-muted pt-1">
          <p>Bonfire and stargazing options are in amenity details.</p>
        </div>
        <button class="btn-primary w-full mt-3" (click)="applyFilters()">Apply Filters</button>
      </aside>

      <div class="min-w-0">
        <app-loading-spinner [show]="loading"></app-loading-spinner>
        <div *ngIf="!loading && tents.length === 0" class="card p-8 sm:p-10 text-center text-muted">
          No tents match your filters. Try adjusting price or dates.
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" *ngIf="!loading && tents.length">
          <app-property-card
            *ngFor="let tent of tents"
            [name]="tent.name"
            [type]="tent.type"
            [capacity]="tent.capacity"
            [price]="tent.totalPrice"
            [images]="tent.images"
            (book)="goToTent(tent.id)"
          ></app-property-card>
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
    this.tentService
      .searchTents({ checkin, checkout, guests: Number(guests), type })
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

