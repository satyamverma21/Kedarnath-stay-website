import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { RoomService } from '../../../core/services/room.service';
import { PropertyImage } from '../../../core/services/room.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

const MAX_IMAGES = 4;

interface AdminRoom {
  id: number;
  name: string;
  type: string;
  description?: string;
  capacity: number;
  basePrice: number;
  amenities: string[] | string | null;
  status: string;
}

interface AdminHotelOption {
  id: number;
  name: string;
}

@Component({
   selector: 'app-room-form',
   template: `
    <section>
      <h1 class="font-heading text-2xl mb-4">
        {{ isEdit ? 'Edit Room' : 'Add Room' }}
      </h1>
      <form [formGroup]="form" (ngSubmit)="save()" class="card p-4 space-y-3 text-sm">
        <div *ngIf="isSuperAdmin && !isEdit">
          <label class="block text-xs uppercase mb-1 tracking-widest">Hotel</label>
          <select formControlName="hotelId">
            <option value="" disabled>Select hotel</option>
            <option *ngFor="let h of hotels" [value]="h.id">{{ h.name }}</option>
          </select>
          <div class="text-xs text-red-600" *ngIf="submitted && form.get('hotelId')?.invalid">
            Hotel is required.
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Name</label>
          <input type="text" formControlName="name" />
          <div class="text-xs text-red-600" *ngIf="submitted && form.get('name')?.invalid">
            Name is required.
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Type</label>
          <select formControlName="type">
            <option value="standard">Standard</option>
            <option value="deluxe">Deluxe</option>
            <option value="suite">Suite</option>
            <option value="family">Family</option>
          </select>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Description</label>
          <textarea rows="3" formControlName="description"></textarea>
        </div>
        <div class="grid md:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest">Capacity</label>
            <input type="number" min="1" formControlName="capacity" />
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest">Base Price / night</label>
            <input type="number" min="0" formControlName="basePrice" />
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Amenities</label>
          <div formArrayName="amenities" class="space-y-1">
            <div *ngFor="let ctrl of amenities.controls; let i = index" class="flex gap-2">
              <input type="text" [formControlName]="i" class="flex-1" />
              <button type="button" class="btn-primary text-xs" (click)="removeAmenity(i)">
                Remove
              </button>
            </div>
          </div>
          <button type="button" class="btn-gold text-xs mt-2" (click)="addAmenity()">
            Add Amenity
          </button>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Status</label>
          <select formControlName="status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div *ngIf="isEdit && id" class="border-t border-sand/60 pt-4 mt-4">
          <label class="block text-xs uppercase mb-1 tracking-widest">Images</label>
          <p class="text-xs text-muted mb-2">Max {{ MAX_IMAGES }} images. JPEG, PNG or WEBP, 5MB each.</p>
          <div class="flex flex-wrap gap-3 mb-3">
            <div *ngFor="let img of roomImages" class="relative group">
              <img [src]="img.url" alt="Room" class="w-24 h-24 object-cover rounded-button border border-sand/60" />
              <div class="absolute inset-0 flex flex-col justify-center items-center gap-1 rounded-button bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <button type="button" class="btn-primary text-xs py-1" (click)="setPrimary(img.id)" *ngIf="!img.isPrimary">Set primary</button>
                <button type="button" class="text-xs py-1 px-2 bg-red-600 text-white rounded hover:bg-red-700" (click)="deleteImage(img.id)">Remove</button>
              </div>
              <span *ngIf="img.isPrimary" class="absolute top-1 left-1 text-xs bg-forest text-white px-1.5 py-0.5 rounded">Primary</span>
            </div>
          </div>
          <div *ngIf="roomImages.length < MAX_IMAGES" class="flex items-center gap-2">
            <input type="file" #fileInput accept="image/jpeg,image/png,image/webp" multiple (change)="onFileSelect($event)" class="text-sm" />
            <button type="button" class="btn-gold text-xs" (click)="uploadImages()" [disabled]="uploadingImages || !selectedFiles.length">
              Upload
            </button>
          </div>
          <p class="text-xs text-red-600 mt-1" *ngIf="imageError">{{ imageError }}</p>
        </div>
        <button class="btn-primary mt-2" type="submit" [disabled]="loading">
          {{ isEdit ? 'Update Room' : 'Create Room' }}
        </button>
        <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
      </form>
      <app-loading-spinner [show]="loading"></app-loading-spinner>
    </section>
  `
})
export class RoomFormComponent {
  readonly MAX_IMAGES = MAX_IMAGES;
  form = this.fb.group({
    name: ['', Validators.required],
    type: ['standard', Validators.required],
    description: [''],
    capacity: [2, Validators.required],
    basePrice: [0, Validators.required],
    amenities: this.fb.array<string>([]),
    status: ['active', Validators.required],
    hotelId: ['']
  });
  submitted = false;
  loading = false;
  error = '';
  isEdit = false;
  public id: number | null = null;
  roomImages: PropertyImage[] = [];
  imageError = '';
  uploadingImages = false;
  selectedFiles: File[] = [];
  hotels: AdminHotelOption[] = [];
  isSuperAdmin = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private roomService: RoomService,
    private auth: AuthService
  ) {
    const user = this.auth.getCurrentUser();
    this.isSuperAdmin = !!user && user.role === 'admin';
    if (this.isSuperAdmin) {
      this.loadHotels();
      const hotelCtrl = this.form.get('hotelId');
      hotelCtrl?.addValidators(Validators.required);
      hotelCtrl?.updateValueAndValidity();
    }
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.isEdit = true;
        this.id = Number(idParam);
        this.load();
      }
    });
    if (!this.isEdit) {
      this.addAmenity();
    }
  }

  private loadHotels(): void {
    this.http.get<AdminHotelOption[]>(`${environment.apiUrl}/admin/hotels`).subscribe({
      next: (hotels) => (this.hotels = hotels),
      error: () => {}
    });
  }

  get amenities(): FormArray {
    return this.form.get('amenities') as FormArray;
  }

  addAmenity(): void {
    this.amenities.push(this.fb.control(''));
  }

  removeAmenity(index: number): void {
    this.amenities.removeAt(index);
  }

  private load(): void {
    if (!this.id) {
      return;
    }
    this.loading = true;
    this.roomService.getRoom(this.id).subscribe({
      next: (room) => {
        const amenitiesArray = room.amenities || [];
        amenitiesArray.forEach((a: string) => this.amenities.push(this.fb.control(a)));
        if (!amenitiesArray.length) {
          this.addAmenity();
        }
        this.form.patchValue({
          name: room.name,
          type: room.type,
          description: room.description || '',
          capacity: room.capacity,
          basePrice: room.basePrice,
          status: room.status
        });
        this.roomImages = room.images || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;
    this.imageError = '';
    this.selectedFiles = Array.from(files).slice(0, MAX_IMAGES - this.roomImages.length);
    if (files.length > this.selectedFiles.length) {
      this.imageError = `Only ${MAX_IMAGES - this.roomImages.length} slot(s) left. Some files were not selected.`;
    }
  }

  uploadImages(): void {
    
    if (!this.id || !this.selectedFiles.length) return;
    this.imageError = '';
    this.uploadingImages = true;
    const formData = new FormData();
    this.selectedFiles.forEach((f) => formData.append('images', f));
    ;
    this.http.post<{ id: number; image_path: string; is_primary: number }[]>(`${environment.apiUrl}/admin/rooms/${this.id}/images`, formData).subscribe({
      next: () => {
        this.selectedFiles = [];
        this.roomService.getRoom(this.id!).subscribe((r) => (this.roomImages = r.images || []));
        this.uploadingImages = false;
      },
      error: (err) => {
        this.imageError = err?.error?.message || 'Upload failed.';
        this.uploadingImages = false;
      }
    });
  }

  deleteImage(imageId: number): void {
    if (!this.id) return;
    this.imageError = '';
    this.http.delete(`${environment.apiUrl}/admin/rooms/${this.id}/images/${imageId}`).subscribe({
      next: () => {
        this.roomService.getRoom(this.id!).subscribe((r) => (this.roomImages = r.images || []));
      },
      error: (err) => {
        this.imageError = err?.error?.message || 'Delete failed.';
      }
    });
  }

  setPrimary(imageId: number): void {
    if (!this.id) return;
    this.imageError = '';
    this.http.put(`${environment.apiUrl}/admin/rooms/${this.id}/images/${imageId}/primary`, {}).subscribe({
      next: () => {
        this.roomService.getRoom(this.id!).subscribe((r) => (this.roomImages = r.images || []));
      },
      error: (err) => {
        this.imageError = err?.error?.message || 'Set primary failed.';
      }
    });
  }

  save(): void {
    this.submitted = true;
    this.error = '';
    if (this.form.invalid) {
      return;
    }
    const payload: any = {
      ...this.form.value,
      amenities: this.amenities.value.filter((a: string) => !!a)
    };

    if (!this.isEdit && this.isSuperAdmin) {
      payload.hotelId = this.form.value.hotelId ? Number(this.form.value.hotelId) : null;
    } else {
      delete payload.hotelId;
    }
    this.loading = true;
    const req = this.isEdit && this.id
      ? this.http.put(`${environment.apiUrl}/admin/rooms/${this.id}`, payload)
      : this.http.post(`${environment.apiUrl}/admin/rooms`, payload);
    req.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/admin/rooms']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to save room.';
      }
    });
  }
}

