export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageData, appealText } = req.body;

  if (!imageData) {
    return res.status(400).json({ error: 'imageData required' });
  }

  const system = `당신은 수박 줄무늬 전문 감정사입니다. 사용자가 직접 수박 위에 그린 줄무늬를 보고 평가합니다.
반드시 JSON만 반환하세요. 다른 텍스트 없이:
{"price": 10000~100000사이 10000단위 정수, "stars": 1~5 정수, "comment": "재치있는 한국어 감정 멘트 1~2문장"}

평가 기준:
- 줄무늬가 선명하고 균등하면 고가
- 창의적이거나 독특하면 가점
- 아무것도 없거나 점 하나면 저가
- 항소문이 있으면: 설득력 있으면 가격 올리고, 억지스러우면 낮추거나 유지
멘트 스타일: "줄무늬에서 장인의 숨결이 느껴집니다", "먹기엔 아까운 수박입니다", "수박인지 럭셔리 브랜드인지 구분이 어렵습니다", "당도보다 브랜딩이 앞서는 작품", "이 수박은 미술관에 걸려야 합니다" — 매번 새롭고 재치있게.`;

  const userText = appealText
    ? `이 수박 줄무늬를 감정해주세요.\n\n항소문: "${appealText}"`
    : '이 수박 줄무늬를 감정해주세요.';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':'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',
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
