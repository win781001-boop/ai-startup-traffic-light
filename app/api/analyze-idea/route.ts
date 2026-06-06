export interface IdeaInput {
  idea: string;
  problem: string;
  loss: string;
  payer: string;
  alternative: string;
  delivery: string;
}

export interface EvidenceLevels {
  demand: string;
  payment: string;
  alternative: string;
  delivery: string;
  maintenance: string;
}

export interface AnalysisResult {
  light: "red" | "yellow" | "green";
  quadrant: string;
  title: string;
  oneLineJudgement: string;
  evidenceLevels: EvidenceLevels;
  reasons: string[];
  biggestRisk: string;
}

function buildPrompt(input: IdeaInput): string {
  return `請判定以下點子：

你的點子是什麼：${input.idea}
它解決誰的什麼問題：${input.problem}
如果不解決，使用者會損失什麼：${input.loss}
誰會付錢？為什麼願意付：${input.payer}
使用者現在不用你的產品時，怎麼解決：${input.alternative}
第一版你打算怎麼交付？大概要幾天：${input.delivery}

請根據需求強度、付費意願、替代方案、交付速度與維護負擔，判斷是紅燈、黃燈或綠燈。`;
}

export async function POST(request: Request) {
  try {
    const body: IdeaInput = await request.json();
    const apiKey = process.env.OPENAI_API_KEY;
    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    if (!apiKey || apiKey === "YOUR_OPENAI_API_KEY_HERE") {
      return Response.json({
        light: "yellow",
        quadrant: "高需求 × 慢交付",
        title: "方向有機會，但版本太重",
        oneLineJudgement: "測試模式結果：這個點子可能有需求，但第一版交付時間偏長，暫時不適合重做。",
        evidenceLevels: {
          demand: "主觀假設",
          payment: "資訊不足",
          alternative: "主觀假設",
          delivery: "明確風險",
          maintenance: "主觀假設",
        },
        reasons: [
          "你描述了使用者問題，但目前仍缺少明確付費證據。",
          "第一版預估時間偏長，容易在驗證前投入過多成本。",
          "替代方案與使用者現況仍不夠清楚。",
        ],
        biggestRisk: "最大風險是還沒確認誰願意付錢前，就先投入過多製作時間。",
      });
    }

    // Validate all fields
    const fields = [body.idea, body.problem, body.loss, body.payer, body.alternative, body.delivery];
    if (fields.some((f) => !f?.trim())) {
      return Response.json(
        { error: "請填寫所有欄位。" },
        { status: 400 }
      );
    }
    if (fields.some((f) => f.length > 500)) {
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
              "你是「AI創業紅綠燈」的點子判定引擎。\n\n你的任務不是鼓勵創業者，也不是提供整改方案。你的任務是根據使用者提供的資訊，判斷這個點子目前是紅燈、黃燈或綠燈。\n\n判定依據：\n1. 需求強度\n2. 付費意願\n3. 替代方案\n4. 交付速度\n5. 維護負擔\n\n重要原則：\n- 不要被使用者的主觀樂觀描述誤導。\n- 但也不要盲目否定使用者。\n- 請使用證據分級：明確證據、主觀假設、資訊不足、明確風險。\n- 陳述事實，不做人格判斷。\n- 不要給整改方案。\n- 不要給 7 天計畫。\n- 不要推銷課程、顧問、會員或後續服務。\n- 請只回傳合法 JSON。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error("OpenAI API error:", res.status, errorBody);
      return Response.json(
        { error: "AI 判定服務暫時無法使用，請稍後再試。" },
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

    let result: AnalysisResult;
    try {
      result = JSON.parse(content);
    } catch {
      return Response.json(
        { error: "AI 回傳格式錯誤，請重新提交。" },
        { status: 502 }
      );
    }

    if (!result.light || !["red", "yellow", "green"].includes(result.light)) {
      return Response.json(
        { error: "AI 回傳結果不完整，請重新提交。" },
        { status: 502 }
      );
    }

    // Validate evidence levels exist
    if (!result.evidenceLevels || typeof result.evidenceLevels !== "object") {
      return Response.json(
        { error: "AI 回傳結果不完整，請重新提交。" },
        { status: 502 }
      );
    }

    // Strip banned fields that should never appear in v0.3
    const banned = ["mvpDownscope", "postponedFeatures", "sevenDayPlan", "nextSteps", "courseRecommendation", "consultingOffer"];
    for (const key of banned) {
      delete (result as unknown as Record<string, unknown>)[key];
    }

    return Response.json(result);
  } catch (err) {
    console.error("Unexpected error:", err);
    return Response.json(
      { error: "伺服器發生錯誤，請稍後再試。" },
      { status: 500 }
    );
  }
}



