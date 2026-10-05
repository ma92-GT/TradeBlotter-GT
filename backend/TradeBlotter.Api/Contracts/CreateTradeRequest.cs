using System.ComponentModel.DataAnnotations;
using TradeBlotter.Api.Domain;

namespace TradeBlotter.Api.Contracts;

/// <summary>
/// Body of <c>POST /trades</c>. Properties are nullable so a missing field is reported as
/// "required" instead of silently binding to zero. The server assigns the timestamp.
/// </summary>
public sealed class CreateTradeRequest
{
    [Required(ErrorMessage = "Symbol is required.")]
    [RegularExpression(
        "^[A-Za-z][A-Za-z0-9.-]{0,9}$",
        ErrorMessage = "Symbol must be 1-10 letters, digits, '.' or '-', starting with a letter.")]
    public string? Symbol { get; init; }

    [Required(ErrorMessage = "Side is required: Buy or Sell.")]
    public Side? Side { get; init; }

    [Required(ErrorMessage = "Quantity is required.")]
    [Range(
        typeof(long), "1", "1000000000",
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true,
        ErrorMessage = "Quantity must be a whole number between 1 and 1,000,000,000.")]
    public long? Quantity { get; init; }

    [Required(ErrorMessage = "Price is required.")]
    [Range(
        typeof(decimal), "0", "1000000",
        MinimumIsExclusive = true,
        ParseLimitsInInvariantCulture = true,
        ConvertValueInInvariantCulture = true,
        ErrorMessage = "Price must be greater than 0 and at most 1,000,000.")]
    public decimal? Price { get; init; }
}
