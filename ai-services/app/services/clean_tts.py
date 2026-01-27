import re
import xml.sax.saxutils as saxutils

def clean_text_for_xml(text: str) -> str:
    """
    1. Removes Markdown (**bold**, ## headers).
    2. Escapes XML special characters (&, <, >) for Azure SSML.
    """
    if not text:
        return ""

    # 1. Remove Markdown Bold/Italic (***text***, **text**, *text*)
    text = re.sub(r'\*+(.*?)\*+', r'\1', text)
    
    # 2. Remove Markdown Headers (## Greeting)
    text = re.sub(r'#+\s*', '', text)
    
    # 3. Escape XML characters (Critical for Azure "EntityName" error)
    # Replaces & -> &amp;, < -> &lt;, > -> &gt;, " -> &quot;
    safe_text = saxutils.escape(text)
    
    return safe_text