# preload_models.py
import os
import shutil
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings

# Define a persistent cache folder inside your project
# Render keeps files in the project directory, but wipes /tmp
MODEL_CACHE_DIR = os.path.join(os.getcwd(), "model_cache")

print(f"⬇️ Starting Robust Model Download to: {MODEL_CACHE_DIR}")

# Delete existing incomplete downloads if any (clean slate)
if os.path.exists(MODEL_CACHE_DIR):
    print("   Cleaning up old cache to ensure integrity...")
    shutil.rmtree(MODEL_CACHE_DIR)

try:
    # This triggers the download
    embeddings = FastEmbedEmbeddings(
        model_name="BAAI/bge-small-en-v1.5",
        cache_path=MODEL_CACHE_DIR
    )
    print(" Model downloaded successfully!")
except Exception as e:
    print(f"❌ Download Failed: {e}")
    exit(1) # Fail the build so you know immediately