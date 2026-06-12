export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageData, appealText } = req.body;
  if (!imageData) {
    return res.status(400).json({ error: 'imageData required' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || '';
  
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured. key=' + apiKey });
  }

  const system = `당신은 수박 줄무늬 전문 감정사입니다. 반드시 JSON만 반환하세요:
{"price": 10000~100000사이 10000단위 정수, "stars": 1~5 정수, "comment": "재치있는 한국어 감정 멘트 1~2문장"}
항소문 있으면 설득력 있으면 가격 올리고 억지면 낮추거나 유지.`;

  const userText = appealText
    ? `이 수박 줄무늬를 감정해주세요.\n\n항소문: "${appealText}"`
    : '이 수박 줄무늬를 감정해주세요.';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData } },
            { type: 'text', text: userText }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || 'Claude API error' });
    }

    const data = await response.json();
    const raw = data.content.map(i => i.text || '').join('');
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return res.status(500).json({ error: 'JSON 파싱 실패' });

    const result = JSON.parse(match[0]);
    const price = Math.max(10000, Math.min(100000, Math.round(result.price / 10000) * 10000));
    res.status(200).json({ price, stars: result.stars, comment: result.comment });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
