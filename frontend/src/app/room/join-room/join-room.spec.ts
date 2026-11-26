import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JoinRoom } from './join-room';

describe('JoinRoom', () => {
  let component: JoinRoom;
  let fixture: ComponentFixture<JoinRoom>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JoinRoom],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinRoom);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
