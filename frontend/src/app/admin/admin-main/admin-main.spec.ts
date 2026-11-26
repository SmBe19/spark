import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminMain } from './admin-main';

describe('AdminMain', () => {
  let component: AdminMain;
  let fixture: ComponentFixture<AdminMain>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminMain],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminMain);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
