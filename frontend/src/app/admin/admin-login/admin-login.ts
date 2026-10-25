import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../service/auth-service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-admin-login',
  styleUrl: './admin-login.css',
  templateUrl: './admin-login.html',
})
export class AdminLogin {
  private username = signal('');
  private password = signal('');

  private authService = inject(AuthService);

  login() {
    this.authService.login(this.username(), this.password());
  }
}
