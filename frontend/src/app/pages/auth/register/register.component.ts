import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
 
  selector: 'app-register',
  template: `
    <div class="auth-cover">
    <section class="max-w-md w-full">
      <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-6">Create account</h1>
      <form [formGroup]="form" (ngSubmit)="register()" class="card p-5 sm:p-6 space-y-4">
        <div>
          <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Name</label>
          <input type="text" formControlName="name" class="w-full" />
          <div class="text-xs text-red-600 mt-1" *ngIf="submitted && form.get('name')?.invalid">
            Name is required.
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Email (optional)</label>
          <input type="email" formControlName="email" class="w-full" />
          <div
            class="text-xs text-red-600 mt-1"
            *ngIf="submitted && form.get('email')?.value && form.get('email')?.invalid"
          >
            Please enter a valid email.
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Phone</label>
          <input type="tel" formControlName="phone" class="w-full" />
          <div class="text-xs text-red-600 mt-1" *ngIf="submitted && form.get('phone')?.invalid">
            Phone is required.
          </div>
        </div>
        <div>
          <label class="block text-xs uppercase mb-1.5 tracking-widest text-muted">Password</label>
          <input type="password" formControlName="password" class="w-full" />
          <div class="text-xs text-red-600 mt-1" *ngIf="submitted && form.get('password')?.invalid">
            Password must be at least 6 characters.
          </div>
        </div>
        <button class="btn-primary w-full mt-2" type="submit" [disabled]="loading">
          Register
        </button>
        <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
        <p class="text-sm text-muted pt-2">
          Already have an account?
          <a routerLink="/login" class="text-forest font-medium hover:underline">Login</a>
        </p>
      </form>
      <app-loading-spinner [show]="loading"></app-loading-spinner>
    </section>
    </div>
  `
})
export class RegisterComponent {
  form = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.email]],
    phone: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });
  submitted = false;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  register(): void {
    this.submitted = true;
    this.error = '';
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    const { name, email, phone, password } = this.form.value;
    const payload: {
      name: string;
      password: string;
      phone: string;
      email?: string;
    } = {
      name: name!,
      password: password!,
      phone: phone!
    };

    if (email) {
      payload.email = email;
    }

    this.auth
      .register(payload)
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Unable to register.';
        }
      });
  }
}

