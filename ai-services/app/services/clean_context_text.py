def clean_context_text(text: str) -> str:
    # List of keywords that usually mark the end of the story/chapter
    stop_markers = [
        "Exercises", "Think as you read", "Understanding the text", 
        "Vocabulary", "Glossary", "Acknowledgements", "About the Author"
    ]
    
    # Find the earliest occurrence of any marker and cut the text there
    lowest_index = len(text)
    found = False
    
    for marker in stop_markers:
        # Case-insensitive search
        idx = text.lower().find(marker.lower())
        if idx != -1 and idx < lowest_index:
            lowest_index = idx
            found = True
            
    # If found, cut the text. If not, return original.
    if found: 
        return text[:lowest_index].strip()
    
    return text