import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PropertyImage {
  id: number;
  isPrimary: boolean;
  url: string;
}

export interface Room {
  id: number;
  name: string;
  hotel_name?: string | null;
  type: string;
  description?: string;
  capacity: number;
  quantity: number;
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
export class RoomService {
  constructor(private http: HttpClient) {}

  listRooms(filters?: {
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    capacity?: number;
  }): Observable<Room[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<Room[]>(`${environment.apiUrl}/rooms`, { params });
  }

  searchRooms(payload: {
    checkin: string;
    checkout: string;
    guests: number;
    type?: string;
  }): Observable<Room[]> {
    let params = new HttpParams()
      .set('checkin', payload.checkin)
      .set('checkout', payload.checkout)
      .set('guests', payload.guests);
    if (payload.type) {
      params = params.set('type', payload.type);
    }
    return this.http.get<Room[]>(`${environment.apiUrl}/rooms/search`, { params });
  }

  getRoom(id: number): Observable<Room> {
    return this.http.get<Room>(`${environment.apiUrl}/rooms/${id}`);
  }
}

