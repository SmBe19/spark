import { TestBed } from '@angular/core/testing';
import { BarController, BarElement, CategoryScale, Legend, LinearScale, Tooltip } from 'chart.js';
import { NG_CHARTS_CONFIGURATION } from 'ng2-charts';
import { SparkChart } from './spark-chart';

it('provides only the bar chart registerables to its chart directive', () => {
  TestBed.overrideComponent(SparkChart, {
    set: { template: '', imports: [] },
  });
  const fixture = TestBed.createComponent(SparkChart);
  const config = fixture.debugElement.injector.get(NG_CHARTS_CONFIGURATION);
  expect(config.registerables).toEqual([
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
  ]);
});
