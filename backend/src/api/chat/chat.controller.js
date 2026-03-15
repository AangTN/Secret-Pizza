const chatWithGemini = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    // Using gemini-2.5-flash as requested
    const model = 'gemini-2.5-flash'; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: message }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API Error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Error communicating with Gemini' });
    }

    // Extract the text from the response
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!reply) {
       return res.status(500).json({ error: 'No response text received from Gemini' });
    }

    res.json({ reply });

  } catch (error) {
    console.error('Chat Controller Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  chatWithGemini
};
