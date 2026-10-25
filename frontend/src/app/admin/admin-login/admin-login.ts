import { Component, inject } from '@angular/core';
import { AuthService } from '../../service/auth-service';
import { FormsModule } from '@angular/forms';

@Component({
  imports: [FormsModule],
  selector: 'app-admin-login',
  styleUrl: './admin-login.css',
  templateUrl: './admin-login.html',
})
export class AdminLogin {
  private username: string = '';
  private password: string = '';

  private authService = inject(AuthService);

  login() {
    this.authService.login(this.username, this.password);
  }
}
