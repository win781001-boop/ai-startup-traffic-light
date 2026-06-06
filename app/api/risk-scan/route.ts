export interface RiskScanInput {
  idea: string;
  problem: string;
  firstVersion: string;
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
它解決誰的什麼問題：${input.problem}
第一版你打算怎麼做？大概要多久：${input.firstVersion}

請判斷這個點子目前的主要風險區域。

風險區域只能是以下其中一個：
- 需求不明
- 付費不明
- 交付過重
- 維護偏高
- 資訊不足

請只回傳合法 JSON，不要加 markdown。`;
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

    if (!body.idea?.trim() || !body.problem?.trim() || !body.firstVersion?.trim()) {
      return Response.json(
        { error: "請填寫所有欄位。" },
        { status: 400 }
      );
    }

    if (body.idea.length > 500 || body.problem.length > 500 || body.firstVersion.length > 500) {
      return Response.json(
        { error: "每個欄位請勿超過 500 字。" },
        { status: 400 }
      );
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
              "你是「AI創業紅綠燈」的風險掃描引擎。\n\n請根據使用者輸入的點子資訊，判斷這個點子目前的主要風險區域。\n\n風險區域只能是以下其中一個：\n- 需求不明\n- 付費不明\n- 交付過重\n- 維護偏高\n- 資訊不足\n\n重要限制：\n- 不准輸出「紅燈」、「黃燈」、「綠燈」字樣。\n- 不要給整改方案。\n- 不要給 7 天計畫。\n- 不要推銷課程、顧問、會員或後續服務。\n- 請只回傳合法 JSON。",
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
      return Response.json(
        { error: "風險掃描服務暫時無法使用，請稍後再試。" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return Response.json(
        { error: "AI 回傳內容為空，請重新提交。" },
        { status: 502 }
      );
    }

    let result: RiskScanResult;
    try {
      result = JSON.parse(content);
    } catch {
      return Response.json(
        { error: "AI 回傳格式錯誤，請重新提交。" },
        { status: 502 }
      );
    }

    // Validate riskArea
    if (!result.riskArea || !ALLOWED_RISK_AREAS.includes(result.riskArea)) {
      return Response.json(
        { error: "AI 回傳結果不完整，請重新提交。" },
        { status: 502 }
      );
    }

    // Safety check: sanitize traffic light words from 3-question risk scan
    const fullText = JSON.stringify(result);
    if (/紅燈|黃燈|綠燈/.test(fullText)) {
      if (result.oneLineRisk) result.oneLineRisk = result.oneLineRisk.replace(/紅燈|黃燈|綠燈/g, "注意");
      if (result.riskArea) result.riskArea = result.riskArea.replace(/紅燈|黃燈|綠燈/g, "資訊不足");
    }

    return Response.json({
      riskArea: result.riskArea,
      oneLineRisk: result.oneLineRisk || "",
      cta: result.cta || "完成 6 題完整判定，取得正式紅黃綠燈結果。",
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return Response.json(
      { error: "伺服器發生錯誤，請稍後再試。" },
      { status: 500 }
    );
  }
}


