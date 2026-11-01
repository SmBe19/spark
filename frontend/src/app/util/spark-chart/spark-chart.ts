import { Component, computed, input, signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { PollQuestion } from '../../model/poll';
import { toObservable } from '@angular/core/rxjs-interop';

@Component({
  imports: [BaseChartDirective],
  selector: 'app-spark-chart',
  styleUrl: './spark-chart.css',
  templateUrl: './spark-chart.html',
})
export class SparkChart {
  question = input.required<PollQuestion>();
  replyDistribution = input.required<Record<number, number>>();

  barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  labels = signal<string[]>([]);
  datasets = signal<
    { data: number[]; label: string; backgroundColor: string[]; borderColor: string[] }[]
  >([]);

  barChartData = computed(() => {
    const replyDistribution = this.replyDistribution();
    if (!replyDistribution) {
      return { labels: [], datasets: [] };
    }
    const question = this.question();
    if (question.pollType === 'options') {
      const labels = question.options.map((option) => this.processLabel(option.option));
      const data = question.options.map((option) => replyDistribution[option.index] || 0);
      return this.getChartData(labels, data);
    } else if (question.pollType === 'rating') {
      const labels = Array.from({ length: question.maxRating }, (_, i) => (i + 1).toString());
      const data = labels.map((label) => replyDistribution[Number(label)] || 0);
      return this.getChartData(labels, data);
    } else if (question.pollType === 'estimate') {
      const minValue = question.minValue;
      const maxValue = question.maxValue;
      const histogramBucketCount = 12;
      const histogramBucketWidth = Math.ceil((maxValue - minValue + 1) / histogramBucketCount);
      const labels = Array.from({ length: histogramBucketCount }, (_, i) => {
        const bucketStart = minValue + i * histogramBucketWidth;
        const bucketEnd = Math.min(bucketStart + histogramBucketWidth - 1, maxValue);
        return `${bucketStart}-${bucketEnd}`;
      });
      const data = Array.from({ length: histogramBucketCount }, (_, i) => 0);
      for (const [valueStr, count] of Object.entries(replyDistribution)) {
        const value = Number(valueStr);
        if (value >= minValue && value <= maxValue) {
          const bucketIndex = Math.floor((value - minValue) / histogramBucketWidth);
          data[bucketIndex] += count;
        }
      }
      return this.getChartData(labels, data);
    }
    return { labels: [], datasets: [] };
  });

  constructor() {
    toObservable(this.barChartData).subscribe((barChartData) => {
      if (JSON.stringify(this.labels()) !== JSON.stringify(barChartData.labels)) {
        this.labels.set(barChartData.labels);
      }
      if (JSON.stringify(this.datasets()) !== JSON.stringify(barChartData.datasets)) {
        this.datasets.set(barChartData.datasets);
      }
    });
  }

  private getChartData(
    labels: string[],
    data: number[],
  ): {
    labels: string[];
    datasets: { data: number[]; label: string; backgroundColor: string[]; borderColor: string[] }[];
  } {
    return {
      labels,
      datasets: [
        {
          data,
          label: 'Replies',
          backgroundColor: labels.map((_, index) => this.getBarBackgroundColor(index)),
          borderColor: labels.map((_, index) => this.getBarBorderColor(index)),
        },
      ],
    };
  }

  private processLabel(label: string): string {
    const maxLength = 20;
    if (label.length > maxLength) {
      return label.substring(0, maxLength) + '...';
    }
    return label;
  }

  private getBarBackgroundColor(index: number): string {
    const colors = [
      'rgba(75, 192, 192, 1)',
      'rgba(255, 99, 132, 1)',
      'rgba(255, 206, 86, 1)',
      'rgba(54, 162, 235, 1)',
      'rgba(153, 102, 255, 1)',
      'rgba(255, 159, 64, 1)',
    ];
    return colors[index % colors.length];
  }

  private getBarBorderColor(index: number): string {
    const colors = [
      'rgba(75, 192, 192, 0.8)',
      'rgba(255, 99, 132, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
    ];
    return colors[index % colors.length];
  }
}
