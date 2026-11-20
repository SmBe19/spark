import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomAdminPresentation } from './room-admin-presentation';

describe('RoomAdminPresentation', () => {
  let component: RoomAdminPresentation;
  let fixture: ComponentFixture<RoomAdminPresentation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomAdminPresentation],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomAdminPresentation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
