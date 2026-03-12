import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';

interface AdminHotel {
  id: number;
  name: string;
  city?: string | null;
  status: string;
}

@Component({
  selector: 'app-hotel-form',
  standalone: false,
  template: `
    <section>
      <h1 class="font-heading text-2xl mb-4">
        {{ isEdit ? 'Edit Hotel' : 'Add Hotel' }}
      </h1>
      <form [formGroup]="form" (ngSubmit)="save()" class="card p-4 space-y-3 text-sm">
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Name</label>
          <input type="text" formControlName="name" />
          <div class="text-xs text-red-600" *ngIf="submitted && form.get('name')?.invalid">
            Name is required.
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">City</label>
          <input type="text" formControlName="city" />
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Status</label>
          <select formControlName="status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button class="btn-primary mt-2" type="submit" [disabled]="loading">
          {{ isEdit ? 'Update Hotel' : 'Create Hotel' }}
        </button>
        <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
      </form>
      <app-loading-spinner [show]="loading"></app-loading-spinner>
    </section>
  `
})
export class HotelFormComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    city: [''],
    status: ['active', Validators.required]
  });
  submitted = false;
  loading = false;
  error = '';
  isEdit = false;
  id: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.isEdit = true;
        this.id = Number(idParam);
        this.load();
      }
    });
  }

  private load(): void {
    if (!this.id) {
      return;
    }
    this.loading = true;
    this.http.get<AdminHotel>(`${environment.apiUrl}/admin/hotels/${this.id}`).subscribe({
      next: (hotel) => {
        this.form.patchValue({
          name: hotel.name,
          city: hotel.city || '',
          status: hotel.status
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  save(): void {
    this.submitted = true;
    this.error = '';
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const payload = this.form.value;
    const req = this.isEdit && this.id
      ? this.http.put(`${environment.apiUrl}/admin/hotels/${this.id}`, payload)
      : this.http.post(`${environment.apiUrl}/admin/hotels`, payload);
    req.subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/admin/hotels']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to save hotel.';
      }
    });
  }
}

