import re
import xml.sax.saxutils as saxutils

def clean_text_for_xml(text: str) -> str:
    """
    1. Removes Markdown (**bold**, ## headers).
    2. Escapes XML special characters (&, <, >) for Azure SSML.
    """
    if not text:
        return ""

    text = re.sub(r'\*+(.*?)\*+', r'\1', text)
    
    text = re.sub(r'#+\s*', '', text)
    
    safe_text = saxutils.escape(text)
    
    return safe_text