using System;
using Azure;
using Azure.AI.OpenAI;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Threading.Tasks;

namespace TranscriptionMicroservice.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TranscriptionController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly AzureOpenAIClient _openAIClient;

         public TranscriptionController(IConfiguration configuration)
    {
        string endpoint = configuration["AzureOpenAI:Endpoint"];
        string key = configuration["AzureOpenAI:ApiKey"];
        _openAIClient = new AzureOpenAIClient(new Uri(endpoint), new AzureKeyCredential(key));
    }

        [HttpPost]
        public async Task<IActionResult> HandleTranscription([FromBody] TranscriptionRequest request)
        {
            if (request.Action == "createSoapNotes")
            {
                var result = await CreateSoapNotes(request.Transcription);
                return Ok(new { result });
            }
             if (request.Action == "analyzeVitals")
            {
                var result = await CreateSoapNotes(request.Transcription);
                return Ok(new { result });
            
            }
                      if (request.Action == "analyzeCharges")
            {
                var result = await CreateSoapNotes(request.Transcription);
                return Ok(new { result });
            }
                      if (request.Action == "analyzeDifferentials")
            {
                var result = await CreateSoapNotes(request.Transcription);
                return Ok(new { result });
            }
            
            // Implement other actions (analyzeVitals, analyzeCharges, analyzeDifferentials) similarly
            return BadRequest("Invalid action");
        }

        private async Task<string> CreateSoapNotes(string transcription)
        {
            var response = await _openAIClient.GetCompletionsAsync(
                deploymentOrModelName: _configuration["AZURE_OPENAI_DEPLOYMENT"],
                new CompletionsOptions
                {
                    Prompts = { $"Create detailed SOAP notes based on the following consultation transcript. Ensure to include all relevant information under each SOAP category.\n\nTranscript: {transcription}" },
                    MaxTokens = 500
                });

            return response.Value.Choices[0].Text;
        }
    }

    public class TranscriptionRequest
    {
        public string Transcription { get; set; }
        public string Action { get; set; }
    }
}
