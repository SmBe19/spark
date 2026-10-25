import { Component, inject } from '@angular/core';
import { AdminLogin } from '../admin-login/admin-login';
import { AuthService } from '../../service/auth-service';
import { AdminMain } from '../admin-main/admin-main';

@Component({
  imports: [AdminLogin, AdminMain],
  selector: 'app-admin-wrapper',
  styleUrl: './admin-wrapper.css',
  templateUrl: './admin-wrapper.html',
})
export class AdminWrapper {
  authService = inject(AuthService);
}
