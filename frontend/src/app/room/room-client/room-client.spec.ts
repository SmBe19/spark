import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomClient } from './room-client';

describe('RoomClient', () => {
  let component: RoomClient;
  let fixture: ComponentFixture<RoomClient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomClient],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomClient);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
