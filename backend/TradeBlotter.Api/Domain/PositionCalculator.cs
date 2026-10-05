namespace TradeBlotter.Api.Domain;

/// <summary>
/// Derives positions from trade history. Positions are never stored; replaying the
/// trades is the single source of truth.
/// </summary>
public static class PositionCalculator
{
    /// <summary>
    /// Replays <paramref name="tradesInBookingOrder"/> per symbol and returns the open
    /// positions ordered by symbol. Flat positions are omitted.
    /// </summary>
    /// <remarks>
    /// Average cost is path-dependent, so the caller must supply trades in the order they
    /// were booked (oldest first).
    /// </remarks>
    public static IReadOnlyList<Position> Calculate(IEnumerable<Trade> tradesInBookingOrder) =>
        tradesInBookingOrder
            .GroupBy(trade => trade.Symbol)
            .Select(trades => trades.Aggregate(
                Position.Flat(trades.Key),
                (position, trade) => position.Apply(trade)))
            .Where(position => !position.IsFlat)
            .OrderBy(position => position.Symbol, StringComparer.Ordinal)
            .ToList();
}
