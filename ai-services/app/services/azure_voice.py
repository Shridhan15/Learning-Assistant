import os
import azure.cognitiveservices.speech as speechsdk
from dotenv import load_dotenv

load_dotenv()

speech_key = os.environ.get("AZURE_SPEECH_KEY")
speech_region = os.environ.get("AZURE_SPEECH_REGION")

def synthesize_audio(text_script: str) -> bytes:
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)
    
    # We use a specific voice that supports "Styles" (emotions)
    voice_name = "en-US-AvaMultilingualNeural" 
    speech_config.speech_synthesis_voice_name = voice_name
    speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3)
    
    synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)

    # MAGIC PART: Wrap text in SSML to control Speed and Emotion
    # rate="0.9" makes it 10% slower (more conversational, less rushed)
    # style="cheerful" makes it sound happy and engaged
    ssml_script = f"""
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
        <voice name="{voice_name}">
            <mstts:express-as style="cheerful">
                <prosody rate="0.9">
                    {text_script}
                </prosody>
            </mstts:express-as>
        </voice>
    </speak>
    """

    # Note: Use speak_ssml_async instead of speak_text_async
    result = synthesizer.speak_ssml_async(ssml_script).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return result.audio_data
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print(f"Speech Synthesis canceled: {cancellation_details.reason}")
        if cancellation_details.reason == speechsdk.CancellationReason.Error:
            print(f"Error details: {cancellation_details.error_details}")
        raise Exception("Azure Speech Synthesis Failed")
 