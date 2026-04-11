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
import { ToastService } from '../../../core/services/toast.service';

const MAX_IMAGES = 4;

interface AdminRoom {
  id: number;
  name: string;
  type: string;
  description?: string;
  capacity: number;
  quantity: number;
  registrationAmount: number;
  arrivalAmount: number;
  totalPrice: number;
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
            <div class="text-xs text-red-600" *ngIf="submitted && form.get('capacity')?.invalid">
              Capacity must be at least 1.
            </div>
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest">Quantity</label>
            <input type="number" min="1" step="1" formControlName="quantity" />
            <div class="text-xs text-red-600" *ngIf="submitted && form.get('quantity')?.invalid">
              Quantity must be at least 1.
            </div>
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest">Downpayment Amount</label>
            <input type="number" min="0" formControlName="registrationAmount" />
            <div class="text-xs text-red-600" *ngIf="submitted && form.get('registrationAmount')?.invalid">
              Downpayment amount must be greater than 0.
            </div>
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest">Arrival Amount</label>
            <input type="number" min="0" formControlName="arrivalAmount" />
            <div class="text-xs text-red-600" *ngIf="submitted && form.get('arrivalAmount')?.invalid">
              Arrival amount must be greater than 0.
            </div>
          </div>
          <div>
            <label class="block text-xs uppercase mb-1 tracking-widest">Total Price</label>
            <input type="number" [value]="computedTotal" readonly />
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Amenities</label>
          <div formArrayName="amenities" class="space-y-1">
            <div *ngFor="let ctrl of amenities.controls; let i = index" class="flex flex-col sm:flex-row gap-2">
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
                <button type="button" class="btn-primary text-xs py-1" (click)="setPrimary(img.id)" *ngIf="!img.isPrimary" [disabled]="isImageActionLoading(img.id, 'primary')" [class.btn-loading]="isImageActionLoading(img.id, 'primary')">Set primary</button>
                <button type="button" class="text-xs py-1 px-2 bg-red-600 text-white rounded hover:bg-red-700" (click)="deleteImage(img.id)" [disabled]="isImageActionLoading(img.id, 'delete')" [class.btn-loading]="isImageActionLoading(img.id, 'delete')">Remove</button>
              </div>
              <span *ngIf="img.isPrimary" class="absolute top-1 left-1 text-xs bg-forest text-white px-1.5 py-0.5 rounded">Primary</span>
            </div>
          </div>
          <div *ngIf="roomImages.length < MAX_IMAGES" class="flex flex-col sm:flex-row sm:items-center gap-2">
            <input type="file" #fileInput accept="image/jpeg,image/png,image/webp" multiple (change)="onFileSelect($event)" class="text-sm w-full sm:w-auto" />
            <button type="button" class="btn-gold text-xs" (click)="uploadImages()" [disabled]="uploadingImages || !selectedFiles.length" [class.btn-loading]="uploadingImages">
              Upload
            </button>
          </div>
          <p class="text-xs text-red-600 mt-1" *ngIf="imageError">{{ imageError }}</p>
        </div>
        <button class="btn-primary mt-2" type="submit" [disabled]="loading" [class.btn-loading]="loading">
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
    capacity: [2, [Validators.required, Validators.min(1)]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    registrationAmount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    arrivalAmount: [null as number | null, [Validators.required, Validators.min(0.01)]],
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
  activeImageActionKey: string | null = null;
  hotels: AdminHotelOption[] = [];
  isSuperAdmin = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private roomService: RoomService,
    private auth: AuthService,
    private toast: ToastService
  ) {
    const user = this.auth.getCurrentUser();
    this.isSuperAdmin = !!user && user.role === 'admin';
    if (this.isSuperAdmin) {
      this.loadHotels();
    }
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      this.isEdit = !!idParam;
      this.syncHotelValidator();
      if (this.isEdit) {
        this.id = Number(idParam);
        this.load();
      } else {
        this.id = null;
        if (!this.amenities.length) {
          this.addAmenity();
        }
      }
    });
  }

  private syncHotelValidator(): void {
    const hotelCtrl = this.form.get('hotelId');
    if (!hotelCtrl) {
      return;
    }
    if (this.isSuperAdmin && !this.isEdit) {
      hotelCtrl.setValidators(Validators.required);
    } else {
      hotelCtrl.clearValidators();
      hotelCtrl.setValue('');
    }
    hotelCtrl.updateValueAndValidity();
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
  get computedTotal(): number {
    const registrationAmount = Number(this.form.get('registrationAmount')?.value || 0);
    const arrivalAmount = Number(this.form.get('arrivalAmount')?.value || 0);
    return registrationAmount + arrivalAmount;
  }

  addAmenity(): void {
    this.amenities.push(this.fb.control(''));
  }

  removeAmenity(index: number): void {
    this.amenities.removeAt(index);
  }

  private parseAmenities(rawAmenities: unknown): string[] {
    if (Array.isArray(rawAmenities)) {
      return rawAmenities.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof rawAmenities === 'string') {
      const trimmed = rawAmenities.trim();
      if (!trimmed) {
        return [];
      }
      try {
        return this.parseAmenities(JSON.parse(trimmed));
      } catch {
        return [trimmed];
      }
    }
    return [];
  }

  private resetAmenities(values: string[]): void {
    this.amenities.clear();
    values.forEach((amenity) => this.amenities.push(this.fb.control(amenity)));
    if (!values.length) {
      this.addAmenity();
    }
  }

  private load(): void {
    if (!this.id) {
      return;
    }
    this.loading = true;
    this.roomService.getRoom(this.id).subscribe({
      next: (room) => {
        const amenitiesArray = this.parseAmenities(room.amenities);
        this.resetAmenities(amenitiesArray);
        this.form.patchValue({
          name: room.name,
          type: room.type,
          description: room.description || '',
          capacity: room.capacity,
          quantity: Number((room as any).quantity || 1),
          registrationAmount: room.registrationAmount,
          arrivalAmount: room.arrivalAmount,
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
        this.toast.success('Room images uploaded successfully.');
      },
      error: (err) => {
        this.imageError = err?.error?.message || 'Upload failed.';
        this.uploadingImages = false;
        this.toast.error(this.imageError);
      }
    });
  }

  deleteImage(imageId: number): void {
    if (!this.id) return;
    this.imageError = '';
    this.activeImageActionKey = this.imageActionKey(imageId, 'delete');
    this.http.delete(`${environment.apiUrl}/admin/rooms/${this.id}/images/${imageId}`).subscribe({
      next: () => {
        this.activeImageActionKey = null;
        this.roomService.getRoom(this.id!).subscribe((r) => (this.roomImages = r.images || []));
        this.toast.success('Room image deleted.');
      },
      error: (err) => {
        this.activeImageActionKey = null;
        this.imageError = err?.error?.message || 'Delete failed.';
        this.toast.error(this.imageError);
      }
    });
  }

  setPrimary(imageId: number): void {
    if (!this.id) return;
    this.imageError = '';
    this.activeImageActionKey = this.imageActionKey(imageId, 'primary');
    this.http.put(`${environment.apiUrl}/admin/rooms/${this.id}/images/${imageId}/primary`, {}).subscribe({
      next: () => {
        this.activeImageActionKey = null;
        this.roomService.getRoom(this.id!).subscribe((r) => (this.roomImages = r.images || []));
        this.toast.success('Primary room image updated.');
      },
      error: (err) => {
        this.activeImageActionKey = null;
        this.imageError = err?.error?.message || 'Set primary failed.';
        this.toast.error(this.imageError);
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
      quantity: Number(this.form.value.quantity || 1),
      amenities: this.amenities.value.map((a: string) => a?.trim()).filter((a: string) => !!a)
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
        this.toast.success(this.isEdit ? 'Room updated successfully.' : 'Room created successfully.');
        this.router.navigate(['/admin/rooms']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to save room.';
        this.toast.error(this.error);
      }
    });
  }

  private imageActionKey(imageId: number, action: 'delete' | 'primary'): string {
    return `${action}:${imageId}`;
  }

  isImageActionLoading(imageId: number, action: 'delete' | 'primary'): boolean {
    return this.activeImageActionKey === this.imageActionKey(imageId, action);
  }
}

