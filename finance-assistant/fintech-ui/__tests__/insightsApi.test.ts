import { fetchMarketData } from "../lib/insightsApi";
import * as finnhub from "../lib/finnhub";

// Mock the finnhub module
jest.mock("../lib/finnhub", () => ({
  FINNHUB_KEY: "mock-key",
  getQuote: jest.fn(),
  getCandlesByCount: jest.fn(),
}));

describe("insightsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch market data for symbols", async () => {
    (finnhub.getQuote as jest.Mock).mockResolvedValue({ c: 150, dp: 1.5 });
    (finnhub.getCandlesByCount as jest.Mock).mockResolvedValue({
      c: [140, 145, 150],
      t: [1600000000, 1600086400, 1600172800],
    });

    const data = await fetchMarketData(["AAPL"]);
    
    expect(data.AAPL).toBeDefined();
    expect(data.AAPL?.price).toBe(150);
    expect(data.AAPL?.changePct).toBe(1.5);
    expect(data.AAPL?.series).toHaveLength(3);
  });

  it("should handle errors gracefully", async () => {
    (finnhub.getQuote as jest.Mock).mockRejectedValue(new Error("API Error"));
    (finnhub.getCandlesByCount as jest.Mock).mockRejectedValue(new Error("API Error"));

    const data = await fetchMarketData(["AAPL"]);
    
    expect(data.AAPL).toBeDefined();
    expect(data.AAPL?.price).toBe(0); // Fallback
    expect(data.AAPL?.series).toHaveLength(30); // Mock series
  });
});
