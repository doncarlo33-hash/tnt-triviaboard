export async function verifyTriviaAnswer(apiKey, questionPrompt, officialAnswer, teamGuess) {
  if (!apiKey) {
    throw new Error('API Key is missing. Please configure it in the Settings panel.');
  }

  const systemPrompt = `You are an impartial trivia judge. The question is: "${questionPrompt}". The official answer is: "${officialAnswer}". A team has guessed: "${teamGuess}". Is the team's guess correct, partially correct, or incorrect? Start your response with exactly one of those three phrases. Be lenient on spelling errors and typos unless the question is explicitly testing spelling. Then, provide a very brief 1-2 sentence explanation for your ruling.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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

export async function verifyTriviaAnswersBatch(apiKey, questionPrompt, officialAnswer, answersToGrade) {
  if (!apiKey) {
    throw new Error('API Key is missing. Please configure it in the Settings panel.');
  }

  // Build the JSON payload to inject into the prompt
  const inputPayload = JSON.stringify(answersToGrade.map(a => ({ id: a.id, guess: a.answer })));

  const systemPrompt = `You are an impartial trivia judge.
The question is: "${questionPrompt}".
The official answer is: "${officialAnswer}".

I will provide a JSON array of team guesses. Evaluate each guess. Be lenient on spelling errors and typos unless the question is explicitly testing spelling.
For each guess, determine if it is "correct", "partially correct", or "incorrect".

You MUST return a pure JSON array of objects with the exact following keys:
- "id": the id of the team
- "isCorrect": boolean (true if correct or partially correct, false if incorrect)
- "reason": a brief 1-sentence explanation for your ruling

Do not include markdown formatting like \`\`\`json. Return ONLY the raw JSON array.

Here are the guesses:
${inputPayload}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

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
          maxOutputTokens: 2000 // allow enough tokens for the JSON array
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('Invalid response format from Gemini API.');
    }

    // Clean up potential markdown blocks if the model ignores the instruction
    text = text.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();

    const parsedArray = JSON.parse(text);
    if (!Array.isArray(parsedArray)) {
      throw new Error("API did not return a valid JSON array.");
    }

    return parsedArray;
  } catch (err) {
    throw new Error(`Batch verification failed: ${err.message}`);
  }
}

