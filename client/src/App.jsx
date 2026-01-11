import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import QuizAssistant from "./components/QuizAssistant";

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/quiz" element={<QuizAssistant />} />
      </Routes>
    </div>
  );
};

export default App;
