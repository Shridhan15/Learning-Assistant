import requests
import os

SERPER_API_KEY = os.getenv("SERPER_API_KEY")


def search_youtube(query):

    url = "https://google.serper.dev/youtube"

    payload = {"q": query}

    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }

    res = requests.post(url, json=payload, headers=headers).json()

    videos = []

    for item in res.get("videos", [])[:2]:
        videos.append({
            "type": "youtube",
            "title": item["title"],
            "url": item["link"]
        })

    return videos


def search_docs(query):

    url = "https://google.serper.dev/search"

    payload = {"q": query}

    headers = {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json"
    }

    res = requests.post(url, json=payload, headers=headers).json()

    docs = []

    for item in res.get("organic", [])[:2]:
        docs.append({
            "type": "docs",
            "title": item["title"],
            "url": item["link"]
        })

    return docs