using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TradeBlotter.Api.Contracts;
using TradeBlotter.Api.Data;
using TradeBlotter.Api.Domain;

namespace TradeBlotter.Api.Controllers;

[ApiController]
[Route("positions")]
public class PositionsController(TradeBlotterDbContext db) : ControllerBase
{
    /// <summary>
    /// Open positions derived from the full trade history, ordered by symbol.
    /// Flat positions are omitted.
    /// </summary>
    [HttpGet]
    public async Task<IReadOnlyList<PositionResponse>> GetPositions(CancellationToken cancellationToken)
    {
        var tradesInBookingOrder = await db.Trades
            .AsNoTracking()
            .OrderBy(trade => trade.Id)
            .ToListAsync(cancellationToken);

        return PositionCalculator.Calculate(tradesInBookingOrder)
            .Select(PositionResponse.From)
            .ToList();
    }
}
