import React from "react";
import { BookOpen, Calendar, Trophy } from "lucide-react";
import BookCard from "./BookCard";

const ResultsGrid = ({ groupedResults }) => {
  return (
    <div className="flex flex-col space-y-6 pb-20">
     
      {Object.entries(groupedResults).map(([filename, quizzes]) => (
        <BookCard key={filename} filename={filename} quizzes={quizzes} />
      ))}
    </div>
  );
};

export default ResultsGrid;
