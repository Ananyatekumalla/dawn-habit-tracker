/**
 * Minimal React wrapper around Chart.js (replaces react-chartjs-2: one less dependency).
 * Re-creates the chart when `config` changes, so pass a memoised config.
 */
import { useEffect, useRef } from 'react';
import { Chart } from '../../lib/charts.js';

export function ChartCanvas({ config, label }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const chart = new Chart(canvasRef.current, config);
    return () => chart.destroy();
  }, [config]);
  return <canvas ref={canvasRef} role="img" aria-label={label} />;
}
