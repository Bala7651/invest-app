import { computeSparklinePoints } from '../features/watchlist/components/SparklineChart';

describe('SparklineChart computeSparklinePoints', () => {
  it('returns null when data has 0 points', () => {
    expect(computeSparklinePoints([], 60, 28)).toBeNull();
  });

  it('returns null when data has 1 point', () => {
    expect(computeSparklinePoints([100], 60, 28)).toBeNull();
  });

  it('returns a string when data has 2+ points', () => {
    const result = computeSparklinePoints([100, 110], 60, 28);
    expect(typeof result).toBe('string');
  });

  it('generates correct SVG points string for known input', () => {
    // data=[100, 110, 105], width=60, height=28
    // min=100, max=110, range=10
    // i=0: x=0,          y=28 - ((100-100)/10)*28 = 28 - 0 = 28
    // i=1: x=60,         y=28 - ((110-100)/10)*28 = 28 - 28 = 0
    // i=2: x=30,         y=28 - ((105-100)/10)*28 = 28 - 14 = 14
    // x for i=2: (2/(3-1))*60 = 60
    // Wait: i=0 -> x=0*60/2=0, i=1 -> x=1*60/2=30, i=2 -> x=2*60/2=60
    // Actually x = (i / (len-1)) * width
    // i=0: x=(0/2)*60=0,   y=28
    // i=1: x=(1/2)*60=30,  y=28 - ((110-100)/10)*28 = 28 - 28 = 0
    // i=2: x=(2/2)*60=60,  y=28 - ((105-100)/10)*28 = 28 - 14 = 14
    const result = computeSparklinePoints([100, 110, 105], 60, 28);
    expect(result).toBe('0,28 30,0 60,14');
  });

  it('handles flat data (all same price) without division by zero', () => {
    // range = 0, so range = 1 (div-by-zero guard)
    // all y = height - ((price-min)/1)*height = height - 0 = height (bottom)
    const result = computeSparklinePoints([100, 100, 100], 60, 28);
    expect(result).toBe('0,28 30,28 60,28');
  });

  it('generates correct x coordinates for 2 points', () => {
    // i=0: x=0, i=1: x=60
    const result = computeSparklinePoints([50, 100], 60, 28);
    // min=50, max=100, range=50
    // i=0: x=0,  y=28 - ((50-50)/50)*28 = 28
    // i=1: x=60, y=28 - ((100-50)/50)*28 = 28 - 28 = 0
    expect(result).toBe('0,28 60,0');
  });
});
