import { HttpClient } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import { WhoamiResponse } from '../model/auth';
import { ApiResponse } from '../model/api';

@Service()
export class AuthService {
  username = signal<string | null>(null);
  loggedId = computed(() => this.username() !== null);
  loginError = signal<string | null>(null);

  private httpClient = inject(HttpClient);

  constructor() {
    this.checkAuth();
  }

  checkAuth() {
    this.httpClient.get<ApiResponse<WhoamiResponse>>('/api/auth/whoami', {}).subscribe({
      next: (data) => {
        this.loginError.set(null);
        if (data.success && data.data.username) {
          this.username.set(data.data.username);
        } else {
          this.username.set(null);
        }
      },
      error: (error) => {
        this.username.set(null);
        this.loginError.set(null);
      },
    });
  }

  login(username: string, password: string) {
    this.httpClient
      .post<ApiResponse<WhoamiResponse>>('/api/auth/login', { username, password })
      .subscribe({
        next: (data) => {
          this.loginError.set(null);
          if (data.success && data.data.username) {
            this.username.set(data.data.username);
          } else {
            this.username.set(null);
          }
        },
        error: (error) => {
          this.username.set(null);
          this.loginError.set(error.error.error ?? null);
        },
      });
  }

  logout() {
    this.httpClient.post('/api/auth/logout', {}).subscribe({
      next: (data) => {
        this.checkAuth();
      },
      error: (error) => {
        this.checkAuth();
      },
    });
  }
}
