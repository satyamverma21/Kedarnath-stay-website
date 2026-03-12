import { Component } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
 
  selector: 'app-login',
    template: `
    <div class="auth-cover">
    <section class="max-w-md w-full">
      <h1 class="font-heading text-2xl sm:text-3xl text-dark mb-6">Login</h1>
      <form [formGroup]="form" (ngSubmit)="login()" class="card p-5 sm:p-6 space-y-4">
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
            Password is required.
          </div>
        </div>
        <button class="btn-primary w-full mt-2" type="submit" [disabled]="loading">
          Login
        </button>
        <div class="text-xs text-red-600" *ngIf="error">{{ error }}</div>
        <p class="text-sm text-muted pt-2">
          New here?
          <a routerLink="/register" class="text-forest font-medium hover:underline">Create an account</a>
        </p>
      </form>
      <app-loading-spinner [show]="loading"></app-loading-spinner>
    </section>
    </div>
  `
})
export class LoginComponent {
  
  form = this.fb.group({
    phone: ['', [Validators.required]],
    password: ['', Validators.required]
  });
  submitted = false;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {}

  login(): void {
    this.submitted = true;
    this.error = '';
    if (this.form.invalid) {
      return;
    }
    const { phone, password } = this.form.value;
    this.loading = true;
    this.auth.login(phone!, password!).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Invalid credentials.';
      }
    });
  }
}

