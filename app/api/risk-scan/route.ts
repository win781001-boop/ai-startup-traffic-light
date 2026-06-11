export interface RiskScanInput {
  idea: string;
  targetUser: string;
  problem: string;
}

export interface RiskScanResult {
  riskArea: string;
  oneLineRisk: string;
  cta: string;
}

const ALLOWED_RISK_AREAS = [
  "需求不明",
  "付費不明",
  "交付過重",
  "維護偏高",
  "資訊不足",
];

function buildPrompt(input: RiskScanInput): string {
  return `請掃描以下點子的風險：

你的點子是什麼：${input.idea}
目標使用者是誰：${input.targetUser}
它解決什麼問題：${input.problem}

請判斷這個點子目前的主要風險區域。

風險區域只能是以下其中一個：
- 需求不明
- 付費不明
- 交付過重
- 維護偏高
- 資訊不足

只能回傳格式正確的 JSON 物件，不要 markdown，不要 \`\`\`json，不要 \`\`\`，不要任何解釋文字。`;
}

export async function POST(request: Request) {
  try {
    const body: RiskScanInput = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY_HERE") {
      return Response.json({
        riskArea: "交付過重",
        oneLineRisk: "測試模式結果：你的點子可能不是需求問題，而是第一版製作時間偏長。",
        cta: "完成 6 題完整判定，取得正式紅黃綠燈結果。",
      });
    }

    if (!body.idea?.trim() || !body.targetUser?.trim() || !body.problem?.trim()) {
      return Response.json({ error: "請填寫所有欄位。" }, { status: 400 });
    }
    if (body.idea.length > 500 || body.targetUser.length > 500 || body.problem.length > 500) {
      return Response.json({ error: "每個欄位請勿超過 500 字。" }, { status: 400 });
    }

    const prompt = buildPrompt(body);

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: "system",
            content:
              "你是「AI創業紅綠燈」的風險掃描引擎。\n\n請根據使用者輸入的點子資訊，判斷這個點子目前的主要風險區域。\n\n風險區域只能是以下其中一個：\n- 需求不明\n- 付費不明\n- 交付過重\n- 維護偏高\n- 資訊不足\n\n重要限制：\n- 不准輸出「紅燈」、「黃燈」、「綠燈」字樣。\n- 只能回傳格式正確的 JSON 物件，不要 markdown，不要 ```json，不要 ```，不要任何解釋文字。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 512,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("OpenAI API error:", res.status, errorBody);
      return Response.json({ error: "風險掃描服務暫時無法使用，請稍後再試。" }, { status: 502 });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return Response.json({ error: "AI 回傳內容為空，請重新提交。" }, { status: 502 });
    }

    // Debug: log raw AI response (no API key exposed)
    console.log("[risk-scan] Raw AI response:", content);

    // Strip markdown code fences before parsing
    let cleanContent = content.trim();
    cleanContent = cleanContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    cleanContent = cleanContent.trim();

    let result: RiskScanResult;
    try {
      result = JSON.parse(cleanContent);
    } catch {
      return Response.json({ error: "AI 回傳格式錯誤，請重新提交。" }, { status: 502 });
    }

    // Lenient riskArea: fallback to "資訊不足" if invalid
    if (!result.riskArea || !ALLOWED_RISK_AREAS.includes(result.riskArea)) {
      result.riskArea = "資訊不足";
    }

    // Safety check: if traffic light words appear, use specific sanitized text
    const fullText = JSON.stringify(result);
    if (/紅燈|黃燈|綠燈/.test(fullText)) {
      result.oneLineRisk = "你提供的資訊仍不足以做正式判定，目前只能看出其中一個風險方向。";
      if (!ALLOWED_RISK_AREAS.includes(result.riskArea)) {
        result.riskArea = "資訊不足";
      }
    }

    return Response.json({
      riskArea: result.riskArea,
      oneLineRisk: result.oneLineRisk || "",
      cta: result.cta || "完成 6 題完整判定，取得正式紅黃綠燈結果。",
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return Response.json({ error: "伺服器發生錯誤，請稍後再試。" }, { status: 500 });
  }
}

