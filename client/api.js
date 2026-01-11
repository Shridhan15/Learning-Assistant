const BASE_URL = "http://127.0.0.1:8000";

export async function uploadPDF(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData
  });

  return res.json();
}

export async function askQuestion(question) {
  const res = await fetch(
    `${BASE_URL}/query?question=${encodeURIComponent(question)}`,
    { method: "POST" }
  );

  return res.json();
}
