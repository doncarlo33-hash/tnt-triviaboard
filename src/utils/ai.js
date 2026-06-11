export async function verifyTriviaAnswer(apiKey, questionPrompt, officialAnswer, teamGuess) {
  if (!apiKey) {
    throw new Error('API Key is missing. Please configure it in the Settings panel.');
  }

  const systemPrompt = `You are an impartial trivia judge. The question is: "${questionPrompt}". The official answer is: "${officialAnswer}". A team has guessed: "${teamGuess}". Is the team's guess correct, partially correct, or incorrect? Start your response with exactly one of those three phrases. Be lenient on spelling errors and typos unless the question is explicitly testing spelling. Then, provide a very brief 1-2 sentence explanation for your ruling.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: systemPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.1, // low temperature for consistent judging
          maxOutputTokens: 100
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Invalid response format from Gemini API.');
    }

    return text.trim();
  } catch (err) {
    throw new Error(`Verification failed: ${err.message}`);
  }
}
