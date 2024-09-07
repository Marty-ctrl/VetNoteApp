const { app } = require('@azure/functions');
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

// Initialize OpenAI client
const openAIClient = new OpenAIClient(
  process.env.AZURE_OPENAI_ENDPOINT,
  new AzureKeyCredential(process.env.AZURE_OPENAI_KEY)
);

app.http('ConsultVetAIRequests', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        const { operation, transcription } = await request.json();

        let prompt, result;
        switch (operation) {
            case 'clientSummary':
                prompt = process.env.CLIENT_SUMMARY_PROMPT;
                break;
            case 'soapNotes':
                prompt = process.env.SOAP_NOTES_PROMPT;
                break;
            case 'analyzeVitals':
                prompt = process.env.ANALYZE_VITALS_PROMPT;
                break;
            default:
                return { status: 400, body: `Unsupported operation: ${operation}` };
        }

        try {
            result = await generateAIResponse(prompt, transcription);
            return { body: result };
        } catch (error) {
            context.log(`Error: ${error.message}`);
            return { status: 500, body: "An error occurred while processing the request." };
        }
    }
});

async function generateAIResponse(prompt, transcription) {
    const response = await openAIClient.getChatCompletions(
        process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
        [
            { role: "system", content: "You are a veterinary assistant skilled in analyzing consultations." },
            { role: "user", content: `${prompt}\n\nTranscript: ${transcription}` }
        ]
    );
    return response.choices[0].message.content;
}