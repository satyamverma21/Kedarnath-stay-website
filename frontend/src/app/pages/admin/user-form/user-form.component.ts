import { Component } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgIf, NgForOf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../core/services/toast.service';

interface AdminHotelOption {
  id: number;
  name: string;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  hotel_id?: number | null;
}

@Component({
  selector: 'app-user-form',
  standalone: false,
  template: `
    <section>
      <h1 class="font-heading text-2xl mb-4">
        {{ isEdit ? 'Edit User' : 'Add User' }}
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
          <label class="block text-xs uppercase mb-1 tracking-widest">Phone</label>
          <input type="tel" formControlName="phone" />
          <div class="text-xs text-red-600" *ngIf="submitted && form.get('phone')?.invalid">
            Enter a valid 10-digit mobile number.
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Email</label>
          <input type="email" formControlName="email" />
          <div class="text-xs text-red-600" *ngIf="submitted && form.get('email')?.invalid">
            Enter a valid email address.
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1 tracking-widest">Role</label>
          <select formControlName="role">
            <option value="admin">Admin</option>
            <option value="hotel-admin">Hotel Admin</option>
            <option value="agent">Agent</option>
            <option value="customer">Customer</option>
          </select>
        </div>
        <div *ngIf="currentRole === 'hotel-admin'">
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
          <label class="block text-xs uppercase mb-1 tracking-widest">
            Password
            <span class="text-muted" *ngIf="isEdit">(leave blank to keep current)</span>
          </label>
          <input type="password" formControlName="password" />
          <div
            class="text-xs text-red-600"
            *ngIf="submitted && !isEdit && form.get('password')?.invalid"
          >
            Password is required for new users.
          </div>
        </div>
        <button class="btn-primary mt-2" type="submit" [disabled]="loading" [class.btn-loading]="loading">
          {{ isEdit ? 'Update User' : 'Create User' }}
        </button>
        <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
      </form>
      <app-loading-spinner [show]="loading"></app-loading-spinner>
    </section>
  `
})
export class UserFormComponent {
  private readonly mobilePattern = /^[0-9]{10}$/;

  form = this.fb.group({
    name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(this.mobilePattern)]],
    email: ['', Validators.email],
    role: ['admin', Validators.required],
    hotelId: [''],
    password: ['']
  });
  submitted = false;
  loading = false;
  error = '';
  isEdit = false;
  id: number | null = null;
  hotels: AdminHotelOption[] = [];
  currentRole: string = 'admin';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router,
    private toast: ToastService
  ) {
    this.loadHotels();
    const roleCtrl = this.form.get('role');
    roleCtrl?.valueChanges.subscribe((role) => {
      this.currentRole = role || 'admin';
      const hotelCtrl = this.form.get('hotelId');
      if (!hotelCtrl) return;
      if (this.currentRole === 'hotel-admin') {
        hotelCtrl.setValidators([Validators.required]);
      } else {
        hotelCtrl.clearValidators();
        hotelCtrl.setValue('');
      }
      hotelCtrl.updateValueAndValidity();
    });
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      if (idParam) {
        this.isEdit = true;
        this.id = Number(idParam);
        this.loadUser();
      }
    });
  }

  loadHotels(): void {
    this.http.get<AdminHotelOption[]>(`${environment.apiUrl}/admin/hotels`).subscribe({
      next: (hotels) => (this.hotels = hotels),
      error: () => {}
    });
  }

  loadUser(): void {
    if (!this.id) return;
    this.loading = true;
    this.http.get<AdminUser>(`${environment.apiUrl}/admin/users`, { params: { id: this.id } }).subscribe({
      next: (user) => {
        const u = Array.isArray(user) ? user[0] : user;
        if (u) {
          this.form.patchValue({
            name: u.name,
            phone: u.phone || '',
            email: u.email,
            role: u.role,
            hotelId: (u as any).hotel_id ?? ''
          });
          this.currentRole = u.role;
        }
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

    const name = (this.form.value.name || '').trim();
    const phone = (this.form.value.phone || '').trim();
    const password = (this.form.value.password || '').trim();

    if (!this.isEdit) {
      const missingFields: string[] = [];
      if (!name) missingFields.push('name');
      if (!phone) missingFields.push('phone');
      if (!password) missingFields.push('password');

      if (missingFields.length > 0) {
        this.toast.error('Name, phone and password are mandatory for new users.');
      }
    }

    if (this.form.invalid || (!this.isEdit && !password)) {
      return;
    }
    this.loading = true;

    const payload: any = {
      name,
      phone,
      email: this.form.value.email,
      role: this.form.value.role,
      hotelId: this.form.value.hotelId ? Number(this.form.value.hotelId) : null
    };
    if (password) {
      payload.password = password;
    }

    const req = this.isEdit && this.id
      ? this.http.put(`${environment.apiUrl}/admin/users/${this.id}`, payload)
      : this.http.post(`${environment.apiUrl}/admin/users`, payload);

    req.subscribe({
      next: () => {
        this.loading = false;
        this.toast.success(this.isEdit ? 'User updated successfully.' : 'User created successfully.');
        this.router.navigate(['/admin/users']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Unable to save user.';
        this.toast.error(this.error);
      }
    });
  }
}

