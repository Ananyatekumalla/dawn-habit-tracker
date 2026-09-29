/** Registers only the Chart.js pieces we use (smaller bundle than `chart.js/auto`). */
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

Chart.register(
  ArcElement, BarController, BarElement, CategoryScale, DoughnutController, Filler,
  Legend, LineController, LineElement, LinearScale, PointElement, Tooltip,
);
Chart.defaults.font.family = 'Manrope, system-ui, sans-serif';

export { Chart };

/** Reads a CSS custom property so charts follow the light/dark theme. */
export const cssVar = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function baseOptions() {
  const line = cssVar('--line');
  Chart.defaults.color = cssVar('--muted');
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, border: { color: line } },
      y: { grid: { color: line }, border: { display: false } },
    },
  };
}

export const bottomLegend = {
  display: true,
  position: 'bottom',
  labels: { boxWidth: 10, usePointStyle: true },
};
