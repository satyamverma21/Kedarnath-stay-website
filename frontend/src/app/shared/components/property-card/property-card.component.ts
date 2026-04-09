import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { PropertyImage } from '../../../core/services/room.service';
import { CurrencyInrPipe } from '../../pipes/currency-inr.pipe';

@Component({
  selector: 'app-property-card',

  template: `
    <div class="card overflow-hidden flex flex-col h-full">
      <div class="relative h-44 sm:h-52 bg-sand overflow-hidden group">
        <img
          *ngIf="currentImageUrl"
          [src]="currentImageUrl"
          [alt]="name"
          class="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
        />
        <span class="absolute top-3 right-3 text-xs uppercase tracking-wide px-2.5 py-1 rounded-button bg-white/95 text-dark shadow-soft z-10">
          {{ type }}
        </span>
        <div *ngIf="images.length > 1" class="absolute inset-0 flex items-center justify-between px-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            class="flex-shrink-0 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
            (click)="prevImage($event)"
            aria-label="Previous image"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          </button>
          <button
            type="button"
            class="flex-shrink-0 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center"
            (click)="nextImage($event)"
            aria-label="Next image"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          </button>
        </div>
        <div *ngIf="images.length > 1" class="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
          <span *ngFor="let img of images; let i = index" class="w-1.5 h-1.5 rounded-full bg-white/80" [class.bg-white]="i === currentImageIndex"></span>
        </div>
      </div>
      <div class="p-4 sm:p-5 flex-1 flex flex-col gap-2">
        <h3 class="font-heading text-lg sm:text-xl text-dark leading-tight">{{ name }}</h3>
        <p class="text-sm text-muted leading-relaxed line-clamp-2" *ngIf="description">{{ description }}</p>
        <p class="text-sm text-muted">Sleeps up to {{ capacity }} guests</p>
        <div class="flex flex-wrap gap-1.5 pt-1" *ngIf="amenities.length">
          <span
            *ngFor="let amenity of amenities"
            class="inline-flex items-center rounded-full border border-sand/70 bg-sand/40 px-2 py-0.5 text-[11px] text-dark"
          >
            {{ amenity }}
          </span>
        </div>
        <div class="mt-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-sand/60">
          <div class="text-earth font-semibold text-base">
            <span>{{ price | currencyInr }}</span>
            <span class="text-xs text-muted font-normal ml-1">total</span>
          </div>
          <button class="btn-primary text-xs w-full sm:w-auto" (click)="book.emit()">
            Book Now
          </button>
        </div>
      </div>
    </div>
  `
})
export class PropertyCardComponent {
  @Input() name!: string;
  @Input() type!: string;
  @Input() hotelName?: string | null;
  @Input() description?: string | null;
  @Input() capacity!: number;
  @Input() price!: number;
  @Input() amenities: string[] = [];
  @Input() set images(value: PropertyImage[]) {
    const hadImages = this._images.length > 0;
    this._images = value || [];
    if (!hadImages && this._images.length > 0) {
      this.currentImageIndex = Math.max(0, this._images.findIndex((i) => i.isPrimary));
      if (this.currentImageIndex < 0) this.currentImageIndex = 0;
    }
  }
  get images(): PropertyImage[] {
    return this._images;
  }
  @Output() book = new EventEmitter<void>();

  private _images: PropertyImage[] = [];
  currentImageIndex = 0;

  get currentImageUrl(): string | null {
    if (!this._images?.length) return null;
    return this._images[this.currentImageIndex]?.url ?? this._images[0]?.url ?? null;
  }

  prevImage(e: Event): void {
    e.stopPropagation();
    if (this._images.length <= 1) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this._images.length) % this._images.length;
  }

  nextImage(e: Event): void {
    e.stopPropagation();
    if (this._images.length <= 1) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this._images.length;
  }
}

