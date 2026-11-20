import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NewRoomForm } from './new-room-form';

describe('NewRoomForm', () => {
  let component: NewRoomForm;
  let fixture: ComponentFixture<NewRoomForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewRoomForm],
    }).compileComponents();

    fixture = TestBed.createComponent(NewRoomForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
