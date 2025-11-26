import { ema, returnsFromCloses, percentileRank, cov, variance, calcAlphaLens } from '../lib/alphaLens';

describe('Alpha Lens Math Helpers', () => {
  describe('ema', () => {
    it('should calculate EMA correctly', () => {
      const values = [10, 11, 12, 13, 14];
      const period = 2;
      const result = ema(values, period);
      expect(result.length).toBe(5);
      expect(result[0]).toBe(10);
      // k = 2/3 = 0.666...
      // i=1: 11 * 0.666 + 10 * 0.333 = 7.33 + 3.33 = 10.66
      expect(result[1]).toBeCloseTo(10.666, 2);
    });

    it('should handle empty array', () => {
      expect(ema([], 10)).toEqual([0]);
    });
  });

  describe('returnsFromCloses', () => {
    it('should calculate returns', () => {
      const closes = [100, 110, 99];
      const result = returnsFromCloses(closes);
      expect(result.length).toBe(2);
      expect(result[0]).toBeCloseTo(0.1, 4); // (110-100)/100 = 0.1
      expect(result[1]).toBeCloseTo(-0.1, 4); // (99-110)/110 = -0.1
    });
  });

  describe('percentileRank', () => {
    it('should return correct rank', () => {
      const sample = [1, 2, 3, 4, 5];
      expect(percentileRank(sample, 3)).toBe(60); // 3 is greater than 1, 2. index 2. rank 3? 
      // logic: sorted [1,2,3,4,5]. findIndex(v > 3) is 3 (value 4). rank = 3. 3/5 * 100 = 60.
      
      expect(percentileRank(sample, 0)).toBe(0);
      expect(percentileRank(sample, 6)).toBe(100);
    });
  });

  describe('variance & covariance', () => {
    it('should calculate variance', () => {
      const data = [2, 4, 4, 4, 5, 5, 7, 9];
      // mean = 5
      // diffs sq: 9, 1, 1, 1, 0, 0, 4, 16 = 32
      // var = 32 / 8 = 4
      expect(variance(data)).toBe(4);
    });

    it('should calculate covariance', () => {
      const x = [1, 2, 3];
      const y = [1, 2, 3];
      // mean x=2, y=2
      // (1-2)(1-2) = 1
      // (2-2)(2-2) = 0
      // (3-2)(3-2) = 1
      // sum=2, n=3, cov=2/3
      expect(cov(x, y)).toBeCloseTo(0.666, 3);
    });
  });

  describe('calcAlphaLens', () => {
    it('should return null for insufficient data', () => {
      expect(calcAlphaLens([], [])).toBeNull();
      expect(calcAlphaLens(new Array(40).fill(10), new Array(40).fill(10))).toBeNull();
    });

    it('should return stats for sufficient data', () => {
      const closes = new Array(60).fill(0).map((_, i) => 100 + i); // steady uptrend
      const spy = new Array(60).fill(0).map((_, i) => 200 + i * 0.5); // slower uptrend
      
      const stats = calcAlphaLens(closes, spy);
      expect(stats).not.toBeNull();
      if (stats) {
        expect(stats.trendScore).toBeGreaterThan(0);
        expect(stats.breakout).toBe('New High');
      }
    });
  });
});
