// src/services/azureSpeechApi.js

const SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const SPEECH_REGION = import.meta.env.VITE_AZURE_REGION;

// Azure requires an Access Token first
const getAccessToken = async () => {
    const response = await fetch(
        `https://${SPEECH_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
        {
            method: "POST",
            headers: {
                "Ocp-Apim-Subscription-Key": SPEECH_KEY,
            },
        }
    );

    if (!response.ok) throw new Error("Failed to get Azure Token");
    return response.text(); // The token is a simple string
};

export const playAzureAudio = async (text) => {
    if (!SPEECH_KEY || !SPEECH_REGION) throw new Error("Missing Azure Env Variables");

    // 1. Get the Auth Token
    const token = await getAccessToken();

    // 2. Request the Audio
    // Azure uses SSML (XML format) to specify voice details
    const ssml = `
    <speak version='1.0' xml:lang='en-US'>
      <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural'>
        ${text}
      </voice>
    </speak>
  `;

    const response = await fetch(
        `https://${SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/ssml+xml",
                "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
                "User-Agent": "ReactVoiceBot"
            },
            body: ssml,
        }
    );

    if (!response.ok) throw new Error("Azure TTS Request Failed");

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    await audio.play();
    return audio;
};