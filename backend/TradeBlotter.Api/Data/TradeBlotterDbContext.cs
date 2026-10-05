using Microsoft.EntityFrameworkCore;
using TradeBlotter.Api.Domain;

namespace TradeBlotter.Api.Data;

public class TradeBlotterDbContext(DbContextOptions<TradeBlotterDbContext> options) : DbContext(options)
{
    public DbSet<Trade> Trades => Set<Trade>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Trade>(trade =>
        {
            trade.Property(t => t.Symbol).HasMaxLength(10);

            // Store "Buy"/"Sell" rather than 0/1 so the table is readable on its own.
            trade.Property(t => t.Side).HasConversion<string>().HasMaxLength(4);
        });
    }
}
