using TradeBlotter.Api.Domain;

namespace TradeBlotter.Api.Contracts;

public sealed record TradeResponse(
    long Id,
    string Symbol,
    Side Side,
    long Quantity,
    decimal Price,
    DateTimeOffset Timestamp)
{
    public static TradeResponse From(Trade trade) =>
        new(trade.Id, trade.Symbol, trade.Side, trade.Quantity, trade.Price, trade.Timestamp);
}
