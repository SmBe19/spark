import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomPresenter } from './room-presenter';

describe('RoomPresenter', () => {
  let component: RoomPresenter;
  let fixture: ComponentFixture<RoomPresenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomPresenter],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomPresenter);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
