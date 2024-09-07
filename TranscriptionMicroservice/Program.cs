var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.Configure<OpenAISettings>(builder.Configuration.GetSection("AZURE_OPENAI"));
builder.Services.AddSingleton<AzureOpenAIClient>(sp =>
{
    var settings = sp.GetRequiredService<IOptions<OpenAISettings>>().Value;
    var endpoint = new Uri(settings.Endpoint);
    var apiKey = new AzureKeyCredential(settings.Key);
    return new AzureOpenAIClient(endpoint, apiKey);
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
