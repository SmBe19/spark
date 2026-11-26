import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminWrapper } from './admin-wrapper';

describe('AdminWrapper', () => {
  let component: AdminWrapper;
  let fixture: ComponentFixture<AdminWrapper>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminWrapper],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminWrapper);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
