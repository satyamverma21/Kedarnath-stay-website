import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CheckPhoneResponse {
  exists: boolean;
  guest_id: string | null;
}

export interface CreateGuestResponse {
  guest_id: string;
}

@Injectable({ providedIn: 'root' })
export class GuestService {
  constructor(private http: HttpClient) {}

  checkPhone(phone: string): Observable<CheckPhoneResponse> {
    return this.http.get<CheckPhoneResponse>(`${environment.apiUrl}/guests/check-phone`, {
      params: { phone }
    });
  }

  createGuest(payload: {
    phone: string;
    name: string;
    email?: string;
    password: string;
  }): Observable<CreateGuestResponse> {
    return this.http.post<CreateGuestResponse>(`${environment.apiUrl}/guests/create`, payload);
  }

  updateGuest(payload: { name: string; email?: string }): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${environment.apiUrl}/guests/update`, payload);
  }
}
