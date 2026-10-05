using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;

namespace TradeBlotter.Api.Tests;

/// <summary>Hosts the real API in memory against its own throwaway SQLite file.</summary>
public sealed class TradeBlotterApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath =
        Path.Combine(Path.GetTempPath(), $"tradeblotter-tests-{Guid.NewGuid():N}.db");

    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.UseSetting("ConnectionStrings:TradeBlotter", $"Data Source={_databasePath}");

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        // Pooled connections keep the file open; release them so it can be deleted.
        SqliteConnection.ClearAllPools();
        foreach (var file in Directory.GetFiles(Path.GetTempPath(), Path.GetFileName(_databasePath) + "*"))
        {
            File.Delete(file);
        }
    }
}
