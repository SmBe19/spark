import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RoomEditForm } from './room-edit-form';

describe('RoomEditForm', () => {
  let component: RoomEditForm;
  let fixture: ComponentFixture<RoomEditForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoomEditForm],
    }).compileComponents();

    fixture = TestBed.createComponent(RoomEditForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
