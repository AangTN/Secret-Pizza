// const fetch = require('node-fetch'); // Using global fetch (Node 18+)

async function analyzeReview(rating, comment) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY is not configured');
      return null;
    }

    // User requested gemini-2.5-flash. 
    // Note: If this model does not exist, the API will return 404.
    // Common valid models: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp
    const model = 'gemini-2.5-flash'; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log(`[AI Review] Sending request to ${model}...`);

    const prompt = `
      Analyze the following food delivery review.
      Rating: ${rating}/5
      Comment: "${comment || ''}"

      Return a JSON object with the following fields:
      - Sentiment: 'Positive', 'Negative', or 'Neutral'
      - Severity: 'High', 'Medium', 'Low' (if negative), else null
      - FoodIssue: Short summary of food issues (or null)
      - DriverIssue: Short summary of driver issues (or null)
      - StoreIssue: Short summary of store issues (or null)
      - OtherIssue: Short summary of other issues (or null)
      - MentionLate: boolean (true if late delivery is mentioned)
      
      Only return the JSON object, no markdown formatting.
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[AI Review] Gemini API Error:', JSON.stringify(data, null, 2));
      // Fallback to 1.5-flash if 2.5 fails (optional, but helpful if user is mistaken)
      if (response.status === 404 || (data.error && data.error.message.includes('not found'))) {
         console.log('[AI Review] Retrying with gemini-1.5-flash...');
         return analyzeReviewFallback(rating, comment, apiKey, 'gemini-1.5-flash');
      }
      return null;
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
        console.error('[AI Review] No text in response:', JSON.stringify(data));
        return null;
    }

    console.log('[AI Review] Raw response:', text);

    // Clean up markdown code blocks if present
    let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    // Sometimes it might start with just "json" or have other artifacts
    if (jsonStr.startsWith('json')) jsonStr = jsonStr.substring(4).trim();
    
    try {
        return JSON.parse(jsonStr);
    } catch (parseError) {
        console.error('[AI Review] JSON Parse Error:', parseError, 'String:', jsonStr);
        return null;
    }

  } catch (error) {
    console.error('[AI Review] Service Error:', error);
    return null;
  }
}

async function analyzeReviewFallback(rating, comment, apiKey, model) {
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const prompt = `
          Analyze the following food delivery review.
          Rating: ${rating}/5
          Comment: "${comment || ''}"
    
          Return a JSON object with the following fields:
          - Sentiment: 'Positive', 'Negative', or 'Neutral'
          - Severity: 'High', 'Medium', 'Low' (if negative), else null
          - FoodIssue: Short summary of food issues (or null)
          - DriverIssue: Short summary of driver issues (or null)
          - StoreIssue: Short summary of store issues (or null)
          - OtherIssue: Short summary of other issues (or null)
          - MentionLate: boolean (true if late delivery is mentioned)
          
          Only return the JSON object, no markdown formatting.
        `;
    
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
    
        const data = await response.json();
        if (!response.ok) {
            console.error(`[AI Review] Fallback ${model} Error:`, data);
            return null;
        }
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) return null;
        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        if (jsonStr.startsWith('json')) jsonStr = jsonStr.substring(4).trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('[AI Review] Fallback Error:', e);
        return null;
    }
}

async function summarizeWeeklyIssues(issuesData) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;

    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
      Based on the following aggregated issue data from customer reviews over the last week, provide a concise summary of the store's performance and 3 key actionable suggestions for improvement.
      
      Data:
      - Total Reviews: ${issuesData.totalReviews}
      - Sentiment Breakdown: ${JSON.stringify(issuesData.sentiment)}
      - Issue Counts:
        - Food Issues: ${issuesData.issues.Food}
        - Driver Issues: ${issuesData.issues.Driver}
        - Store Issues: ${issuesData.issues.Store}
        - Other Issues: ${issuesData.issues.Other}
        - Late Deliveries: ${issuesData.issues.Late}

      - Specific Issue Details (Sample):
        - Food: ${JSON.stringify(issuesData.issueDetails?.Food?.slice(0, 30) || [])} 
        - Driver: ${JSON.stringify(issuesData.issueDetails?.Driver?.slice(0, 30) || [])}
        - Store: ${JSON.stringify(issuesData.issueDetails?.Store?.slice(0, 30) || [])}
        - Other: ${JSON.stringify(issuesData.issueDetails?.Other?.slice(0, 30) || [])}

      Please provide the response in Vietnamese.
      Format the response as HTML (using <h4>, <ul>, <li>, <p> tags) suitable for embedding in a dashboard. Do not include \`\`\`html markers.
    `;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await response.json();
    if (!response.ok) {
        // Fallback logic could be added here too
        return null;
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
        text = text.replace(/```html/g, '').replace(/```/g, '').trim();
    }
    return text;

  } catch (error) {
    console.error('[AI Summary] Error:', error);
    return null;
  }
}

module.exports = {
  analyzeReview,
  summarizeWeeklyIssues
};
