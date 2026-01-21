import os
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

# Initialize Azure Client
client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version=os.getenv("OPENAI_API_VERSION"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
)

deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT")

def analyze_chat_image(base64_image: str) -> str:
    """
    Takes a raw base64 string (from frontend) and gets a description from Azure OpenAI.
    """
    try:
        # Clean the Base64 String
        # The frontend might sends "data:image/jpeg;base64,..." - we need to remove that header.
        if "," in base64_image:
            base64_image = base64_image.split(",")[1]

        #  Call Azure OpenAI
        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Describe this educational image in detail. If it contains text, transcribe it. If it is a diagram, describe the components and their relationships."},
                        {
                            "type": "image_url",
                            "image_url": { 
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=300 
        )

        return response.choices[0].message.content

    except Exception as e:
        print(f" Vision Error: {e}")
        return "Error analyzing image. Please try again."