import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SparkMarkdown } from './spark-markdown';

describe('SparkMarkdown', () => {
  let component: SparkMarkdown;
  let fixture: ComponentFixture<SparkMarkdown>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SparkMarkdown],
    }).compileComponents();

    fixture = TestBed.createComponent(SparkMarkdown);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
