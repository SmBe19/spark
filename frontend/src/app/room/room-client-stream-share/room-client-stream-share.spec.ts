import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomClientStreamShare } from './room-client-stream-share';

describe('RoomClientStreamShare', () => {
  let component: RoomClientStreamShare;
  let fixture: ComponentFixture<RoomClientStreamShare>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomClientStreamShare],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomClientStreamShare);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
