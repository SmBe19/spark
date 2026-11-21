import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomStream } from './room-stream';

describe('RoomStream', () => {
  let component: RoomStream;
  let fixture: ComponentFixture<RoomStream>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomStream],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomStream);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
