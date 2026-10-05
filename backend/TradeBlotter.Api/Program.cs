using Microsoft.EntityFrameworkCore;
using TradeBlotter.Api.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("TradeBlotter")
    ?? throw new InvalidOperationException("Connection string 'TradeBlotter' is not configured.");

builder.Services.AddDbContext<TradeBlotterDbContext>(options => options.UseSqlite(connectionString));
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// A single-table schema doesn't justify migrations; create the database on first run.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<TradeBlotterDbContext>().Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();
