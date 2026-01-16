import React, { useState, useEffect } from "react";

const Typewriter = ({ text, speed = 20, onComplete }) => {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let index = 0;
    setDisplayedText(""); 

    const intervalId = setInterval(() => {
     
      setDisplayedText((prev) => prev + text.charAt(index));
      index++;
      if (index === text.length) {
        clearInterval(intervalId);
        if (onComplete) onComplete(); 
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed]);

  return <p className="whitespace-pre-wrap">{displayedText}</p>;
};

export default Typewriter;
