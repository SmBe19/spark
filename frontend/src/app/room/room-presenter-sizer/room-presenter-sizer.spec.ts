import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomPresenterSizer } from './room-presenter-sizer';

describe('RoomPresenterSizer', () => {
  let component: RoomPresenterSizer;
  let fixture: ComponentFixture<RoomPresenterSizer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomPresenterSizer],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomPresenterSizer);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
