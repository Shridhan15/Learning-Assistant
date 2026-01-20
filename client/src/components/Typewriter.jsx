// Typewriter.jsx
import React, { useState, useEffect } from "react";

const Typewriter = ({ text, speed = 10, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    // 1. Reset text when the prop changes
    setDisplayedText(""); 
    
    let index = 0;

    const intervalId = setInterval(() => {
      // 2. Increment index first
      index++; 
      
      // 3. Always slice from the original text. 
      // This is "self-correcting" - even if a frame drops, 
      // the next frame renders the correct substring.
      setDisplayedText(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(intervalId);
        if (onComplete) onComplete(); 
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, onComplete]); // added onComplete to dependencies for safety

  return <p className="whitespace-pre-wrap">{displayedText}</p>;
};

export default Typewriter;