using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeBlotter.Api.Contracts;
using TradeBlotter.Api.Data;
using TradeBlotter.Api.Domain;

namespace TradeBlotter.Api.Controllers;

[ApiController]
[Route("trades")]
public class TradesController(TradeBlotterDbContext db) : ControllerBase
{
    /// <summary>Books a trade. The server assigns the id and timestamp.</summary>
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TradeResponse>> CreateTrade(
        CreateTradeRequest request, CancellationToken cancellationToken)
    {
        // [ApiController] has already rejected the request with a 400 if any field is missing or invalid.
        var trade = new Trade(
            request.Symbol!,
            request.Side!.Value,
            request.Quantity!.Value,
            request.Price!.Value,
            DateTimeOffset.UtcNow);

        db.Trades.Add(trade);
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetTrade), new { id = trade.Id }, TradeResponse.From(trade));
    }

    /// <summary>Lists all trades, newest first.</summary>
    [HttpGet]
    public async Task<IReadOnlyList<TradeResponse>> GetTrades(CancellationToken cancellationToken)
    {
        var trades = await db.Trades
            .AsNoTracking()
            .OrderByDescending(trade => trade.Id)
            .ToListAsync(cancellationToken);

        return trades.Select(TradeResponse.From).ToList();
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<TradeResponse>> GetTrade(long id, CancellationToken cancellationToken)
    {
        var trade = await db.Trades.FindAsync([id], cancellationToken);

        return trade is null ? NotFound() : TradeResponse.From(trade);
    }
}
