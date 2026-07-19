import re
import logging

def sanitize_chunks(chunks):
    """
    Filters out chunks containing hidden prompt injection signatures.
    Assumes 'chunks' is a list of LangChain Document objects or strings.
    """
    safe_chunks = []
    
    # Common attack phrases used to break out of system prompts
    override_patterns = [
        r"ignore (all )?previous instructions",
        r"you are (now )?an? ",
        r"system override",
        r"system prompt",
        r"new instructions:",
        r"forget everything",
        r"disregard previous",
        r"do not follow (the )?instructions"
    ]
    
    # LLM control tokens (attackers use these to fake the end of a system prompt)
    format_patterns = [
        r"<\|im_start\|>",
        r"<\|im_end\|>",
        r"\[INST\]",
        r"\[/INST\]",
        r"Assistant:" # Trying to force a fake response
    ]

    logging.info("Scanning the chunks of uploaded document. ")

    for chunk in chunks:
        # Handle both LangChain Document objects and plain strings
        text = chunk.page_content if hasattr(chunk, 'page_content') else str(chunk)
        text_lower = text.lower()
        
        is_safe = True
        
        # Check against semantic overrides
        for pattern in override_patterns:
            if re.search(pattern, text_lower):
                logging.warning(f"Injection pattern found: '{pattern}' in chunk.")
                is_safe = False
                break
                
        # Check against control tokens (case sensitive)
        if is_safe:
            for pattern in format_patterns:
                if re.search(pattern, text):
                    logging.warning(f"Control token found: '{pattern}' in chunk.")
                    is_safe = False
                    break
                    
        if is_safe:
            safe_chunks.append(chunk)

    return safe_chunks