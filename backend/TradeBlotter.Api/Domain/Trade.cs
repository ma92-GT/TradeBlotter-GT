namespace TradeBlotter.Api.Domain;

/// <summary>
/// A booked execution. Trades are immutable and append-only; a mistake is corrected
/// by booking an offsetting trade, never by editing history.
/// </summary>
public class Trade
{
    public Trade(string symbol, Side side, long quantity, decimal price, DateTimeOffset timestamp)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(symbol);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(price);
        if (!Enum.IsDefined(side))
        {
            throw new ArgumentOutOfRangeException(nameof(side), side, "Unknown trade side.");
        }

        Symbol = symbol.Trim().ToUpperInvariant();
        Side = side;
        Quantity = quantity;
        Price = price;
        Timestamp = timestamp.ToUniversalTime();
    }

    /// <summary>Database identity; also the booking sequence used to replay trades.</summary>
    public long Id { get; private set; }

    public string Symbol { get; private set; }

    public Side Side { get; private set; }

    /// <summary>Always positive; direction comes from <see cref="Side"/>.</summary>
    public long Quantity { get; private set; }

    public decimal Price { get; private set; }

    /// <summary>Booking time in UTC.</summary>
    public DateTimeOffset Timestamp { get; private set; }

    /// <summary>Positive for buys, negative for sells.</summary>
    public long SignedQuantity => Side == Side.Buy ? Quantity : -Quantity;
}
