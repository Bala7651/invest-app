import { Svg, Polyline } from 'react-native-svg';

interface SparklineChartProps {
  data: number[];
  width: number;
  height: number;
  color: string;
}

export function computeSparklinePoints(
  data: number[],
  width: number,
  height: number,
): string | null {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const len = data.length;

  const points = data.map((price, i) => {
    const x = (i / (len - 1)) * width;
    const y = height - ((price - min) / range) * height;
    return `${x},${y}`;
  });

  return points.join(' ');
}

export function SparklineChart({ data, width, height, color }: SparklineChartProps) {
  const points = computeSparklinePoints(data, width, height);
  if (points === null) return null;

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}
