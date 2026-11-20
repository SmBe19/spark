import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomPresenterJoininfo } from './room-presenter-joininfo';

describe('RoomPresenterJoininfo', () => {
  let component: RoomPresenterJoininfo;
  let fixture: ComponentFixture<RoomPresenterJoininfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomPresenterJoininfo],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomPresenterJoininfo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
