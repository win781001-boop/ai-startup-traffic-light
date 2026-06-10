# AI創業紅綠燈 Payment Provider Abstraction 規劃

> 版本：v0.18
> 建立日期：2026-06-10
> 用途：規劃金流串接抽象層，避免金流商邏輯散落在 API route，降低將 mock payment 替換為真金流時的技術債

---

## 1. 為什麼需要 Payment Provider Abstraction

### 1a. 避免金流商邏輯散落在 API route

如果直接把藍新 API 的訂單建立邏輯寫在 `create-payment/route.ts`、把 callback 驗證寫在 `submit-analysis/route.ts`，會造成：

- 每個 route 都知道金流商的資料格式
- 無法單獨測試金流邏輯
- 換金流商時要改散落在多個檔案的程式碼
- 金流錯誤處理和核心判定流程混在一起

### 1b. 未來可替換藍新 / 綠界 / Line Pay

定義統一的 `PaymentProvider` 介面後：

- 所有金流操作都透過介面呼叫
- 切換金流商只需要換 provider 實作
- 可以同時維護多個 provider（mock + 正式）並用環境變數切換
- 新增金流商時只需要新增一個檔案

### 1c. 保留現有 paymentId / analysisId / used 狀態規則

抽象層不應該改變目前已經整理好的狀態規則：

- `paymentId` 仍是系統內部的訂單識別碼
- 金流商自己的訂單編號（如藍新的 `MerchantOrderNo`）可以對應到 `paymentId`，但不取代它
- `Payment.used` 的保護邏輯應維持在 `record-store.ts` 或業務邏輯層，不交給 provider

### 1d. 降低真金流 callback 對核心判定流程的破壞

真金流 callback（webhook）最容易造成的問題是：

- callback 處理邏輯直接寫在 `submit-analysis` 或 `create-payment` 裡面
- callback 重複送但沒有 idempotent 保護
- callback 驗簽失敗時沒有清楚的分級錯誤處理

抽象層應把 callback 驗證和 `Payment` 狀態更新封裝在一起，不讓金流細節影響 submit-analysis 的核心流程。

---

## 2. 目前 mock payment 流程摘要

### 2a. create-payment

```
前端點擊「下一步：付費 49 元」
→ POST /api/create-payment
→ recordStore.createPayment()
  → 產生 paymentId、analysisId、submissionId
  → 建立 Payment(status=pending, used=false)
  → 建立 Analysis(status=pending)
  → 建立 Submission(空內容)
→ 回傳 { payment: { id, createdAt }, analysisId }
```

目前沒有真實金流訂單、沒有導向第三方付款頁面。

### 2b. confirm-payment

```
使用者點擊「確認付款 49 元」
→ POST /api/confirm-payment
→ recordStore.confirmPayment(paymentId)
  → 檢查 Payment 是否存在且 status=pending
  → 更新 status=paid
→ 回傳 Payment
```

目前沒有金流 webhook、沒有簽章驗證、沒有付款成功通知。

### 2c. submit-analysis

```
使用者填完完整 6 題
→ POST /api/submit-analysis
→ validatePayment(paymentId) → 檢查 payment 是否存在且 paid
→ checkDuplicateOrExhausted(analysisId, analysis)
→ updateAnalysisInputs() + tryClaimAnalysis()
→ 內容驗證（illegal / relevance / low-info）
→ 呼叫 /api/analyze-idea
→ 成功 → usePayment() → used=true
→ 失敗 → needs_revision 或 system_error，used 不變
```

### 2d. 狀態規則摘要

| 結果 | Payment.used | Analysis.status | 消耗付款？ |
|------|-------------|-----------------|-----------|
| completed | true | completed | 是 |
| needs_revision | false | needs_revision | 否 |
| system_error | false | failed_system_error | 否（attempt rollback） |
| attempts_exhausted | false | attempts_exhausted | 否 |

### 2e. 其他關聯流程

- **duplicate submit 防護**：`tryClaimAnalysis()` 用 `updateMany` + 條件更新防止 race condition
- **ErrorReport**：一個 `paymentId` 只能建立一筆 ErrorReport（DB unique constraint），查詢時依 `paymentId` 查找
- **問題回報**：不依賴金流服務，獨立運作

---

## 3. 未來建議資料流

```
使用者點擊「付費 49 元」
  │
  ▼
POST /api/create-payment
  │
  ├─ 內部呼叫 PaymentProvider.createPayment({ amount: 49 })
  │     └─ mock provider → 直接回傳成功
  │     └─ newebpay provider → 呼叫藍新 API，取得付款網址
  │
  ├─ 建立本地 Payment record（status=pending）
  │
  └─ 回傳付款網址給前端
        │
        ▼
  前端導向金流付款頁面
        │
        ▼
  使用者在藍新頁面完成信用卡付款
        │
        ▼
  藍新發送付款結果 callback/webhook
        │
        ▼
  POST /api/payment-webhook/newebpay
        │
        ├─ PaymentProvider.verifyCallback(payload)
        │     └─ 驗證交易簽章
        │     └─ 驗證金額是否為 49 元
        │     └─ 回傳 { paymentId, status: "paid" }
        │
        ├─ 更新本地 Payment 狀態為 paid
        │
        └─ 回傳 200 OK 給藍新
              │
              ▼
  使用者回到網站（可透過輪詢或手動重整檢查付款狀態）
        │
        ▼
  前端顯示後三題表單
        │
        ▼
  POST /api/submit-analysis
        │
        ├─ validatePayment() → 檢查 payment 是否 paid
        ├─ （其餘流程與目前相同）
        │
        └─ 成功 → completed + used=true
```

### 關鍵原則

- **create-payment** 只負責建立訂單，不直接處理金流簽章或付款頁面渲染
- **payment-webhook** 只負責驗證 callback 和更新 payment 狀態，不接觸 submit-analysis 邏輯
- **submit-analysis** 不直接碰金流 provider，只讀取本地 payment status
- 金流商自己的 `MerchantOrderNo` 與系統 `paymentId` 保持對應關係

---

## 4. 建議抽象層位置

未來可以新增以下檔案（不修改現有程式碼，只新增）：

```
lib/
  payments/
    types.ts              ← PaymentProvider 介面與共用型別
    index.ts              ← provider 工廠函數（依環境變數選擇 provider）
    providers/
      mock.ts             ← mock provider（內部測試用）
      newebpay.ts         ← 藍新 provider（真金流用）
      ecpay.ts            ← 綠界 provider（備用）
      linepay.ts          ← Line Pay provider（後續加值）
```

### 各檔案職責

| 檔案 | 職責 | 依賴 |
|------|------|------|
| `types.ts` | PaymentProvider interface、共用型別、錯誤型別 | 無 |
| `index.ts` | 依 `PAYMENT_PROVIDER` 環境變數回傳對應 provider 實作 | `types.ts`、各 provider |
| `providers/mock.ts` | 實現 mock createPayment / verifyCallback，回傳固定結果 | `types.ts` |
| `providers/newebpay.ts` | 實現藍新 API 呼叫、簽章驗證、callback 解析 | `types.ts`、環境變數 |
| `providers/ecpay.ts` | 實現綠界 API 呼叫、簽章驗證、callback 解析 | `types.ts`、環境變數 |
| `providers/linepay.ts` | 實現 Line Pay API 呼叫、簽章驗證 | `types.ts`、環境變數 |

> 注意：`ecpay.ts` 和 `linepay.ts` 在 MVP 階段可以先不實作，只留骨架。

---

## 5. 建議 TypeScript Interface（草稿）

以下為規劃中的介面設計，不是最終實作。實際細節可能在實作時調整。

### 5a. PaymentProvider 介面

```typescript
// lib/payments/types.ts（規劃稿，非實際程式碼）

interface CreatePaymentResult {
  paymentId: string;
  payUrl: string | null;      // 金流付款頁面網址（mock 可回傳 null）
  orderInfo: Record<string, unknown>;  // 金流商回傳的原始資料
}

interface VerifyCallbackResult {
  paymentId: string;           // 系統內部 paymentId
  status: "paid" | "failed";
  transactionId: string;       // 金流商交易序號
  paidAmount: number;          // 實際付款金額（用於對帳）
  rawData: Record<string, unknown>; // 金流商回傳的原始 callback payload
}

interface PaymentProvider {
  readonly name: string;

  /**
   * 建立金流訂單。
   * - 向金流商 API 要求付款授權
   * - 回傳付款頁面網址（payUrl）供前端導向
   * - 不負責建立本地 Payment record（由呼叫方處理）
   */
  createPayment(params: {
    paymentId: string;
    amount: number;
    itemDesc: string;
    email?: string;
  }): Promise<CreatePaymentResult>;

  /**
   * 驗證金流 callback / webhook 是否合法。
   * - 檢查簽章、金額、訂單編號
   * - 不回傳表示付款失敗
   * - 不負責更新本地 Payment status（由呼叫方處理）
   */
  verifyCallback(payload: Record<string, unknown>): Promise<VerifyCallbackResult>;

  /**
   * 退款（預留）。
   * MVP 第一版先不實作，回傳錯誤即可。
   */
  refundPayment?(params: {
    paymentId: string;
    transactionId: string;
    amount: number;
  }): Promise<{ success: boolean }>;
}
```

### 5b. 各方法負責範圍

| 方法 | 負責 | 不負責 |
|------|------|--------|
| `createPayment` | 呼叫金流 API、解析回傳、回傳付款網址 | 建立本地 Payment record、更新 DB |
| `verifyCallback` | 驗證簽章、比對金額、解析訂單編號 | 更新 DB、回傳 HTTP response |
| `refundPayment` | 呼叫金流退款 API（第一版預留，不實作） | 退款政策判斷、客服流程 |

### 5c. 錯誤型別（規劃）

```typescript
class PaymentError extends Error {
  constructor(
    message: string,
    public code: "CREATE_FAILED" | "VERIFY_FAILED" | "AMOUNT_MISMATCH" | "SIGNATURE_INVALID" | "REFUND_FAILED"
  ) { super(message); }
}
```

---

## 6. API Route 未來分工

### 6a. app/api/create-payment/route.ts

**職責：** 只負責接收前端請求、建立本地訂單、呼叫 provider createPayment。

```
POST /api/create-payment
  → 產生 paymentId
  → 建立本地 Payment(status=pending)
  → 呼叫 PaymentProvider.createPayment({ paymentId, amount: 49 })
  → 回傳 { paymentId, payUrl, ... }
```

- 不處理金流 callback
- 不直接呼叫藍新 API（透過 provider）
- 不檢查使用者登入（目前無會員系統）

### 6b. app/api/confirm-payment/route.ts

**職責：** mock/dev 階段使用。真金流上線後可保留作為付款 return URL 驗證或輔助輪詢。

```
POST /api/confirm-payment
  → mock provider：直接將 payment 設為 paid
  → 真金流 provider：查詢金流交易狀態並回傳
```

- 真金流上線後主要付款確認透過 webhook
- confirm-payment 可作為使用者從金流頁面 return 後的驗證端點

### 6c. app/api/payment-webhook/newebpay/route.ts（未來新增）

**職責：** 接收藍新 callback，驗證後更新 payment 狀態。

```
POST /api/payment-webhook/newebpay
  → 接收藍新 POST payload
  → 呼叫 PaymentProvider.verifyCallback(payload)
    → 驗證簽章、金額、訂單編號
  → 更新本地 Payment status=paid
  → 回傳 200 OK
```

- **必須 idempotent**：同一筆 callback 重複送只處理一次
- **必須紀錄原始 payload**：供日後對帳與除錯
- **只更新 payment 狀態**，不觸發 submit-analysis

### 6d. app/api/submit-analysis/route.ts

**職責：** 不應直接碰金流 provider，只讀取本地 payment status。

```
POST /api/submit-analysis
  → validatePayment(paymentId)
    → recordStore.getPayment(paymentId)
    → 檢查 status === "paid"
    → （不呼叫任何金流 provider）
  → 其餘流程不變
```

- 金流替換不應改 submit-analysis 的程式碼
- provider 只影響 create-payment 和 webhook，不影響 submit-analysis

---

## 7. 必須保留的核心規則

### 7a. 沒有 successful paid payment，不可進入完整判定

`submit-analysis` 的 `validatePayment()` helper 檢查 Payment 是否為 `paid`。這是核心護欄，不應因引入 provider 而被繞過或弱化。

### 7b. 只有 analysis completed 才 used=true

- `usePayment()` 只在 analysis 成功完成（status=completed）時呼叫
- `needs_revision` / `system_error` / `attempts_exhausted` 都不應呼叫 `usePayment()`
- provider 不應直接控制 `used` 狀態

### 7c. paymentId 不可被重複消耗

- `tryClaimAnalysis()` 的 atomic claim 是防止重複消耗的主要機制
- 金流 callback 不應繞過這個檢查直接將 payment 設為 used

### 7d. duplicate submit 要擋

- `checkDuplicateOrExhausted()` 檢查 `analysis.used` 和 `analysis.status === "completed"`
- 這個檢查不因金流替換而改變

### 7e. payment amount 必須驗證

- `verifyCallback()` 必須檢查金流回傳的實際付款金額是否為 49 元
- 防止異常訂單（例如使用者自行修改金額、callback 偽造）
- 金額常數應從統一的價格設定讀取，不 hardcode

### 7f. payment provider callback 必須驗簽

- 藍新或任何金流商的 callback 都必須驗證交易簽章
- 未通過驗簽的 callback 應記錄並回傳錯誤，不更新 payment 狀態
- webhook secret 應存在環境變數，不寫在程式碼中

### 7g. ErrorReport 依 paymentId 查

- 問題回報流程不因金流替換而改變
- ErrorReport 的 `paymentId` unique constraint 維持不變
- 一個 paymentId 只能回報一次

---

## 8. 暫時不要做的事

- 不要直接實作藍新 provider（先規劃，等 Phase 3 再做）
- 不要把 Line Pay 一起接上（等後續加值階段）
- 不要新增會員系統（目前無使用者登入）
- 不要新增訂閱制（目前為單次付款）
- 不要新增結果查詢頁（目前無歷史記錄功能）
- 不要改 DeepSeek prompt
- 不要改 Tavily 搜尋邏輯
- 不要改問題回報流程
- 不要重構 submit-analysis 的金流檢查邏輯（validatePayment 已足夠）
- 不要改 Prisma schema 的現有欄位

---

## 9. 建議分階段實作順序

### Phase 1：建立 abstraction types 與 mock provider（不改外部行為）

- 新增 `lib/payments/types.ts` — PaymentProvider interface、共用型別
- 新增 `lib/payments/providers/mock.ts` — 目前 mock 行為的 provider 實作
- 新增 `lib/payments/index.ts` — 依環境變數回傳 provider
- **外部行為不變**，create-payment 仍是 mock

### Phase 2：create-payment 改為透過 provider

- 修改 `app/api/create-payment/route.ts` — 透過 `PaymentProvider.createPayment()` 建立訂單
- 使用 mock provider，行為與目前相同
- 確認 `paymentId` 傳遞正確
- 測試所有前端流程不受影響

### Phase 3：新增藍新 provider

- 新增 `lib/payments/providers/newebpay.ts`
- 實作 `createPayment()` — 呼叫藍新 API，取得付款網址
- 實作 `verifyCallback()` — 驗證簽章與金額
- 使用藍新 sandbox 環境測試
- **先不開 production**，用環境變數 `PAYMENT_PROVIDER=mock` 維持 mock 行為

### Phase 4：新增 payment webhook route

- 新增 `app/api/payment-webhook/newebpay/route.ts`
- 接收藍新 callback，驗證簽章，更新 payment 狀態
- 實作 idempotent 邏輯（同一筆通知重複送只處理一次）
- 紀錄原始 callback payload 供對帳
- 在 sandbox 環境完整測試

### Phase 5：本機與 Vercel 測試

- 本機使用藍新 sandbox 測試付款成功 / 失敗 / callback 重複送
- 部署到 Vercel preview 環境測試 webhook 端點是否可達
- 測試 submit-analysis 在付款成功後才可用
- 測試 ErrorReport 流程不受影響

### Phase 6：更新付款文案、退款政策、客服說明

- 更新價格文案（如有調整）
- 更新 `/terms`、`/privacy`、`/refund` 政策頁
- 加入客服聯絡方式
- 確認付款流程中所有文字與真金流一致

### Phase 7：正式切換 production provider

- 環境變數改為 `PAYMENT_PROVIDER=newebpay`
- 使用藍新 production API key
- 先小規模測試 1~2 筆真實交易
- 確認 webhook 在 production 環境正常運作
- 確認退款流程可操作
- 監控 1~3 天後開放完整流量

---

## 10. 風險提醒

### 10a. 金流 callback 重複打入

- 藍新可能因網路問題多次發送同一筆付款通知
- webhook handler 必須 idempotent：以 `paymentId` + `transactionId` 為 key，只處理第一次

### 10b. 使用者付款完成但中途關頁

- 使用者完成付款但未回到網站
- 解決方式：webhook 更新 payment status 後，使用者再次打開網站時應自動顯示後三題表單
- 目前無會員系統，需依賴 `paymentId` 查詢（可透過 URL parameter 或 localStorage）

### 10c. 金額不一致

- `verifyCallback()` 必須比較金流回傳金額與本地訂單金額
- 不一致時不應更新 payment 狀態，應記錄並通知客服
- 金額常數應統一管理，避免 hardcode

### 10d. 付款成功但 analysis 失敗

- 若 `submit-analysis` 在付款成功後因系統錯誤而失敗：
  - `system_error` 不消耗付款資格，使用者可重新嘗試
  - 若持續失敗，客服應透過 ErrorReport 或付款紀錄介入
- 不可因為 analysis 失敗就自動退款（需人工判斷）

### 10e. used 狀態錯誤造成重複生成

- `used=true` 應只有 `completed` 結果會觸發
- `tryClaimAnalysis()` 的 atomic claim 是主要防線
- 若 used 狀態錯誤，一筆 payment 可能產生多份 completed 報告
- 需額外監控：定期檢查是否有同一 paymentId 對應多筆 completed analysis

### 10f. Vercel env 設定錯誤

- 藍新 API key、secret、webhook secret 應設為 Vercel Environment Variables
- 正式與 preview 環境應使用不同的 API key
- env 設定錯誤時，`createPayment` 或 `verifyCallback` 應拋出明確錯誤，不默默失敗

### 10g. webhook secret 外洩

- webhook secret 不應寫在程式碼或前端 JS 中
- 若 secret 外洩，攻擊者可偽造付款成功通知
- 需搭配金額驗證和訂單存在檢查，降低偽造風險
- 可定期更換 secret

### 10h. 測試模式與正式模式混用

- `PAYMENT_PROVIDER` 環境變數決定使用 mock 或 newebpay
- Vercel preview 分支應使用 mock provider，production 分支使用 newebpay
- 若混用，可能發生測試環境向藍新 production API 建立訂單的意外
- CI/CD 流程應確認 env 設定正確

---

**文件維護者：** ____________________ **最後更新日期：** 2026-06-10
