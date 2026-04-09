import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PropertyImage } from './room.service';

export interface Tent {
  id: number;
  name: string;
  hotel_name?: string | null;
  type: string;
  description?: string;
  capacity: number;
  registrationAmount: number;
  arrivalAmount: number;
  totalPrice: number;
  basePrice?: number;
  amenities: string[];
  status: string;
  images: PropertyImage[];
  bookedDateRanges?: Array<{
    checkIn: string;
    checkOut: string;
    status: string;
  }>;
}

@Injectable({ providedIn: 'root' })
export class TentService {
  constructor(private http: HttpClient) {}

  listTents(filters?: {
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    capacity?: number;
  }): Observable<Tent[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<Tent[]>(`${environment.apiUrl}/tents`, { params });
  }

  searchTents(payload: {
    checkin: string;
    checkout: string;
    guests: number;
    type?: string;
  }): Observable<Tent[]> {
    let params = new HttpParams()
      .set('checkin', payload.checkin)
      .set('checkout', payload.checkout)
      .set('guests', payload.guests);
    if (payload.type) {
      params = params.set('type', payload.type);
    }
    return this.http.get<Tent[]>(`${environment.apiUrl}/tents/search`, { params });
  }

  getTent(id: number): Observable<Tent> {
    return this.http.get<Tent>(`${environment.apiUrl}/tents/${id}`);
  }
}

