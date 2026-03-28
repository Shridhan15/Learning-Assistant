# StudyMate: AI-Powered Adaptive Learning System
 

StudyMate is a next-generation educational platform designed to transform static study materials into a dynamic, **mistake-centric** ecosystem. By combining Retrieval-Augmented Generation (RAG) with persistent performance tracking, StudyMate identifies conceptual gaps and reinforces them through interactive tutoring, adaptive testing, and personalized audio reinforcement.

---

##  Key Features

###  AI Studio (Personalized Mini Podcasts)
The signature reinforcement tool of StudyMate. The system aggregates your recent quiz mistakes and conceptual misunderstandings into a conversational revision script. Using **Azure Text-to-Speech**, it generates a **Mini Podcast** so you can review your specific weak points on the go.

###  AI Learning Paths
Bridge the gap between raw intent and actionable mastery. The **Learning Path Module** takes broad goals (e.g., "Master React and Node.js") and generates a structured, week-by-week roadmap, curating high-quality external resources and core topics tailored to your experience level.

###  AI Tutor & Coach
* **AI Tutor (RAG):** Chat contextually with your documents using **Llama 3** and **Pinecone**. Supports **Socratic Mode** (guiding you with questions) and **Feynman Mode** (giving feedback on your own explanations).
* **Voice Assistant Coach:** Engage in voice-to-voice interaction about your study habits and performance trends using **Azure Speech Services (STT/TTS)**.

###  Performance Dashboard & Analytics
* **Consistency Heatmap:** GitHub-style streak tracking to keep you motivated.
* **Score Trajectory:** Visual charts powered by **Recharts** to monitor improvement over time.
* **Usage Stats:** Real-time monitoring of PDF uploads, AI queries, and credit limits.
* **Study Calendar:** Manage deadlines, exams, and revision blocks in a centralized React-based scheduler.

---

##  Project Structure
```text
StudyMate/
├── ai-services/         # FastAPI Backend
│   ├── app/             # Application logic
│   ├── example.env      # Template for Backend API keys
│   └── requirements.txt # Python dependencies
├── client/              # React (Vite) Frontend
│   ├── src/             # Frontend logic & Components
│   ├── example.env      # Template for Frontend keys (Clerk, etc.)
│   └── package.json     # Node dependencies
└── README.md
```




## Environment Configuration

###  Backend Setup (`ai-services/.env`)

Create a `.env` file inside the `ai-services` folder and add the following:

```env
# ==============================
# AI & LLM Providers
# ==============================
GROQ_API_KEY=your_groq_key
HUGGINGFACEHUB_API_TOKEN=your_hf_token

# ==============================
# Vector & Relational Databases
# ==============================
PINECONE_API_KEY=your_pinecone_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
 
# Azure OpenAI Services
 
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_API_KEY=your_azure_openai_key
AZURE_OPENAI_DEPLOYMENT=your_deployment_name
OPENAI_API_VERSION=2024-02-15-preview

 
# Azure Speech Services (Coach & Podcasts)
 
AZURE_SPEECH_KEY=your_speech_key
AZURE_SPEECH_REGION=your_speech_region

 Frontend Setup (client/.env)

Create a .env file inside the client folder:

VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_API_URL=http://localhost:8000
Tech Stack
Frontend
React (Vite)
Tailwind CSS
Clerk (Authentication)
Recharts
Lucide React
 Backend
FastAPI (Python)
Pydantic
 AI / LLM
Llama 3 (via Groq)
Azure OpenAI
Hugging Face
 Vector Database
Pinecone (Semantic Search / Context Retrieval)
 Database
Supabase (PostgreSQL)
 Voice / Audio
Microsoft Azure Speech Services (STT / TTS)
 Getting Started
1️ Clone the Repository
git clone https://github.com/Shridhan15/Learning-Assistant.git

2️ Backend Setup
cd ai-services

# Create virtual environment
python -m venv venv

# Activate environment
# Mac/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload
3️ Frontend Setup
cd client

# Install dependencies
npm install

# Start development server
npm run dev
