namespace TradeBlotter.Api.Domain;

/// <summary>
/// Net holding in one symbol, using the weighted-average-cost method.
/// </summary>
/// <param name="Quantity">Signed: positive is long, negative is short, zero is flat.</param>
/// <param name="AverageCost">
/// Average entry price of the open quantity (average sale price for a short). Zero when flat.
/// </param>
public sealed record Position(string Symbol, long Quantity, decimal AverageCost)
{
    public static Position Flat(string symbol) => new(symbol, 0, 0m);

    public bool IsFlat => Quantity == 0;

    /// <summary>Returns the position after applying <paramref name="trade"/>.</summary>
    public Position Apply(Trade trade)
    {
        if (trade.Symbol != Symbol)
        {
            throw new ArgumentException(
                $"Cannot apply a {trade.Symbol} trade to a {Symbol} position.", nameof(trade));
        }

        var newQuantity = Quantity + trade.SignedQuantity;

        // Opening, or adding in the same direction: blend the new fill into the average.
        if (IsFlat || Math.Sign(trade.SignedQuantity) == Math.Sign(Quantity))
        {
            var totalCost = Math.Abs(Quantity) * AverageCost + trade.Quantity * trade.Price;
            return this with { Quantity = newQuantity, AverageCost = totalCost / Math.Abs(newQuantity) };
        }

        // Fully closed: nothing is open, so there is no cost basis.
        if (newQuantity == 0)
        {
            return Flat(Symbol);
        }

        // Flipped through zero: the residual was opened by this trade, at this trade's price.
        if (Math.Sign(newQuantity) != Math.Sign(Quantity))
        {
            return this with { Quantity = newQuantity, AverageCost = trade.Price };
        }

        // Partially reduced: the remaining quantity keeps its original average cost.
        return this with { Quantity = newQuantity };
    }
}
