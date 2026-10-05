using TradeBlotter.Api.Domain;

namespace TradeBlotter.Api.Contracts;

/// <param name="Quantity">Signed: positive is long, negative is short.</param>
/// <param name="AverageCost">Average entry price of the open quantity, rounded to 6 decimal places.</param>
public sealed record PositionResponse(string Symbol, long Quantity, decimal AverageCost)
{
    public static PositionResponse From(Position position) =>
        new(position.Symbol, position.Quantity, Math.Round(position.AverageCost, 6, MidpointRounding.AwayFromZero));
}
