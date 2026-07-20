// Typewriter.jsx
import React, { useState, useEffect } from "react";

const Typewriter = ({ text = "", speed = 10, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    // GUARD: If text is undefined or null, do nothing
    if (!text) {
      setDisplayedText("");
      return;
    }

    setDisplayedText("");

    let index = 0;

    const intervalId = setInterval(() => {
      index++;

      setDisplayedText(text.slice(0, index));

      if (index >= text.length) {
        clearInterval(intervalId);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, onComplete]);

  return <p className="whitespace-pre-wrap">{displayedText}</p>;
};

export default Typewriter;
