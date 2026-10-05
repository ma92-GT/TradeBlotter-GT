using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using TradeBlotter.Api.Contracts;
using TradeBlotter.Api.Domain;

namespace TradeBlotter.Api.Tests;

/// <summary>
/// End-to-end tests over HTTP. xUnit creates a new instance per test, so every test gets
/// its own API host and empty database.
/// </summary>
public sealed class ApiTests : IDisposable
{
    // The wire format: camelCase properties and sides as "Buy"/"Sell" strings only.
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(allowIntegerValues: false) },
    };

    private readonly TradeBlotterApiFactory _factory = new();
    private readonly HttpClient _client;

    public ApiTests() => _client = _factory.CreateClient();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task PostTrade_WithValidTrade_Returns201WithLocationOfCreatedTrade()
    {
        var response = await PostTrade(new { symbol = "aapl", side = "Buy", quantity = 100, price = 187.25m });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<TradeResponse>(Json);
        Assert.NotNull(created);
        Assert.Equal(("AAPL", Side.Buy, 100L, 187.25m), (created.Symbol, created.Side, created.Quantity, created.Price));
        Assert.Equal(TimeSpan.Zero, created.Timestamp.Offset);

        Assert.Equal($"/trades/{created.Id}", response.Headers.Location?.AbsolutePath);
        var fetched = await _client.GetFromJsonAsync<TradeResponse>(response.Headers.Location, Json);
        Assert.Equal(created, fetched);
    }

    [Fact]
    public async Task PostTrade_WithInvalidTrade_Returns400WithErrorsForEachInvalidField()
    {
        // Bad symbol and quantity; side and price missing entirely.
        var response = await PostTrade(new { symbol = "1BAD SYMBOL", quantity = 0 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<ValidationProblemDetails>(Json);
        Assert.NotNull(problem);
        Assert.Equal(["price", "quantity", "side", "symbol"], problem.Errors.Keys.Order());

        var trades = await _client.GetFromJsonAsync<List<TradeResponse>>("/trades", Json);
        Assert.Empty(trades!);
    }

    [Fact]
    public async Task GetTrades_ReturnsNewestFirst()
    {
        await BookTrade("AAPL", "Buy", 10, 100m);
        await BookTrade("MSFT", "Sell", 20, 200m);
        await BookTrade("TSLA", "Buy", 30, 300m);

        var trades = await _client.GetFromJsonAsync<List<TradeResponse>>("/trades", Json);

        Assert.Equal(["TSLA", "MSFT", "AAPL"], trades!.Select(trade => trade.Symbol));
    }

    [Fact]
    public async Task GetPositions_DerivesAverageCostFromMixedTradesAndOmitsFlatPositions()
    {
        // MSFT: long 150 @ 22, then sells through zero and adds to the new short.
        await BookTrade("MSFT", "Buy", 100, 20m);
        await BookTrade("MSFT", "Buy", 50, 26m);
        await BookTrade("MSFT", "Sell", 200, 25m);
        await BookTrade("MSFT", "Sell", 50, 27m);

        // TSLA: short 200 @ 62, then buys through zero.
        await BookTrade("TSLA", "Sell", 100, 60m);
        await BookTrade("TSLA", "Sell", 100, 64m);
        await BookTrade("TSLA", "Buy", 300, 58m);

        // AAPL: opened and closed, so flat.
        await BookTrade("AAPL", "Buy", 40, 150m);
        await BookTrade("AAPL", "Sell", 40, 155m);

        var positions = await _client.GetFromJsonAsync<List<PositionResponse>>("/positions", Json);

        Assert.Equal(
            [new PositionResponse("MSFT", -100, 26m), new PositionResponse("TSLA", 100, 58m)],
            positions);
    }

    private Task<HttpResponseMessage> PostTrade(object body) =>
        _client.PostAsJsonAsync("/trades", body, Json);

    private async Task BookTrade(string symbol, string side, long quantity, decimal price)
    {
        var response = await PostTrade(new { symbol, side, quantity, price });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
}
