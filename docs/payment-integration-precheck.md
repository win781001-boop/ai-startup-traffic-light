# AI創業紅綠燈 真金流前置檢查

> 版本：v0.18
> 建立日期：2026-06-10
> 用途：接真實金流前的最後檢查，確認 mock 流程、價格規則、金流方案選擇、不該動的部分

---

## 1. 目前 mock payment 流程

目前系統使用 mock 金流，不涉及真實付款，流程如下：

### 1a. create-payment

- 前端點擊「下一步：付費 49 元開始判定」後呼叫 `POST /api/create-payment`
- 後端在資料庫建立一筆 `Payment`（status=`pending`、used=`false`）
- 同時建立一筆 `Analysis`（status=`pending`）和一筆空的 `Submission`
- 回傳 `{ payment: { id, createdAt }, analysisId }` 給前端
- **沒有**真實金流訂單、**沒有**導向第三方付款頁面

### 1b. confirm-payment

- 使用者點擊「確認付款 49 元」後呼叫 `POST /api/confirm-payment`
- 後端將 Payment 狀態從 `pending` 更新為 `paid`
- Analysis 仍保持 `pending`，等到 submit-analysis 才會變成 `submitted`
- **沒有**金流 webhook、**沒有**簽章驗證、**沒有**付款成功通知

### 1c. submit-analysis

- 使用者填完完整 6 題後送出
- 後端檢查 Payment 狀態是否為 `paid`
- 通過後依序執行：duplicate 檢查 → attempt 檢查 → atomic claim → 內容驗證 → 呼叫 `/api/analyze-idea` → 處理結果

### 1d. 狀態對照

| 結果 | Payment.used | Analysis.status | 是否消耗付款 |
|------|-------------|-----------------|-------------|
| 成功（completed） | `true` | `completed` | 是 |
| 內容不足（needs_revision） | `false` | `needs_revision` | 否 |
| 系統錯誤（system_error） | `false` | `failed_system_error` | 否（且 rollback attempt） |
| 次數用盡（attempts_exhausted） | `false` | `attempts_exhausted` | 否 |

### 1e. paymentId / analysisId 生成規則

- `paymentId` = `pay-{timestamp-base36}-{random-4-char}`
- `analysisId` = `ana-{timestamp-base36}-{random-4-char}`
- 兩者都在 `lib/record-store.ts` 的 `createPayment()` 中一起產生
- 未來金流訂單編號應與 `paymentId` 對應，而不是取代它

---

## 2. 未來真金流要替換的位置

### 2a. 需要改的模組

| 模組 | 目前做法 | 真金流後做法 |
|------|---------|-------------|
| `app/api/create-payment/route.ts` | 直接建立 Payment（status=pending） | 向金流服務建立訂單，取得付款網址，導向使用者 |
| `app/api/confirm-payment/route.ts` | 直接將 payment 設為 paid | 改為被金流 callback / webhook 觸發，或由前端確認後輪詢 |
| `app/api/payment-webhook/route.ts` | **不存在** | 新增，接收金流付款成功通知 |
| `components/startup-light/PaymentPanel.tsx` | 顯示 mock 按鈕 | 整合金流付款按鈕 / 付款後狀態輪詢 |
| 環境變數 | 不需要 | 需加入金流 API key、secret、webhook secret |

### 2b. 不需要改的部分

以下規則與程式碼**不受金流方案影響**，應保持不變：

- `paymentId` / `analysisId` 的生成與儲存結構
- `Payment.used` 的保護邏輯（一筆付款只能產生一份 completed 報告）
- `submit-analysis` 的 duplicate check、attempt limit、atomic claim
- `needs_revision` 不消耗付款資格
- `system_error` rollback attempt count 且不消耗付款資格
- `lib/idea-validation.ts` 的輸入驗證規則
- 問題回報流程（依 paymentId 查詢，一筆付款一次回報）
- Prisma schema 的現有 model（Payment / Submission / Analysis / Feedback / ErrorReport）

### 2c. 不應被金流改壞的 API

- `POST /api/submit-analysis` — 不應碰 payment 建立邏輯，只檢查 payment 狀態
- `POST /api/analyze-idea` — 純 AI 判定，不接觸金流
- `POST /api/error-report` — 獨立於金流流程
- `POST /api/feedback` — 獨立於金流流程

---

## 3. 真金流接入前必須保留的規則

### 3a. 成功付款後才能進入完整 6 題判定

`submit-analysis` 的第一道檢查就是 Payment 狀態。只有 `status=paid` 的付款才能繼續。這個檢查在 `validatePayment()` helper 中，不應繞過。

### 3b. 只有 completed 結果才 used=true

- `completed` → `Payment.used = true`，此付款不能再使用
- `needs_revision` → `Payment.used = false`，可修改後重新提交
- `system_error` → `Payment.used = false`，保留付款資格
- `attempts_exhausted` → `Payment.used = false`，但已無法再提交

### 3c. duplicate submit 要擋

- `checkDuplicateOrExhausted()` helper 檢查 `analysis.used` 和 `analysis.status === "completed"`
- `tryClaimAnalysis()` 用 `updateMany` + 條件更新防止 race condition
- 這兩個機制不能因為換金流而被移除或繞過

### 3d. low-info / invalid 不應產生正式結果

- `isIllegalIdea()`、`isIdeaRelevant()`、`hasLowInformation()` 在 `lib/idea-validation.ts` 中
- 內容驗證發生在呼叫 analyze-idea 之前，不因為已付款就跳過

### 3e. 使用者資料與提交紀錄要保留

- Submission 和 Analysis 紀錄在 submit-analysis 時寫入資料庫
- 即使付款成功但判定失敗，紀錄仍應保留供客服查詢
- 問題回報依 paymentId + analysisId 查詢

### 3f. 問題回報限制

- 一個 `paymentId` 只能建立一筆 ErrorReport（DB unique constraint）
- 問題回報不依賴金流服務，獨立運作

---

## 4. 價格規則

### 4a. 目前價格

- 首次完整報告：**49 元**
- 後續第二次或未來標準價：可規劃 **149 元**

### 4b. 價格存放位置

目前價格文案分散在以下位置，接金流前應統一管理：

| 位置 | 內容 |
|------|------|
| `app/page.tsx` | 「首次完整報告 49 元」（Hero section 徽章） |
| `components/startup-light/PaymentPanel.tsx` | 「首次完整報告 49 元」（付款卡片標題 + 按鈕文案） |
| `lib/record-store.ts` | 無價格（僅建立 payment record，不寫價格） |
| 目前無統一的價格常數檔案 | ❌ 價格散落在 UI 元件中 |

### 4c. 建議（接金流前做）

1. 新增一個共用常數檔案（例如 `lib/pricing.ts`）集中管理所有價格與文案
2. 元件從共用常數讀取價格，不要各自寫死
3. 未來調整價格時只需要改一個檔案

---

## 5. 真金流候選比較

以下為三家台灣常見金流服務的中立比較，不包含建議或推薦。

### 5a. Line Pay

| 項目 | 說明 |
|------|------|
| 申請門檻 | 需公司統編或商號登記；個人申請難度較高 |
| 台灣使用者熟悉度 | 高，LINE 普及率極高，行動支付習慣已建立 |
| 串接複雜度 | 中，需使用 LINE Pay API，有 sandbox 測試環境 |
| 手續費與撥款 | 約 2.7%~3% + 每筆固定費用；撥款週期約 T+1 ~ T+3 |
| 適合 49 元小額付款 | 手續費佔比偏高（約 1.5~2 元），49 元級距仍在可接受範圍 |
| 發票 / 稅務 | 需自行處理發票開立；金流端不代開發票 |
| 對目前 MVP 適合度 | 中等 — 串接文件完整，但申請門檻對個人開發者較高 |

### 5b. 綠界 ECPay

| 項目 | 說明 |
|------|------|
| 申請門檻 | 個人可申請（需身分證與銀行帳戶驗證） |
| 台灣使用者熟悉度 | 極高，台灣市佔率最高的金流服務 |
| 串接複雜度 | 中低，SDK 與文件完整，有測試環境 |
| 手續費與撥款 | 信用卡約 2.5%~2.8%；ATM/超商約每筆 10~15 元固定費用；撥款週期約 T+1 ~ T+7 |
| 適合 49 元小額付款 | ATM / 超商繳費手續費對 49 元偏重；信用卡尚可 |
| 發票 / 稅務 | 綠界提供電子發票加值服務（需額外申請與費用） |
| 對目前 MVP 適合度 | 高 — 個人可申請、台灣市佔最高、文件最齊全、支援多種付款方式 |

### 5c. 藍新 NewebPay

| 項目 | 說明 |
|------|------|
| 申請門檻 | 個人可申請（需身分證驗證）；公司行號亦可 |
| 台灣使用者熟悉度 | 中高，僅次於綠界 |
| 串接複雜度 | 中，API 文件完整，有測試環境 |
| 手續費與撥款 | 信用卡約 2.5%~2.9%；超商/ATM 約 12~18 元；撥款週期約 T+2 ~ T+7 |
| 適合 49 元小額付款 | 同綠界，超商/ATM 手續費對 49 元偏重 |
| 發票 / 稅務 | 提供電子發票 API，可串接 |
| 對目前 MVP 適合度 | 中高 — 個人可申請、支援廣泛、但文件與社群資源略少於綠界 |

### 5d. 小額付款注意事項（三家通用）

- 手續費佔比：49 元級別下，2.5%~3% 手續費約 1.2~1.5 元，佔營收 2.5%~3%
- ATM / 超商條碼的固定手續費（10~18 元）對 49 元極不划算，初期可只開信用卡或 Line Pay
- 電子發票：綠界和藍新都有電子發票加值服務，但需額外申請與費用
- 退款：金流端會收取退款手續費（通常不退還原始交易手續費）

---

## 6. 接金流前不要做的事

為避免金流串接時需要重改程式，以下項目請**不要在接入金流之前做**：

- 不要改 DeepSeek prompt
- 不要改 Tavily 搜尋邏輯
- 不要重做結果頁（AnalysisSuccess 順序與排版已穩定）
- 不要新增會員系統（目前無使用者登入）
- 不要新增訂閱制（目前為單次付款）
- 不要新增結果查詢頁（目前無歷史記錄功能）
- 不要改問題回報流程（ErrorReport 已可獨立運作）
- 不要改 `submit-analysis` 的 payment check 邏輯（`validatePayment` — 金流只影響 payment 建立與確認方式，不影響檢查本身）
- 不要改 Prisma schema 的現有欄位（可新增但不要重命名或刪除舊欄位）

---

## 7. 下一步建議

### Step 1：選定金流方案
- 根據申請門檻、手續費、串接複雜度決定
- 個人開發者 → 優先考慮綠界或藍新
- 有公司統編 → Line Pay + 綠界可並行

### Step 2：建立 payment provider abstraction
- 新增一個金流抽象層（例如 `lib/payment-provider.ts`）
- 定義統一的 createOrder / verifyPayment / refund 介面
- 先 mock 實作，再切換到真實金流
- 這樣金流切換時只需要改這個檔案

### Step 3：新增 webhook 端點
- `POST /api/payment-webhook`
- 接收金流付款成功通知
- 驗證簽章
- 更新 payment 狀態為 paid
- 實作 idempotent 邏輯（同一筆通知重複送只處理一次）

### Step 4：修改 create-payment
- 改成呼叫金流 API 建立訂單
- 回傳付款網址給前端
- 前端導向金流付款頁面

### Step 5：本機與 Vercel 測試
- 使用金流 sandbox 環境
- 測試付款成功 / 失敗 / 退款情境
- 測試 webhook 重複通知
- 測試 submit-analysis 在付款成功後才可使用

### Step 6：更新政策頁與聯絡方式
- 服務條款（`/terms`）
- 隱私權政策（`/privacy`）
- 退款政策（`/refund`）
- 加入客服聯絡方式（email）
- 更新價格文案統一從共用常數讀取

### Step 7：整理價格常數
- 新增 `lib/pricing.ts`
- 將所有價格文案集中管理
- 確認 UI 元件改為讀取共用常數

---

**文件維護者：** ____________________ **最後更新日期：** 2026-06-10
