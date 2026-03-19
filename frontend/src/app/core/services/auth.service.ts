import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: 'customer' | 'admin' | 'hotel-admin';
  hotelId?: number | null;
}

interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'auth_token';

  constructor(private http: HttpClient) {}

  login(phone: string, password: string): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, { phone, password })
      .pipe(
        tap((res) => this.setToken(res.token)),
        map((res) => res.user)
      );
  }

  register(payload: {
    name: string;
    email?: string;
    password: string;
    phone?: string;
  }): Observable<User> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(
        tap((res) => this.setToken(res.token)),
        map((res) => res.user)
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  public isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) {
      return null;
    }
    try {
      const payload = JSON.parse(atob(payloadBase64));
      return {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role,
        hotelId: payload.hotelId ?? null
      };
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return !!user && (user.role === 'admin' || user.role === 'hotel-admin');
  }
}

