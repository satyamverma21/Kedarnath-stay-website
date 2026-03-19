import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PromoCode {
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

export interface PromoCodeValidationResponse {
  valid: boolean;
  discount_percent?: number;
  agent_name?: string;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class PromoCodeService {
  constructor(private http: HttpClient) {}

  validatePromoCode(code: string): Observable<PromoCodeValidationResponse> {
    return this.http.post<PromoCodeValidationResponse>(`${environment.apiUrl}/promo-codes/validate`, { code });
  }

  getPromoCodes(): Observable<PromoCode[]> {
    return this.http.get<PromoCode[]>(`${environment.apiUrl}/promo-codes`);
  }
}
