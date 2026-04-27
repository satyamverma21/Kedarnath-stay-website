import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { PropertyImage } from '../../../core/services/room.service';
import { CurrencyInrPipe } from '../../pipes/currency-inr.pipe';

@Component({
  selector: 'app-property-card',

  template: `
    <article class="surface-panel surface-panel--feature property-card">
      <div class="property-card__media group">
        <img
          *ngIf="currentImageUrl"
          [src]="currentImageUrl"
          [alt]="name"
          class="w-full h-full object-cover"
        />
        <span class="pill absolute top-4 right-4 z-10" style="background: rgba(255,255,255,0.9); color: var(--color-brand-strong);">
          {{ type }}
        </span>
        <div *ngIf="images.length > 1" class="property-card__controls">
          <button
            type="button"
            class="property-card__icon-btn"
            (click)="prevImage($event)"
            aria-label="Previous image"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          </button>
          <button
            type="button"
            class="property-card__icon-btn"
            (click)="nextImage($event)"
            aria-label="Next image"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
          </button>
        </div>
        <div *ngIf="images.length > 1" class="detail-gallery__nav" style="left: auto; right: auto; width: calc(100% - 2rem);">
          <span></span>
          <div class="detail-gallery__dots">
            <span *ngFor="let img of images; let i = index" class="detail-gallery__dot" [class.is-active]="i === currentImageIndex"></span>
          </div>
        </div>
      </div>
      <div class="property-card__body">
        <div class="property-card__meta">
          <span class="pill">{{ hotelName || 'Kedarnath stay' }}</span>
          <span class="pill">Sleeps {{ capacity }}</span>
        </div>
        <h3 class="section-title" style="font-size: 1.6rem;">{{ name }}</h3>
        <p class="text-muted line-clamp-2" *ngIf="description">{{ description }}</p>
        <div class="chip-list" *ngIf="amenities.length">
          <span
            *ngFor="let amenity of amenities"
            class="chip"
          >
            {{ amenity }}
          </span>
        </div>
        <div class="property-card__footer">
          <div class="property-card__price">
            <strong>{{ price | currencyInr }}</strong>
            <span class="micro-copy">total stay</span>
          </div>
          <button class="btn-primary" (click)="book.emit()">
            Book Now
          </button>
        </div>
      </div>
    </article>
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

