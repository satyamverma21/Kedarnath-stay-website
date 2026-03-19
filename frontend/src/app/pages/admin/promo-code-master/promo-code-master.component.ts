import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { environment } from '../../../../environments/environment';

interface PromoCode {
  id: number;
  code: string;
  agent_id: number;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  status: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
  agent_name?: string;
  agent_email?: string;
}

interface Agent {
  id: number;
  name: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-promo-code-master',

  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h1 class="font-heading text-2xl">Promo Code Master</h1>
        <button (click)="showCreateForm = !showCreateForm" class="btn-primary text-sm">
          {{ showCreateForm ? 'Cancel' : 'Create Promo Code' }}
        </button>
      </div>

      <!-- Create/Edit Form -->
      <div *ngIf="showCreateForm" class="bg-white p-6 rounded-lg border border-sand">
        <h2 class="font-semibold text-lg mb-4">{{ editingPromoCode ? 'Edit Promo Code' : 'Create New Promo Code' }}</h2>
        <form [formGroup]="promoCodeForm" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-1">Promo Code</label>
              <input 
                type="text" 
                formControlName="code" 
                class="w-full px-3 py-2 border border-sand rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., SAVE10"
              >
              <div *ngIf="promoCodeForm.get('code')?.invalid && promoCodeForm.get('code')?.touched" class="text-red-500 text-xs mt-1">
                Promo code is required
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Agent</label>
              <select 
                formControlName="agent_id" 
                class="w-full px-3 py-2 border border-sand rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Agent</option>
                <option *ngFor="let agent of agents" [value]="agent.id">
                  {{ agent.name }} ({{ agent.email }})
                </option>
              </select>
              <div *ngIf="promoCodeForm.get('agent_id')?.invalid && promoCodeForm.get('agent_id')?.touched" class="text-red-500 text-xs mt-1">
                Agent is required
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Discount (%)</label>
              <input 
                type="number" 
                formControlName="discount_percent" 
                class="w-full px-3 py-2 border border-sand rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 10"
                min="1"
                max="100"
              >
              <div *ngIf="promoCodeForm.get('discount_percent')?.invalid && promoCodeForm.get('discount_percent')?.touched" class="text-red-500 text-xs mt-1">
                Discount percent is required (1-100)
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Max Uses (0 = unlimited)</label>
              <input 
                type="number" 
                formControlName="max_uses" 
                class="w-full px-3 py-2 border border-sand rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., 50"
                min="0"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Valid Until</label>
              <input 
                type="date" 
                formControlName="valid_until" 
                class="w-full px-3 py-2 border border-sand rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
            </div>
            
            <div>
              <label class="block text-sm font-medium mb-1">Status</label>
              <select 
                formControlName="status" 
                class="w-full px-3 py-2 border border-sand rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          <div class="flex gap-2">
            <button type="submit" class="btn-primary" [disabled]="promoCodeForm.invalid || loading">
              {{ editingPromoCode ? 'Update' : 'Create' }}
            </button>
            <button type="button" (click)="resetForm()" class="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <!-- Loading State -->
      <app-loading-spinner [show]="loading"></app-loading-spinner>

      <!-- Promo Codes List -->
      <div *ngIf="!loading" class="bg-white rounded-lg border border-sand">
        <div class="p-4 border-b border-sand">
          <h2 class="font-semibold">All Promo Codes</h2>
        </div>
        
        <div *ngIf="promoCodes.length === 0" class="p-8 text-center text-muted">
          No promo codes found.
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-sand">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Code</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Agent</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Discount</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Usage</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Valid Until</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sand">
              <tr *ngFor="let promo of promoCodes">
                <td class="px-4 py-3 font-mono text-sm">{{ promo.code }}</td>
                <td class="px-4 py-3 text-sm">
                  <div>{{ promo.agent_name }}</div>
                  <div class="text-xs text-muted">{{ promo.agent_email }}</div>
                </td>
                <td class="px-4 py-3 text-sm">{{ promo.discount_percent }}%</td>
                <td class="px-4 py-3 text-sm">
                  {{ promo.used_count }}{{ promo.max_uses > 0 ? '/' + promo.max_uses : '' }}
                </td>
                <td class="px-4 py-3 text-sm">
                  {{ promo.valid_until ? (promo.valid_until | date:'mediumDate') : 'No expiry' }}
                </td>
                <td class="px-4 py-3">
                  <span [class]="'px-2 py-1 text-xs rounded-full ' + (promo.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800')">
                    {{ promo.status }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <button (click)="editPromoCode(promo)" class="btn-primary text-xs">
                      Edit
                    </button>
                    <button (click)="deletePromoCode(promo)" class="btn-primary text-xs bg-red-500 hover:bg-red-600">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class PromoCodeMasterComponent implements OnInit {
  promoCodes: PromoCode[] = [];
  agents: Agent[] = [];
  loading = false;
  showCreateForm = false;
  editingPromoCode: PromoCode | null = null;
  
  promoCodeForm: FormGroup;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder
  ) {
    this.promoCodeForm = this.fb.group({
      code: ['', Validators.required],
      agent_id: ['', Validators.required],
      discount_percent: ['', [Validators.required, Validators.min(1), Validators.max(100)]],
      max_uses: [0],
      valid_until: [''],
      status: ['active']
    });
  }

  ngOnInit(): void {
    this.loadPromoCodes();
    this.loadAgents();
  }

  loadPromoCodes(): void {
    this.loading = true;
    this.http.get<PromoCode[]>(`${environment.apiUrl}/promo-codes`).subscribe({
      next: (data) => {
        this.promoCodes = data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadAgents(): void {
    this.http.get<Agent[]>(`${environment.apiUrl}/promo-codes/agents/list`).subscribe({
      next: (data) => {
        this.agents = data;
      },
      error: () => {
        console.error('Failed to load agents');
      }
    });
  }

  onSubmit(): void {
    if (this.promoCodeForm.invalid) return;

    this.loading = true;
    const formData = this.promoCodeForm.value;

    if (this.editingPromoCode) {
      this.http.put<PromoCode>(`${environment.apiUrl}/promo-codes/${this.editingPromoCode.id}`, formData).subscribe({
        next: () => {
          this.loadPromoCodes();
          this.resetForm();
        },
        error: () => {
          this.loading = false;
        }
      });
    } else {
      this.http.post<PromoCode>(`${environment.apiUrl}/promo-codes`, formData).subscribe({
        next: () => {
          this.loadPromoCodes();
          this.resetForm();
        },
        error: () => {
          this.loading = false;
        }
      });
    }
  }

  editPromoCode(promo: PromoCode): void {
    this.editingPromoCode = promo;
    this.showCreateForm = true;
    this.promoCodeForm.patchValue({
      code: promo.code,
      agent_id: promo.agent_id,
      discount_percent: promo.discount_percent,
      max_uses: promo.max_uses,
      valid_until: promo.valid_until ? promo.valid_until.split('T')[0] : '',
      status: promo.status
    });
  }

  deletePromoCode(promo: PromoCode): void {
    if (!confirm(`Are you sure you want to delete promo code "${promo.code}"?`)) {
      return;
    }

    this.loading = true;
    this.http.delete(`${environment.apiUrl}/promo-codes/${promo.id}`).subscribe({
      next: () => {
        this.loadPromoCodes();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  resetForm(): void {
    this.promoCodeForm.reset({
      code: '',
      agent_id: '',
      discount_percent: '',
      max_uses: 0,
      valid_until: '',
      status: 'active'
    });
    this.editingPromoCode = null;
    this.showCreateForm = false;
  }
}
