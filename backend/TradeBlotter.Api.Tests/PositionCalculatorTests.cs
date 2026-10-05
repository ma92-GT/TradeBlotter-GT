using TradeBlotter.Api.Domain;

namespace TradeBlotter.Api.Tests;

public class PositionCalculatorTests
{
    private static readonly DateTimeOffset BookedAt = new(2026, 1, 5, 14, 30, 0, TimeSpan.Zero);

    private static Trade Buy(long quantity, decimal price, string symbol = "AAPL") =>
        new(symbol, Side.Buy, quantity, price, BookedAt);

    private static Trade Sell(long quantity, decimal price, string symbol = "AAPL") =>
        new(symbol, Side.Sell, quantity, price, BookedAt);

    private static Position SinglePosition(params Trade[] trades) =>
        Assert.Single(PositionCalculator.Calculate(trades));

    [Fact]
    public void NoTrades_ReturnsNoPositions()
    {
        Assert.Empty(PositionCalculator.Calculate([]));
    }

    [Fact]
    public void BuyingIntoLong_RecalculatesWeightedAverageCost()
    {
        var position = SinglePosition(
            Buy(100, 50m),
            Buy(200, 53m),  // (100×50 + 200×53) / 300 = 52
            Buy(100, 48m)); // (300×52 + 100×48) / 400 = 51

        Assert.Equal(new Position("AAPL", 400, 51m), position);
    }

    [Fact]
    public void SellingPartOfLong_KeepsAverageCost()
    {
        var position = SinglePosition(
            Buy(100, 20m),
            Buy(100, 30m),  // 200 @ 25
            Sell(50, 40m),
            Sell(100, 10m)); // sale prices never move the average

        Assert.Equal(new Position("AAPL", 50, 25m), position);
    }

    [Fact]
    public void SellingEntireLong_RemovesPosition()
    {
        var positions = PositionCalculator.Calculate([Buy(100, 10m), Sell(100, 12m)]);

        Assert.Empty(positions);
    }

    [Fact]
    public void SellingMoreThanLong_FlipsToShortAtTradePrice()
    {
        var position = SinglePosition(
            Buy(100, 20m),
            Buy(50, 26m),    // 150 @ 22
            Sell(200, 25m)); // closes 150, opens 50 short at 25

        Assert.Equal(new Position("AAPL", -50, 25m), position);
    }

    [Fact]
    public void SellingIntoShort_RecalculatesWeightedAverageCost()
    {
        var position = SinglePosition(
            Sell(100, 40m),
            Sell(300, 44m),  // (100×40 + 300×44) / 400 = 43
            Sell(100, 38m)); // (400×43 + 100×38) / 500 = 42

        Assert.Equal(new Position("AAPL", -500, 42m), position);
    }

    [Fact]
    public void BuyingBackPartOfShort_KeepsAverageCost()
    {
        var position = SinglePosition(
            Sell(200, 30m),
            Buy(50, 25m),   // covered at a profit
            Buy(100, 35m)); // covered at a loss; average still unchanged

        Assert.Equal(new Position("AAPL", -50, 30m), position);
    }

    [Fact]
    public void CoveringEntireShort_RemovesPosition()
    {
        var positions = PositionCalculator.Calculate([Sell(50, 10m), Buy(50, 9m)]);

        Assert.Empty(positions);
    }

    [Fact]
    public void BuyingMoreThanShort_FlipsToLongAtTradePrice()
    {
        var position = SinglePosition(
            Sell(100, 60m),
            Sell(100, 64m), // -200 @ 62
            Buy(300, 58m)); // covers 200, opens 100 long at 58

        Assert.Equal(new Position("AAPL", 100, 58m), position);
    }

    [Fact]
    public void AddingAfterPartialSell_WeightsRemainingQuantityNotOriginalCost()
    {
        var position = SinglePosition(
            Buy(100, 20m),
            Buy(100, 30m),  // 200 @ 25
            Sell(150, 40m), // 50 @ 25
            Buy(50, 31m));  // (50×25 + 50×31) / 100 = 28, not an average of all buys (26.20)

        Assert.Equal(new Position("AAPL", 100, 28m), position);
    }

    [Fact]
    public void AddingToShortAfterFlip_UsesFlipPriceAsCostBasis()
    {
        var position = SinglePosition(
            Buy(100, 20m),
            Sell(150, 25m), // -50 @ 25
            Sell(50, 27m)); // (50×25 + 50×27) / 100 = 26

        Assert.Equal(new Position("AAPL", -100, 26m), position);
    }

    [Fact]
    public void ReopeningAfterFlat_StartsFreshCostBasis()
    {
        var position = SinglePosition(
            Buy(100, 10m),
            Sell(100, 12m),
            Buy(10, 15m));

        Assert.Equal(new Position("AAPL", 10, 15m), position);
    }

    [Fact]
    public void FullLifecycle_CoversEveryTransitionInOneHistory()
    {
        var position = SinglePosition(
            Buy(100, 10m),
            Buy(50, 13m),   // add to long:        150 @ 11
            Sell(60, 15m),  // partial sell:        90 @ 11
            Sell(90, 9m),   // close long:           0
            Buy(100, 20m),  // reopen long:        100 @ 20
            Sell(150, 22m), // flip to short:      -50 @ 22
            Sell(50, 18m),  // add to short:      -100 @ 20
            Buy(40, 17m),   // partial cover:      -60 @ 20
            Buy(60, 21m),   // cover short:          0
            Sell(30, 50m),  // open short:         -30 @ 50
            Buy(50, 45m));  // flip to long:        20 @ 45

        Assert.Equal(new Position("AAPL", 20, 45m), position);
    }

    [Fact]
    public void NonTerminatingAverage_KeepsDecimalPrecision()
    {
        var position = SinglePosition(Buy(1, 10m), Buy(2, 11m)); // 32 / 3

        Assert.Equal(3, position.Quantity);
        Assert.Equal(10.666667m, Math.Round(position.AverageCost, 6));
        Assert.Equal(32m, Math.Round(position.Quantity * position.AverageCost, 20));
    }

    [Fact]
    public void MultipleSymbols_AreCalculatedIndependentlyAndOrderedBySymbol()
    {
        var positions = PositionCalculator.Calculate(
        [
            Buy(100, 10m, "msft"),
            Sell(50, 300m, "TSLA"),
            Buy(100, 20m, "AAPL"),
            Buy(50, 290m, "TSLA"),  // TSLA is flat and omitted
            Buy(100, 20m, "MSFT"),  // symbols are case-insensitive
        ]);

        Assert.Equal(
            [new Position("AAPL", 100, 20m), new Position("MSFT", 200, 15m)],
            positions);
    }

    [Fact]
    public void ApplyingTradeForAnotherSymbol_Throws()
    {
        var position = Position.Flat("AAPL");

        Assert.Throws<ArgumentException>(() => position.Apply(Buy(10, 1m, "MSFT")));
    }
}
