using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Metadata;
using Microsoft.EntityFrameworkCore;
using TradeBlotter.Api.Data;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("TradeBlotter")
    ?? throw new InvalidOperationException("Connection string 'TradeBlotter' is not configured.");

builder.Services.AddDbContext<TradeBlotterDbContext>(options => options.UseSqlite(connectionString));

builder.Services
    .AddControllers(options =>
    {
        // Report validation errors under the JSON names the client sent ("quantity", not "Quantity").
        options.ModelMetadataDetailsProviders.Add(new SystemTextJsonValidationMetadataProvider());

        // A missing or unreadable body is already reported; don't add a vague "request field is required".
        options.SuppressImplicitRequiredAttributeForNonNullableReferenceTypes = true;
    })
    .AddJsonOptions(options =>
    {
        // Sides travel as "Buy"/"Sell"; numeric values like 0 or 1 are rejected.
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));

        // Don't echo System.Text.Json internals (type names, line numbers) back to API clients.
        options.AllowInputFormatterExceptionMessages = false;
    });

builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// A single-table schema doesn't justify migrations; create the database on first run.
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<TradeBlotterDbContext>().Database.EnsureCreated();
}

// Unhandled exceptions and bare status codes (e.g. unknown routes) become RFC 7807 problem details.
app.UseExceptionHandler();
app.UseStatusCodePages();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.MapControllers();

app.Run();
