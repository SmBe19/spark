import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SparkChart } from './spark-chart';

describe('SparkChart', () => {
  let component: SparkChart;
  let fixture: ComponentFixture<SparkChart>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SparkChart],
    }).compileComponents();

    fixture = TestBed.createComponent(SparkChart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
