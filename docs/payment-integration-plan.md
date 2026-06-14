# AI創業紅綠燈 真金流串接設計文件

> 版本：v0.24
> 建立日期：2026-06-09
> 用途：正式金流串接前的完整設計文件，釐清 payment / analysis / webhook / refund / duplicate handling 規則

---

## 1. 目前付款狀態

目前（v0.14）仍是 **mock payment** 階段：

- `create-payment` 不串接真實金流，直接回傳一組 mock paymentId
- `confirm-payment` 使用 mock 確認，不涉及真實付款
- 有 /api/payment-webhook mock endpoint（僅 development/test 可用，production 回 404）
- 無真實退款流程
- 正式金流尚未選定與接入

此文件作為正式串接前的設計藍圖，確保規則先寫清楚再動手改程式。

---

## 2. 目前已存在的核心概念

以下為系統中已實作的核心概念與資料結構：

| 概念 | 說明 |
|------|------|
| **paymentId** | 每次付款訂單的唯一識別碼，由 create-payment 產生 |
| **analysisId** | 每次分析請求的唯一識別碼，與 paymentId 連動 |
| **Submission** | 使用者提交的前三題內容（點子、市場、動機） |
| **Analysis** | 包含完整判定資料，對應一個 submission + 後三題 |
| **Payment.used** | 標記付款是否已被使用，true 表示已產生 completed 報告 |
| **needs_revision** | 輸入資訊不足時的狀態，允許使用者修改後重新提交。不消耗付款資格（used=false），但消耗一次 attempt |
| **completed** | 判定完成狀態，產生紅黃綠燈與完整報告 |
| **system_error** | 系統異常狀態，不消耗付款資格與 revision attempt（attempt rollback） |
| **attempts_exhausted** | revisions 用完（3 次），無法再提交。不消耗付款資格（used=false） |

---

## 3. 正式金流目標

正式金流的核心目標：

- 使用者**付款成功後**才能提交後三題
- 一筆付款**只能產生一份**正式 completed 報告
- **needs_revision 不消耗**付款資格（同一筆付款可 revision 多次）
- **system_error 不消耗**付款資格
- 完成 completed 後 **payment.used = true**，防止重複使用

---

## 4. 付款狀態（目前 mock 階段）

> **注意：** Payment.status 的型別中 ailed 與 expired 已定義但目前尚未實作寫入邏輯。預計在真實金流 provider 階段啟用。
> used 不是 Payment.status 的值，而是獨立的 Payment.used boolean 欄位（true = 已用於產生 completed 報告）。

### 目前實際使用（mock 階段）

| 狀態 | 說明 |
|------|------|
| **pending** | 付款訂單已建立，使用者尚未完成付款（create-payment 初始值） |
| **paid** | 使用者已點擊確認付款（confirm-payment 寫入，mock 直接設定為 paid） |

### 預留但尚未實作（真金流後啟用）

| 狀態 | 說明 |
|------|------|
| **failed** | 金流通知付款失敗，不可 submit-analysis。目前 mock 階段不會寫入 |
| **expired** | 訂單超過有效時間未完成付款，自動失效。目前 mock 階段不會寫入 |
| **refunded** | 已退款，紀錄保留供對帳。尚未定義在型別中，未來可新增 |

### Payment.used 規則

Payment.used（boolean）是獨立的消耗旗標：

- used = true：此付款已用於產生一份 completed 報告，不可再使用
- used = false：尚未使用（含 pending / needs_revision / failed_system_error / attempts_exhausted）
- paid → used 為單向轉換。一筆 paid 的付款最多只能轉為一次 used

### Phase 2A 已預備的金流欄位

下列欄位已新增至 Payment model（prisma/schema.prisma 與 lib/types.ts），但 **mock flow 完全不受影響**（所有新欄位皆有 @default 或 nullable）：

| 欄位 | 型別 | 預設值 | 用途 |
|------|------|--------|------|
| mountTwd | Int | 49 | 應收款金額（TWD），用於未來 webhook 金額核對。以 @default(49) 讓既有 mock 資料自動補上 |
| providerName | String | "mock" | 處理此付款的金流 provider。目前預設 "mock"，真金流 provider 階段改為 "newebpay" 等 |
| providerPaymentId | String? | 
ull | 金流 provider 端的訂單編號。真金流後由 create-payment 寫入，webhook callback 時用於查詢對應 payment |
| providerRawResponse | String? | 
ull | provider create-order 的原始回傳（JSON 字串），客服除錯與對帳用 |

> PaymentWebhookLog model 已於 Phase 3A 新增（prisma/schema.prisma + lib/types.ts + lib/record-store.ts）。
> /api/payment-webhook 已於 Phase 3B 新增為 mock endpoint，僅 development/test 環境可用，production 回 404。

---

## 5. Analysis 狀態

> **注意：** 型別中曾定義 
ejected_invalid_idea / 
ejected_low_information / 
ejected_unsupported，但目前程式碼已使用統一的 
eeds_revision 處理所有內容驗證失敗情境，前述三個狀態已移除。

| 狀態 | 說明 | 消耗 payment？ | 消耗 attempt？ |
|------|------|---------------|---------------|
| **pending** | create-payment 初始狀態，尚未 submit | 否 | 否 |
| **submitted** | submit-analysis 呼叫 tryClaimAnalysis 成功後設定，正在處理中 | 否 | +1（已計入 attemptCount） |
| **completed** | 分析完成，產生完整報告（紅黃綠燈） | 是（used=true） | 已計入 |
| **needs_revision** | 輸入資訊不足（非法內容、非商業點子、資訊不足），需使用者修改後重新提交 | 否（used=false） | 是（消耗一次 attempt） |
| **failed_system_error** | 系統異常（AI 服務 timeout / 500 / 無法解析），attempt 會 rollback | 否（used=false） | 否（rollback） |
| **attempts_exhausted** | 3 次 attempt（含初始提交）用完，無法再提交 | 否（used=false） | 已達上限 |

> 註：attempt 總次數上限為 3（maxAttempts=3），記錄在 Analysis.attemptCount 中。剩餘次數 = maxAttempts - attemptCount。

---

## 6. 付款流程

完整付款流程如下：

```
1. 使用者完成前三題（precheck 通過）
       ↓
2. create-payment → 建立 payment order（paymentId, status=pending）
       ↓
3. 導向金流付款頁面（金流服務）
       ↓
4. 使用者完成付款
       ↓
5. 金流發送 webhook 到 /api/payment-webhook
       ↓
6. 後端驗證簽章 → 更新 payment 狀態為 paid
       ↓
7. 使用者回到網站前端（可透過 polling 或使用者手動檢查）
       ↓
8. 前端顯示後三題表單 → 使用者可 submit-analysis
```

---

## 7. Webhook 設計注意事項

- **webhook 可能重複送**：金流服務可能因網路問題多次發送同一筆付款通知
- **webhook 必須 idempotent**：同一筆付款的 webhook 多次收到時，只能執行一次狀態更新
- **不可只相信前端 redirect**：前端 redirect 容易被偽造或遺漏，付款確認必須以金流後端通知為準
- **必須用金流後端通知確認付款**：以 webhook payload 為主，前端僅為輔助 UX
- **webhook 要紀錄原始 payload**：將金流送來的原始資料存入資料庫，供日後對帳與除錯
- **webhook 要驗證簽章或檢查碼**：避免偽造的 webhook 請求

---

## 8. duplicate handling（重複處理防護）

| 情境 | 處理方式 |
|------|----------|
| 同一 paymentId 已 completed，再次 submit | 拒絕（回傳錯誤） |
| 同一 paymentId 同時 submit | 以 atomic claim（資料庫鎖定）擋下重複 |
| webhook 重複通知同一筆付款 | idempotent 邏輯，僅第一次生效 |
| 使用者在付款頁面重整 | 避免重複扣款：確認 payment 狀態後決定是否導向金流 |
| 使用者重複點擊 submit | 前端 disabled + 後端 idempotency key |

---

## 9. needs_revision 規則

- 使用者已付款（paid）後，若輸入資訊不足，可修改內容重新提交
- 最多 **3 次 revision**（含初始提交）
- **needs_revision 不產生正式報告**（不顯示紅黃綠）
- **needs_revision 不提供下載報告**
- **needs_revision 不顯示 feedback 按鈕**
- **needs_revision 不消耗付款資格**：同一筆付款可用於多次 revision
- **attempts_exhausted** 後不可再提交，但付款資格仍保留（系統錯誤除外）

---

## 10. system_error 規則

- **system_error 不扣 revision attempt**
- **system_error 不消耗付款資格**
- system_error 應保留 submission、analysis record 供客服追查
- 使用者可在釐清問題後重新嘗試
- 若持續 system_error，客服應介入協助
- system_error 不顯示紅黃綠、不提供下載、不顯示 feedback

---

## 11. refund / 客服處理原則

- **非創業點子、亂填、資訊不足**：依服務條款與退款政策處理，不一定屬於可退款原因
- **系統錯誤**：可保留付款資格用於重新嘗試，或依退款政策處理
- **付款成功但未產生 completed 報告**：需能透過 paymentId / analysisId 查詢記錄，判斷是否退款
- **客服需要**：可查到 submission 內容、analysis 記錄、payment 狀態、revision 次數
- **退款後**：payment 狀態設為 refunded，無法再用於 submit

---

## 12. 真金流前不得做的事

- 不做會員系統
- 不做訂閱制
- 不做課程 funnel
- 不做結果查詢頁
- 不做後台管理，除非客服流程確定需要（可先透過資料庫查詢）
- 不改 AI prompt
- 不改四象限內部邏輯（紅黃綠燈判定方式）

---

## 13. 未來接金流時可能需要修改的檔案

以下為未來（v0.15+）可能需修改的檔案，僅供參考，本次不更動：

| 檔案 | 可能修改內容 |
|------|-------------|
| `app/api/create-payment/route.ts` | 串接金流 API，建立真實 payment order |
| `app/api/submit-analysis/route.ts` | 檢查 payment 狀態為 paid 後才允許 submit |
| `app/api/payment-webhook/route.ts` | **已新增（Phase 3B）** — mock webhook endpoint，production 回 404。真金流階段需改為真實 provider adapter |
| `lib/record-store.ts` | 新增 payment 狀態更新邏輯、atomic claim |
| `prisma/schema.prisma` | 新增 payment 狀態欄位、webhook log table |
| `components/startup-light/PaymentPanel.tsx` | 整合真實金流按鈕、付款後狀態輪詢 |
| `app/page.tsx` | 調整付款流程 UI |

---

## 14. 真金流串接前 checklist

- [ ] 選定金流服務（如 TapPay / Line Pay / PayPal / Stripe）
- [ ] 確認手續費結構
- [ ] 確認是否支援信用卡 / ATM / 超商 / LINE Pay
- [ ] 確認 webhook 文件與 payload 格式
- [ ] 確認測試環境可用
- [ ] 確認正式環境上線流程
- [ ] 確認退款流程與政策
- [ ] 確認客服信箱已設定
- [ ] 確認正式價格（目前 49 元，是否調整？）
- [ ] 確認付款前文案已更新（v0.13）
- [ ] 確認政策頁（服務條款 / 隱私權 / 退款政策）完備
- [ ] 確認 production env vars（金流 API key、secret）
- [ ] 確認上線前測試清單全部通過（docs/launch-checklist.md）


---

## 15. PaymentWebhookLog — Phase 3A（2026-06-12）

### 15.1 用途

PaymentWebhookLog 用於紀錄金流 provider 發送的每一筆 webhook 通知。在未來真金流階段，webhook route 收到通知後會先寫入 PaymentWebhookLog，再進行簽章驗證、金額核對、payment 狀態更新等後續處理。

### 15.2 dedupeKey 去重策略

dedupeKey 是必填唯一鍵（`@unique`），用於確保 webhook idempotent：

- **如果 provider 有明確 event id：** `providerName + ":" + providerEventId`
- **如果 provider 沒有 event id：** `providerName + ":" + providerPaymentId + ":" + eventType`

注意事項：

- 不使用 `@@unique([providerName, providerEventId])`，因為 providerEventId 若為 null，PostgreSQL 無法可靠防止重複 webhook。
- dedupeKey 的組合邏輯在未來 webhook route 中實作，不在 model 中自動產生。

### 15.3 rawPayload 保存注意事項

- rawPayload 儲存金流 provider 送來的**原始請求主體**（JSON 字串），不做任何修改。
- 用於客服除錯、對帳、以及未來若需重放（replay）webhook 時的原始依據。
- 注意隱私與法規：rawPayload 可能包含使用者個人資料（如姓名、電話），不應在不必要時輸出到日誌或前端。

### 15.4 簽章驗證欄位意義

| 欄位 | 型別 | 意義 |
|------|------|------|
| verified | Boolean | 驗證是否已完成（true = 已驗證，false = 尚未驗證或驗證失敗） |
| verifiedAt | DateTime? | 驗證時間 |
| signatureValid | Boolean? | 簽章是否有效（null = 尚未驗證，true = 有效，false = 無效） |
| amountMatch | Boolean? | 金額是否匹配（null = 尚未核對，true = 匹配，false = 不匹配） |

> amountMatch 不在 model 層計算，而是在未來 webhook route 內比對 rawPayload 中的金額與 Payment.amountTwd。

### 15.5 資料庫欄位設計

PaymentWebhookLog 與 Payment 無直接 foreign key 關聯（paymentId 為 String?），原因：

- webhook 可能無法在第一時間對應到已知的 paymentId
- 某些 webhook 通知可能與付款無直接關聯（如 provider 的測試 ping）

### 15.6 Phase 3A 範圍（本次完成）

- [x] prisma/schema.prisma — 新增 PaymentWebhookLog model（含欄位與索引）
- [x] lib/types.ts — 新增 PaymentWebhookLog / CreatePaymentWebhookLogInput 型別
- [x] lib/record-store.ts — 新增 4 個基礎方法（create / getByDedupeKey / markProcessed / updateVerification）
- [x] docs/payment-integration-plan.md — 本文件更新

> webhook endpoint 已於 Phase 3B 新增，見 §16。

### 15.7 Phase 3A 不做的事

- 不新增 webhook endpoint（app/api/payment-webhook/route.ts 尚未建立）
- 不接真實金流
- 不改 create-payment / confirm-payment / submit-analysis route 行為
- 不改前端 UI
- 不改 AI prompt / 四象限 / 燈號規則
- 不改 Results.tsx
- 不執行 prisma db push（需要使用者手動執行）
- 不執行 migrate


## 16. Mock Webhook Endpoint — Phase 3B（2026-06-12）

### 16.1 概述

`/api/payment-webhook` 是 **mock webhook endpoint**，並非真金流 endpoint。只在 development / test 環境可用。

用途：

- 驗證 webhook 接收 → 去重 → 簽章驗證 → 金額核對 → Payment 更新的完整流程
- 確保 PaymentWebhookLog 的 dedupeKey、verification、processed 狀態正確運作
- 提供測試腳本驗證邊界情境（amount mismatch / invalid signature / payment not found）

### 16.2 Production Guard

```typescript
if (process.env.NODE_ENV === "production") {
  return new Response(null, { status: 404 });
}
```

Production 行為：

- 回傳 HTTP **404**，不回傳 JSON body，不洩漏 endpoint 結構
- 不解析 payload
- 不寫入 PaymentWebhookLog
- 不查詢 Payment
- 不更新 Payment.status

> **警告：除非真金流 provider 已接入且簽章驗證完成，否則不可移除 production guard。**

### 16.3 Mock 驗證規則

| 欄位 | 規則 |
|------|------|
| signature | `=== "mock-valid"` 視為有效，其他值視為無效 |
| signatureValid | signature === "mock-valid" → true，其他 → false |
| verified | 固定設為 true（每次都會執行 mock 驗證） |
| amountMatch | route 內核對 payload.amountTwd 與 Payment.amountTwd |

> **Production 不可使用 mock-valid 作為真實付款依據。** 真金流階段必須使用 provider 官方 SDK 或 API 進行簽章驗證。

### 16.4 本地測試方式

```powershell
# Terminal 1：啟動 dev server
npm run dev

# Terminal 2：執行 webhook 測試
.\scripts\test-payment-webhook.ps1
```

### 16.5 測試覆蓋範圍

`scripts/test-payment-webhook.ps1` 目前涵蓋：

| 測試案例 | 預期結果 |
|----------|----------|
| Valid webhook（mock-valid + 正確金額） | `processed: true` |
| Duplicate webhook（相同 payload 第二次） | `duplicated: true` |
| Amount mismatch（amountTwd=999 vs 49） | `reason: amount_mismatch` |
| Invalid signature（signature="invalid"） | `reason: invalid_signature` |
| Payment not found（不存在的 paymentId） | `reason: payment_not_found` |

5 個測試案例全數通過（Passed 5 / Failed 0 / Skipped 0）。

### 16.6 Phase 3B 已完成項目

- [x] `app/api/payment-webhook/route.ts` — mock webhook endpoint
- [x] Production guard（NODE_ENV === "production" 回 404）
- [x] `lib/record-store.ts` — 新增 confirmPaymentByWebhook
- [x] `scripts/test-payment-webhook.ps1` — 5 個測試案例
- [x] `docs/payment-integration-plan.md` — 本文件更新

### 16.7 接真金流前必須完成的事項

以下為目前 mock webhook endpoint **尚未實作**的功能，真金流 provider 接入前必須補上：

1. **真實 provider adapter** — 取代 mock signature 驗證，改用 provider 官方 SDK 或 API
2. **真實簽章驗證** — 不再使用 `signature === "mock-valid"`，改為 provider 指定的簽章演算法
3. **provider event id / provider payment id 對應** — 確保 webhook payload 中的 provider 端 ID 可正確對應到內部 paymentId
4. **金額核對** — 比對 webhook payload 中的實際付款金額與 Payment.amountTwd（dedupeKey 流程目前正確）
5. **webhook idempotency** — 去重邏輯已實作（dedupeKey），真金流階段應驗證 provider 是否會重送，以及 dedupeKey 是否涵蓋所有重送情境
6. **Production 可用 endpoint 的安全設計** — 移除 production guard 的前提是真金流 provider 整合完成，且簽章驗證不可繞過

### 16.8 重要限制

- **不要把目前 mock endpoint 當作正式 webhook 使用**
- **不要移除 production guard**，除非真金流 provider 與驗簽完成
- mock-valid 不是真實簽章驗證，僅供開發測試
- 正式上線前必須通過真金流串接前的完整 checklist（見 §14）



## 17. Confirm-Payment Guard — Phase 3G（2026-06-13）

### 17.1 概述

`/api/confirm-payment` 是 **mock-only endpoint**，僅在 development / test 環境可供 mock 付款確認使用。

用途：

- 讓前端在 mock 付款流程中，將 Payment.status 從 pending 改為 paid
- 提供測試腳本驗證完整的 submit flow（create-payment → confirm-payment → submit-analysis）

### 17.2 Production Guard

```typescript
if (process.env.NODE_ENV === "production") {
  return new Response(null, { status: 404 });
}
```

Production 行為：

- 回傳 HTTP **404**，不回傳 JSON body，不洩漏 endpoint 結構
- 不解析 payload
- 不查詢 Payment
- 不更新 Payment.status

### 17.3 Provider Guard

```typescript
const paymentProvider = process.env.PAYMENT_PROVIDER;
if (paymentProvider && paymentProvider !== "mock") {
  return new Response(null, { status: 404 });
}
```

當 PAYMENT_PROVIDER 環境變數為非 mock 值（如 `newebpay`、`ecpay`）時：

- 回傳 HTTP **404**
- 不更新 Payment.status
- 確保真金流 provider 接入後，confirm-payment 無法被用來繞過付款

### 17.4 Rate Limiting

與 create-payment 共用相同的 rate limit helper（`checkRateLimit` / `getClientIp`）：

- 10 req / 10 min per IP
- 超過時回 429 + `Retry-After` header

### 17.5 真金流時付款確認流程

在真金流階段，payment confirmation 不應使用 confirm-payment endpoint，而應透過 webhook 驅動：

1. 使用者在前端選擇金流方式並被導向金流頁面
2. 使用者在金流頁面完成付款
3. 金流 provider 發送 webhook 到 `/api/payment-webhook`
4. Webhook 驗證簽章 → 更新 Payment.status 為 paid
5. 前端可透過 polling 檢查 payment 狀態，或等待使用者手動重新整理

### 17.6 Phase 3G 已完成項目

- [x] `app/api/confirm-payment/route.ts` — 加入 production guard、provider guard、rate limiting
- [x] `docs/payment-integration-plan.md` — 本文件更新
- [x] `docs/launch-checklist.md` — 加入 confirm-payment guard 檢查項

### 17.7 接真金流前必須完成的事項

1. **移除 confirm-payment 的 production guard** — 僅當真金流 provider 的 webhook 流程已實作且可正確更新 Payment.status 時，才考慮讓 confirm-payment 在 production 運作
2. **或者完全移除 confirm-payment** — 如果真金流階段不再需要前端直接呼叫 confirm-payment，則應直接刪除這個 endpoint
3. **確保 payment-webhook 的 production guard 可安全移除** — 見 §16.7
4. **驗證 webhook → payment status 更新的端到端流程** — 確保無需 confirm-payment 也能完成付款確認

### 17.8 重要限制

- **不要把目前 mock confirm endpoint 當作正式付款確認使用**
- **不要移除 production guard**，除非真金流 provider 整合完成
- **不要移除 provider guard**，真金流階段應由 webhook 驅動付款確認
- 正式上線前必須通過真金流串接前的完整 checklist（見 §14）

## 18. 真金流上線前必補項目 — Phase 3H 付款風險盤點結論（2026-06-13）

### 18.1 目前已完成的生產安全防線

| 防線 | 狀態 |
|------|------|
| confirm-payment production guard（NODE_ENV=production 回 404） | ✅ 已補（Phase 3G） |
| confirm-payment provider guard（非 mock provider 回 404） | ✅ 已補（Phase 3G） |
| confirm-payment rate limit（10 req / 10 min） | ✅ 已補（Phase 3G） |
| mock payment-webhook production guard（NODE_ENV=production 回 404） | ✅ 已補（Phase 3B） |
| create-payment rate limit（10 req / 10 min） | ✅ 已補 |
| submit-analysis rate limit（10 req / 10 min） | ✅ 已補 |
| submit-analysis 驗證 payment 為 paid 後才允許提交 | ✅ 已補 |
| submit-analysis 去重（checkDuplicateOrExhausted + tryClaimAnalysis） | ✅ 已補 |
| submit-analysis 驗證 analysisId 與 paymentId 對應 | ✅ 已補 |
| webhook dedup（dedupeKey unique constraint） | ✅ 已補 |
| webhook 金額核對（mock 階段） | ✅ 已補 |
| create-payment response 過濾 provider 內部欄位 | ✅ 已補 |

### 18.2 可正式使用的 mock-only endpoint

目前以下兩個 endpoint **僅供開發與測試使用，production 回 404**：

| Endpoint | Production 行為 | 真金流時 |
|----------|----------------|----------|
| `/api/confirm-payment` | 404（不回 JSON body） | 不建議開放，應由 webhook 驅動 |
| `/api/payment-webhook` | 404（不回 JSON body） | 改為真實 provider adapter，移除 production guard |

### 18.3 真金流 webhook 強制要求

真金流上線前，payment-webhook route 必須改為透過 PaymentProvider.verifyCallback() 驗證，而非直接比對 `signature === "mock-valid"`。

**必須驗證的項目：**

1. **簽章或檢查碼（signature / checksum）** — 使用 provider 官方 SDK 或指定演算法，不可自製
2. **付款金額（amount）** — 比對 webhook payload 中的實際付款金額與 Payment.amountTwd
3. **provider 端訂單編號（providerPaymentId / tradeNo）** — 確保可對應到內部 paymentId
4. **事件類型（eventType）** — 只處理 `payment_paid` / `payment_success` 等成功事件

**必須實作的保護措施：**

5. **Idempotency** — 以 dedupeKey 為基礎的防重處理（已實作）。真金流階段需驗證 provider 是否會重送，以及 dedupeKey 是否涵蓋所有重送情境
6. **Raw body 保留** — 將原始請求主體存入 PaymentWebhookLog.rawPayload（已實作）
7. **所有回應皆回 200** — 即使驗證失敗也回 200，避免金流端因 HTTP 錯誤碼而重送（已實作）

### 18.4 pending payment 過期與失敗處理規則

目前 Payment.status 的 `failed` 與 `expired` 僅定義在型別中，**尚未有寫入邏輯**。真金流上線前必須補上：

| 狀態 | 觸發時機 | 處理方式 |
|------|----------|----------|
| `failed` | webhook 通知付款失敗 | 更新 Payment.status = "failed"，不可 submit-analysis |
| `expired` | payment 建立後超過有效時間未付款 | 建立定時任務或 webhook 通知過期；不可 submit-analysis |

初期建議先支援 `failed`（由 webhook 通知驅動），`expired` 可在正式上線後補上。

### 18.5 create-payment 重複訂單策略（記錄用，不在本階段實作）

目前 create-payment 無 idempotency key，使用者重整頁面或重複點擊可能產生多筆 pending payment。

建議真金流上線前評估以下方案（擇一）：

- **方案 A：前端產生 idempotency key** — 前端在呼叫 create-payment 時帶入一個唯一鍵，後端檢查是否已處理過
- **方案 B：Session-based 限制** — 同一 session 短時間內只允許一筆 pending payment
- **方案 C：以已存在的 pending payment 取代重複建立** — 若該使用者已有未過期的 pending payment，直接回傳既有紀錄

此項不在本階段實作，僅記錄為真金流前置討論項目。

### 18.6 PaymentProvider 型別後續強化方向

真金流 provider 接入前，`lib/payments/types.ts` 需要補上：

| 需要強化的項目 | 說明 |
|---------------|------|
| `CreatePaymentResult.formHtml?: string` | ECPay 等 form POST 型 provider 需要回傳 HTML form 而非 URL |
| `CreatePaymentInput.notifyUrl?: string` | 金流非同步通知回呼網址 |
| `CreatePaymentInput.returnUrl?: string` | 付款完成後導回使用者的 URL |
| `PaymentProvider.verifyCallback()` 整合至 webhook route | 目前 webhook route 未使用 verifyCallback |

此項不改僅記錄，預計在 Phase 3I-B 或 Phase 3J 實作。

### 18.7 Refund / ErrorReport 與付款事故處理

#### 退款流程技術規格（真金流上線前需確認）

| 項目 | 說明 |
|------|------|
| Payment.status 新增 `refunded` | 退款後設為 refunded，不可再用於 submit-analysis |
| payment.used 與 refunded 的關係 | 若 payment.used=true 後退款，used 仍為 true（保留使用紀錄），payment.status 改為 refunded |
| 退款由誰發起 | 客服手動處理（初期無自助退款） |

#### ErrorReport 與付款流程關聯

`ErrorReport` table 目前存在但未與付款流程文件連結。真金流階段應確保：

- ErrorReport 可透過 paymentId 追蹤到對應的 Payment 與 PaymentWebhookLog
- ErrorReport 的 issueType 應包含付款相關類型（例如 `payment_failed`、`payment_amount_mismatch`）
- 客服可透過 paymentId 查詢完整的付款事故時間線

#### 亂輸入仍依既有決策

付款後亂輸入（非商業點子、低資訊、違法內容）仍依既有決策處理：

- 不回復 payment.status 或 payment.used
- 保留 submission / analysis record 供追查
- 依退款政策判斷是否可退款（需客服介入）

### 18.8 Phase 3I-A 已完成項目

- [x] `docs/payment-integration-plan.md` — 新增 §18 真金流上線前必補項目
- [x] `docs/launch-checklist.md` — 補上真金流前檢查項

### 18.9 下一階段建議

- **Phase 3I-B** — PaymentProvider types 強化（formHtml / notifyUrl / returnUrl），不接真金流
- **Phase 3J** — provider-agnostic sandbox 研究（只讀），評估藍新 / ECPay / Line Pay 測試環境規格
- **Phase 3K** — 真金流 provider sandbox 前置實作


## 19. NewebPay 藍新 MPG 整合設計 — Phase 3J（2026-06-13）

### 19.1 第一順位正式金流決策

**選擇藍新 NewebPay 作為正式金流第一順位**，理由如下：

| 因素 | 評估 |
|------|------|
| 小額一次性付款（49 元） | 藍新 MPG 支援信用卡、ATM、超商、LINE Pay 等多種方式，適合低金額 |
| 手續費結構 | 藍新手續費為交易金額 2.x% 起 + 每筆固定費用，對小額尚可接受 |
| 提領週期 | 藍新為 T+1 / T+3 撥款（依行業別），現金流周轉壓力低 |
| 台灣常見度 | 藍新為台灣前三大金流服務，消費者信任度高 |
| 技術可控性 | MPG 幕前支付為 form POST + AES-256-CBC 加密 + SHA-256 簽章，無需複雜 OAuth |
| 開發文件 | 完整中文技術手冊（NDNF-1.2.2），PHP / Node.js 範例齊全 |
| 測試環境 | 提供完整 sandbox，無需正式審核即可開發串接 |

**不優先採用 LINE Pay / 綠界的原因：**

- **LINE Pay**：需要額外 LINE Pay 商家申請、單一付款方式（僅 LINE Pay 錢包），不利轉換率
- **綠界 ECPay**：技術規格與藍新類似，可作為備選，但藍新的串接手冊與開發者工具更完整

### 19.2 預期付款流程

```
create-payment → 建立 Payment(status=pending) + Submission + Analysis
       │
       │  NewebPay provider 產生：
       │    MerchantOrderNo = paymentId
       │    TradeInfo = AES-256-CBC(參數JSON, HashKey, HashIV)
       │    TradeSha = SHA-256(HashKey + TradeInfo + HashIV)
       │
       ▼  回傳 formHtml（含自動 submit 的 HTML form）
前端自動 submit → NewebPay MPG 付款頁
       │
       │  使用者在藍新頁面選擇付款方式並完成付款
       │
       ├───────────────────────────────────────────┐
       ▼                                            ▼
  [NotifyURL callback]                         [ReturnURL redirect]
   藍新 POST (server→server)                    瀏覽器導回前端
   Status + 加密 TradeInfo                      前端顯示付款結果
       │
       ▼
  驗證 TradeSha → 解密 TradeInfo
  核對 MerchantOrderNo / Amt
  更新 Payment.status = paid
  paidAt = PayTime
  providerPaymentId = TradeNo
  寫入 PaymentWebhookLog
       │
       ▼
  使用者回到前端 → 可 submit-analysis
  submit-analysis 只消耗 paid 且 unused payment
```

**關鍵原則：NotifyURL 是唯一可信的付款成功來源。ReturnURL 僅供 UX。**

### 19.3 藍新欄位與本站欄位對應表

| 藍新欄位 | 本站欄位 | 說明 |
|----------|----------|------|
| `MerchantID` | `NEWEBPAY_MERCHANT_ID` env | 商店代號，不可硬編碼 |
| `MerchantOrderNo` | `Payment.id`（paymentId） | create-payment 時以 paymentId 傳入 |
| `Amt` | `Payment.amountTwd` | 必須完全一致，否則拒絕更新 |
| `TradeNo` | `Payment.providerPaymentId` | 藍新交易序號，用於對帳、退款 |
| `Status`（decrypted TradeInfo 內） | `Payment.status` | SUCCESS → paid；錯誤碼 → failed |
| `PayTime` | `Payment.paidAt` | 藍新回傳的付款完成時間 |
| `TradeInfo`（encrypted hex） | `PaymentWebhookLog.rawPayload` | 原始加密字串，用於事故追蹤 |
| `TradeSha` | 驗證用，不儲存 | SHA-256 checksum |
| `Email`（可選） | `CreatePaymentInput.customerEmail` | 用於藍新付款通知信 |
| `ItemDesc` | `CreatePaymentInput.description` | 商品描述，顯示在藍新付款頁 |
| `RespondType` | 固定 `JSON` | 藍新回傳格式 |
| `Version` | `2.3` | API 版本（NDNF-1.2.2 最新版） |
| `EncryptType` | `1` | 0=AES-CBC, 1=AES-GCM（目前選 CBC 以相容既有範例） |

**Payment.status 狀態映射：**

| 藍新 TradeStatus | 藍新 Notify 回傳 | 本站 status | 說明 |
|------------------|-------------------|-------------|------|
| `1`（付款成功） | Status=SUCCESS + PayTime 存在 | `paid` | 付款成功 |
| `0`（未付款） | Status 非 SUCCESS | `pending` | 已建立但未付款 |
| `2`（付款失敗） | Status=TRA-XXXXX | `failed` | 信用卡拒刷、餘額不足等 |
| `3`（取消付款） | 不觸發 Notify | `expired` | 使用者取消或逾期 |
| `6`（退款） | 客服手動操作 | `refunded` | 後續階段實作 |

### 19.4 環境變數規劃

以下變數未來需在 `.env.local` 與 Vercel Environment Variables 設定：

| 環境變數 | 用途 | 範例值（測試） |
|----------|------|----------------|
| `PAYMENT_PROVIDER` | 切換金流 provider | `newebpay` |
| `NEWEBPAY_MERCHANT_ID` | 藍新商店代號 | `MS127874575` |
| `NEWEBPAY_HASH_KEY` | AES-256-CBC 加密金鑰（32 字元） | 測試用 `Fs5cX1TGqYM2PpdbE14a9H83YQSQF5jn` |
| `NEWEBPAY_HASH_IV` | AES-256-CBC 加密 IV（16 字元） | 測試用 `C6AcmfqJILwgnhIP` |
| `NEWEBPAY_MPG_URL` | MPG 閘道網址 | `https://ccore.newebpay.com/MPG/mpg_gateway` |
| `APP_BASE_URL` | 本站根網址，用於組 NotifyURL / ReturnURL | `https://ai-startup-traffic-light.vercel.app` |

可選（若由 APP_BASE_URL 組合則不獨立設）：

| 環境變數 | 預設值 |
|----------|--------|
| `NEWEBPAY_NOTIFY_URL` | `${APP_BASE_URL}/api/payment-webhook` |
| `NEWEBPAY_RETURN_URL` | `${APP_BASE_URL}/payment/result` |
| `NEWEBPAY_CLIENT_BACK_URL` | `${APP_BASE_URL}/` |

**安全性要求：**

- `NEWEBPAY_HASH_KEY` 與 `NEWEBPAY_HASH_IV` **絕對不可寫入程式碼、不可 commit 到 Git、不可出現在前端 bundle**
- `NEWEBPAY_MERCHANT_ID` 可出現在前端（form POST 需要），但仍建議透過 env 管理
- 測試用 HashKey / HashIV 可寫入文件（如本節），但正式憑證嚴格保密
- 所有 NewebPay envs 只存在於 `.env.local` / Vercel Environment Variables

### 19.5 安全規則

| 規則 | 說明 |
|------|------|
| **HashKey / HashIV 不可在前端出現** | 這是 AES 加密與簽章的憑證，外洩等於任何人都可偽造付款結果 |
| **不可 commit 到 Git** | 所有憑證透過環境變數管理，`.env` 加入 `.gitignore` |
| **NotifyURL 為唯一可信來源** | ReturnURL 與 ClientBackURL 經瀏覽器導回，可偽造 |
| **必須驗證 TradeSha** | SHA-256 checksum 驗證後才解密 TradeInfo |
| **必須解密 TradeInfo** | 不解密無法確認 MerchantOrderNo 與 Amt |
| **必須核對 Amt** | 比對 TradeInfo 內的 Amt 與 Payment.amountTwd 一致 |
| **必須核對 MerchantOrderNo** | 確保 TradeInfo 中的訂單編號對應到本站 paymentId |
| **必須確認 Status 為付款成功** | 僅在 Status=SUCCESS + decrypted TradeInfo.Status=SUCCESS 時才改 paid |
| **Idempotency** | 以 `newebpay:{TradeNo}` 作為 dedupeKey |
| **NotURL 回 200** | 即使驗證失敗也回 HTTP 200，避免藍新重送 |
| **ProviderPaymentId 保存** | TradeNo 必須寫入 Payment.providerPaymentId 以供查詢 |

### 19.6 對目前架構的影響

#### 已預備好的部分（不需要變動）

| 項目 | 狀態 |
|------|------|
| `CreatePaymentInput.notifyUrl` | 已有（Phase 3I-B） |
| `CreatePaymentInput.returnUrl` | 已有（Phase 3I-B） |
| `CreatePaymentResult.formHtml` | 已有（Phase 3I-B），NewebPay 需回傳 form HTML |
| `PaymentProvider.verifyCallback()` | 型別已定義 |
| `PaymentWebhookLog` 結構 | 可儲存 TradeInfo rawPayload |
| `Payment.providerPaymentId` | 可儲存 TradeNo |
| `Payment.amountTwd` | 可核對 Amt |
| `Payment.providerName` | 可設為 "newebpay" |
| `confirm-payment` production guard | 真金流時應維持 404 |

#### 需要修改的項目（後續階段）

| 需要修改 | 所屬階段 | 說明 |
|----------|----------|------|
| [x] 新增 `lib/payments/providers/newebpay.ts` | Phase 3K | NewebPay provider skeleton |
| [x] 實作 AES-256-CBC 加密 / SHA-256 helper | Phase 3L | AES 加密 TradeInfo + SHA-256 TradeSha |
| [ ] `create-payment/route.ts` 依 PAYMENT_PROVIDER 選擇 provider | Phase 3M（待接） | 目前硬編碼 `getPaymentProvider("mock")`，provider createPayment 已可產 formHtml |
| `payment-webhook/route.ts` 支援 application/x-www-form-urlencoded | Phase 3N | 目前只解析 JSON |
| `payment-webhook/route.ts` 改為呼叫 provider.verifyCallback() | Phase 3N（下階段） | 取代 inline mock 驗證 |
| 新增付款導回頁或狀態頁 | Phase 3O | 接收 ReturnURL redirect |
| 新增 `NEWEBPAY_NOTIFY_URL` 與 `NEWEBPAY_RETURN_URL` env 或由 APP_BASE_URL 組合 | Phase 3K | 組 URL |
| `PaymentWebhookLog.dedupeKey` 策略調整為 `newebpay:{TradeNo}` | Phase 3N（下階段） | 取代 mock 的 `providerName:providerEventId` |

### 19.7 後續階段拆分

| 階段 | 範圍 | 是否改程式碼 | 是否可上 production |
|------|------|------------|-------------------|
| **[x] Phase 3K** | NewebPay provider skeleton，只建檔案結構，不發 API 呼叫 | 是 | 否 |
| **[x] Phase 3L** | 加密 / TradeInfo / TradeSha helper + 單元測試 | 是 | 否 |
| **[x] Phase 3M** | NewebPay provider createPayment 已可產 formHtml，尚未接 create-payment route | 是 | 否 |
| **[x] Phase 3N-C** | verifyCallback 純解析（已實作） | 是 | 否 |
| **[x] Phase 3N-R-B** | payment-webhook route 整合 verifyCallback + pending → paid（已實作） | 是 | 否 |
| **[x] Phase 3O-B** | payment-status API + payment result page（已實作） | 是 | 否 |
| **[x] Phase 3O-C** | 主頁承接 /?paymentId=&analysisId= query handoff（已實作） | 是 | 否 |
| **[x] Phase 3P-B** | create-payment 支援 NewebPay provider formHtml 回傳（已實作） | 是 | 否 |
| **[x] Phase 3P-C** | PaymentPanel 前端導流（formHtml submit + confirm 按鈕隱藏） | 是 | 否 |
| **Phase 3Q** | production launch checklist + guard 驗證 + 文件最終確認 | 是 | ✅ 可上線 |

---

**文件維護者：** ____________________ **最後更新日期：** 2026-06-12

## 20. Phase 3N-C — verifyCallback 純解析（2026-06-13）

### 20.1 概述

Phase 3N-C 實作 `newebpayProvider.verifyCallback()` 的純解析與驗證邏輯。

**核心定位：** verifyCallback 只做以下工作：
- 讀取 env（NEWEBPAY_MERCHANT_ID / HASH_KEY / HASH_IV）
- 檢查 payload 必要欄位（MerchantID / TradeInfo / TradeSha / Status）
- 驗證 TradeSha 簽章
- 解密 TradeInfo（AES-256-CBC）
- Parse decrypted TradeInfo（支援 JSON 與 URL-encoded）
- 驗證 MerchantID 一致性
- 提取 MerchantOrderNo / Amt / TradeNo / Status / PayTime / PaymentType
- 轉換 Amt 為整數
- 根據 Status 判斷付款成功或失敗
- 回傳乾淨的 raw（不含 HashKey / HashIV / Card6No / Card4No）

**verifyCallback 不做的事：**
- 不查 DB
- 不更新 Payment.status
- 不建立 PaymentWebhookLog
- 不打藍新 sandbox
- 不改前端
- 不檢查 amount match（留給 payment-webhook route 階段）
- 不產生 dedupeKey（留給 payment-webhook route 階段）
- 不呼叫 confirmPaymentByWebhook（留給 payment-webhook route 階段）

### 20.2 ReturnURL 不可信原則

verifyCallback 本身是純解析函式，不直接代表付款確認。ReturnURL redirect（使用者瀏覽器被導回）不可作為付款依據：

- ReturnURL 可被偽造
- 使用者可能在付款頁面關閉瀏覽器，ReturnURL 不會被呼叫
- 唯一可信的付款來源是 NotifyURL callback（server-to-server）
- NotifyURL callback 仍需透過 payment-webhook route 呼叫 verifyCallback，再進行 DB 寫入

### 20.3 後續階段銜接

Phase 3N-R-B（已完成）已實作：
1. 修改 `app/api/payment-webhook/route.ts` 改為呼叫 `newebpayProvider.verifyCallback()`
2. [x] 實作 amount match 比對（TradeInfo.Amt vs Payment.amountTwd）
3. [x] 實作 dedupeKey 產出（`newebpay:{TradeNo}`）
4. [x] 實作 Payment.status → paid / failed 更新
5. [x] 實作 PaymentWebhookLog 寫入
6. [x] 支援 application/x-www-form-urlencoded 的 webhook payload

> **Phase 3N-R-C（文件更新與安全 review）** 已完成，見 §21。

**下一階段：Phase 3P** — sandbox end-to-end 測試（創單→付款→notify→submit 完整流程）。在此之前，ReturnURL 不可作為付款確認依據（見 §20.2），create-payment 尚未切換到 NewebPay，正規 ReturnURL POST 承接留到 Phase 3P。
在此之前，ReturnURL 不可作為付款確認依據（見 §20.2）。

### 20.4 verifyCallback 回傳格式

```typescript
{
  provider: "newebpay",
  providerPaymentId: TradeNo | "not_verified",
  paid: boolean,
  amountTwd?: number,
  raw: {
    merchantOrderNo?: string,
    tradeNo?: string,
    status?: string,
    payTime?: string,
    amountTwd?: number,
    paymentType?: string,
    sanitizedPayload: Record<string, unknown>,  // 不含 Card6No / Card4No
    reason?: string,  // 僅錯誤時存在
  }
}
```

### 20.5 Phase 3N-C 已完成項目

- [x] `lib/payments/providers/newebpay.ts` — 實作 verifyCallback（env 檢查 / 簽章驗證 / 解密 / parse / 欄位提取 / 狀態判斷 / raw 安全過濾）
- [x] `scripts/newebpay-verify-callback-test.mjs` — 13 個測試案例，56 個 assertion
- [x] `scripts/test-newebpay-verify-callback.ps1` — 測試執行腳本
- [x] `docs/payment-integration-plan.md` — 本文件更新
- [x] `docs/launch-checklist.md` — 補上 verifyCallback 測試項目

### 20.6 測試覆蓋

| 測試案例 | 預期結果 |
|----------|----------|
| 缺 env | paid:false, reason=missing_env |
| 缺必要欄位 | paid:false, reason=missing_field |
| TradeSha 錯誤 | paid:false, reason=invalid_signature |
| TradeInfo 解密失敗 | paid:false, reason=decrypt_failed |
| JSON decrypted payload 成功解析 | paid:true, 正確 providerPaymentId/amountTwd |
| URL-encoded decrypted payload 成功解析 | paid:true, 正確 providerPaymentId/amountTwd |
| MerchantID mismatch | paid:false, reason=merchant_mismatch |
| Amt 無法轉整數 | paid:false, reason=invalid_amount |
| 非成功 Status | paid:false, 保留 providerPaymentId/amountTwd |
| 成功 callback 所有欄位 | paid:true, provider=newebpay, providerPaymentId=TradeNo, amountTwd=Amt |
| raw 不含 HashKey/HashIV | 安全 |
| sanitizedPayload 不含 Card6No/Card4No | 安全 |
| Amt 不存在 | paid:true（Status=SUCCESS 但無 Amt），amountTwd undefined |

---



## 23. Phase 3P-C — PaymentPanel formHtml Handoff（2026-06-13）

### 23.1 概述

Phase 3P-C 讓 PaymentPanel 在收到 create-payment 回應中的 formHtml 時，不再顯示 mock「確認付款」按鈕，而是顯示導向藍新付款頁的狀態訊息，並手動 submit formHtml 裡的 form。

### 23.2 前端變更

**app/page.tsx：**
- 新增 paymentFormHtml state
- handlePaymentClick 在收到 data.formHtml 時寫入 paymentFormHtml
- updateRiskField 重置 paymentFormHtml（避免殘留）
- 將 paymentFormHtml 作為 ormHtml prop 傳給 PaymentPanel

**components/startup-light/PaymentPanel.tsx：**
- 新增 ormHtml?: string | null prop
- 新增 containerRef（注入 formHtml 的容器）和 hasSubmittedRef（防重複 submit）
- useEffect 在 formHtml 存在時：
  - 設定 hasSubmittedRef.current = true（僅一次）
  - 100ms 後在 container 內查詢 <form> 並呼叫 orm.submit()
- 條件渲染：
  - ormHtml 存在 → 顯示「正在前往藍新金流付款頁…」藍色卡片，不顯示 confirm 按鈕
  - ormHtml 不存在 → 維持原有 mock confirm 按鈕
- 隱藏容器 <div ref={containerRef} dangerouslySetInnerHTML={{ __html: formHtml }} className="hidden" />

### 23.3 安全設計

| 措施 | 說明 |
|------|------|
| formHtml 來源 | 只應來自本機 /api/create-payment 回傳 |
| HasSubmittedRef | 防止同一個 formHtml 被 submit 多次 |
| 不呼叫 confirm-payment | NewebPay 流程完全繞過 mock confirm |
| 不更新 Payment.status | 付款確認由 webhook 處理 |
| mock 流程不變 | 無 formHtml 時完全維持既有行為 |

### 23.4 測試

**scripts/test-payment-panel-newebpay.ps1：**

| # | 測試案例 | 預期結果 |
|---|---------|----------|
| M1 | Mock flow: create-payment 回傳不含 formHtml | response.formHtml === undefined |
| M2 | Mock flow: confirm-payment 仍可正常運作 | confirm-payment 回 200 |
| N1 | NewebPay flow: formHtml 存在且 payment/analysisId 完整 | formHtml + payment + analysisId 皆存在 |
| N2 | NewebPay flow: confirm-payment 不應被呼叫（回 404） | Provider guard 使 confirm-payment 回 404 |
| N3 | FormHtml 包含有效 form 標記 | form / action / submit 皆存在 |

### 23.5 Phase 3P-C 已完成項目

- [x] app/page.tsx — 新增 paymentFormHtml state、capture、prop pass
- [x] components/startup-light/PaymentPanel.tsx — formHtml prop、auto-submit、conditional rendering
- [x] scripts/test-payment-panel-newebpay.ps1 — 測試腳本
- [x] docs/payment-integration-plan.md — 本文件更新
- [x] docs/launch-checklist.md — 補上 formHtml handoff 檢查項

### 23.6 尚未做的事

- Production 環境仍不可啟用 PAYMENT_PROVIDER=newebpay（需 Phase 3Q）
- 不執行 prisma db push（不需要）
- 不修改 API routes

## Phase 3P-E — 金流註解與小安全整理（2026-06-13）

### 概述

Phase 3P-E 不修改付款流程或 API route，只補安全註解與小防呆：

1. **app/payment/result/page.tsx** — polling useEffect 前補安全註解，說明 ReturnURL 不可信、本頁不更新付款狀態、付款成功只以 webhook 更新後的 /api/payment-status 結果為準
2. **components/startup-light/PaymentPanel.tsx** — formHtml prop 補安全註解（來源限制、dangerouslySetInnerHTML 理由、script 不執行需手動 submit）
3. **components/startup-light/PaymentPanel.tsx** — useEffect 找不到 form 時補 console.warn，避免靜默失敗
4. **docs/payment-integration-plan.md** — 本文件更新
5. **docs/launch-checklist.md** — 補註解 / safety note 檢查項

### 安全註解重點

| 檔案 | 註解內容 |
|------|----------|
| payment/result/page.tsx | ReturnURL 不可信、payment-status 唯讀、webhook 為唯一付款確認來源 |
| PaymentPanel.tsx interface | formHtml 只應來自 /api/create-payment、dangerouslySetInnerHTML 僅為 submit form 至 MPG、React 不執行 script |
| PaymentPanel.tsx hidden div | formHtml 來源為 server API、內容為靜態 hidden fields、React 已 strip script |
| PaymentPanel.tsx useEffect | 說明手動 submit 原因、hasSubmittedRef 防重複 |

### 防呆變更

- useEffect 中找不到 form 時執行 console.warn("[PaymentPanel] formHtml injected but no <form> found in container")

### Phase 3P-E 不做的事

- 不抽 helper
- 不改 getBaseUrl
- 不改 provider 分支
- 不改付款狀態判定
- 不改 webhook
- 不改 submit-analysis
- 不改 UI 文案
- 不改 API routes


**文件維護者：** ____________________ **最後更新日期：** 2026-06-13


## 21. Phase 3N-R-B — NewebPay NotifyURL Route Integration（2026-06-13）

### 21.1 概述

Phase 3N-R-B 將 `newebpayProvider.verifyCallback()` 接入 `app/api/payment-webhook/route.ts`，使 route 能處理 NewebPay NotifyURL 的 `application/x-www-form-urlencoded` callback。

### 21.2 架構變更

`POST /api/payment-webhook` 現在依 `PAYMENT_PROVIDER` 環境變數分支：

```
PAYMENT_PROVIDER 未設定 或 = "mock"
  └─ handleMockWebhook()
      ├─ Production guard（NODE_ENV=production → 404）
      ├─ Parse JSON body
      └─ 現有 mock 驗證流程（不變）

PAYMENT_PROVIDER = "newebpay"
  └─ handleNewebPayWebhook()
      ├─ 只接受 application/x-www-form-urlencoded
      ├─ 呼叫 newebpayProvider.verifyCallback()
      ├─ paid:false → 不更新 Payment，回傳 reason
      └─ paid:true → Payment 查找 + amount match + dedupe + PaymentWebhookLog + confirmPaymentByWebhook
```

### 21.3 Route 流程詳細

```
NewebPay NotifyURL POST
     │
     ├─ Content-Type: application/x-www-form-urlencoded?
     │   └─ request.text() + URLSearchParams → parse
     │
     ├─ newebpayProvider.verifyCallback({ provider, payload, rawBody, headers })
     │   └─ 驗簽 / 解密 / parse / Status 判斷
     │
     ├─ verifyResult.paid === false？
     │   ├─ 不更新 Payment
     │   ├─ 若有足夠 dedupeKey 資訊，嘗試建立 PaymentWebhookLog
     │   └─ 回 200 + { ok:true, processed:false, reason }
     │
     └─ verifyResult.paid === true？
         ├─ paymentId = verifyResult.raw.merchantOrderNo
         ├─ getPayment(paymentId) → Payment 必須存在
         ├─ amountTwd 比對 → 必須等於 payment.amountTwd
         ├─ providerPaymentId 必須是 TradeNo（不是 "not_verified"）
         ├─ dedupeKey = "newebpay:{TradeNo}" → 防重複
         ├─ 建立 PaymentWebhookLog
         ├─ updatePaymentWebhookLogVerification({ verified, signatureValid, amountMatch })
         ├─ confirmPaymentByWebhook() → 安全更新 Payment.status = "paid"
         └─ markPaymentWebhookLogProcessed → 回 200 + { ok:true, processed:true }
```

### 21.4 Production Guard

| Provider | NODE_ENV=production | 行為 |
|----------|-------------------|------|
| mock 或未設定 | production | 404（完全阻斷） |
| newebpay | production | 可處理 NotifyURL（不阻斷） |

`process.env.PAYMENT_PROVIDER` 在 route 入口處 `.trim()` 處理，避免 env 值含空白導致分支錯誤。

### 21.5 安全措施

| 措施 | 說明 |
|------|------|
| Route 層不自行解密/驗簽 | 全部透過 provider.verifyCallback() |
| verifyCallback 不 throw | catch 後回 callback_error |
| paid:false 不更新 Payment | 即使簽章通過但 Status 失敗，不回寫 DB |
| paid:true 仍須通過 amount match | decrypted TradeInfo.Amt 與 Payment.amountTwd 比對 |
| providerPaymentId 檢查 | paid:true 時必須是 TradeNo，拒絕 "not_verified" |
| Payment 查找 | 使用 merchantOrderNo 而非 URL query 或 form 中的 paymentId |
| confirmPaymentByWebhook 安全更新 | 只更新 status === "pending" 的 Payment |
| dedupeKey unique constraint | 資料庫層確保不重複 |
| 非 form-urlencoded 拒絕 | NewebPay handler 不接受非 form-urlencoded payload |

### 21.6 測試覆蓋

測試位於 `scripts/newebpay-webhook-test.mjs` / `scripts/test-newebpay-webhook.ps1`，透過獨立 dev server（PAYMENT_PROVIDER=newebpay + 測試金鑰）執行：

| # | 測試案例 | 預期結果 |
|---|---------|----------|
| 1 | Form-urlencoded callback parse | 200 + ok:true + processed:true |
| 2 | 成功 callback + amount match | 200 + processed:true |
| 3 | TradeNo 保存驗證 | 相同 TradeNo 第二次 → duplicated:true |
| 4 | Invalid TradeSha | 200 + reason=invalid_signature |
| 5 | Failed Status | 200 + processed:false |
| 6 | Amount mismatch | 200 + reason=amount_mismatch |
| 7 | Payment not found | 200 + reason=payment_not_found |
| 8 | Duplicate callback | 200 + duplicated:true |
| 9 | Missing env | 由 unit test 覆蓋 |

### 21.7 Phase 3N-R-B 已完成項目

- [x] `app/api/payment-webhook/route.ts` — 分層 production guard、Content-Type 判斷、NewebPay NotifyURL handler
- [x] `scripts/newebpay-webhook-test.mjs` — 9 個測試案例、35 個 assertion
- [x] `scripts/test-newebpay-webhook.ps1` — 測試執行腳本（自動啟動 newebpay dev server）
- [x] 既有 mock webhook 5 個測試仍全部通過
- [x] 既有 submit-flow 11 個測試仍全部通過

### 21.8 Phase 3N-R-C 已完成項目

- [x] `docs/payment-integration-plan.md` — 本文件更新
- [x] `docs/launch-checklist.md` — 補上 route 層檢查項

### 21.9 尚未做的事

- create-payment route 尚未切換到 PAYMENT_PROVIDER=newebpay
- ReturnURL redirect 尚未實作（Phase 3O）
- sandbox / production 真實付款測試尚未執行（Phase 3P）
- 文件維護者簽名與 final launch 確認（Phase 3Q）

---


## 23. Phase 3P-C — PaymentPanel formHtml Handoff（2026-06-13）

### 23.1 概述

Phase 3P-C 讓 PaymentPanel 在收到 create-payment 回應中的 formHtml 時，不再顯示 mock「確認付款」按鈕，而是顯示導向藍新付款頁的狀態訊息，並手動 submit formHtml 裡的 form。

### 23.2 前端變更

**app/page.tsx：**
- 新增 paymentFormHtml state
- handlePaymentClick 在收到 data.formHtml 時寫入 paymentFormHtml
- updateRiskField 重置 paymentFormHtml（避免殘留）
- 將 paymentFormHtml 作為 ormHtml prop 傳給 PaymentPanel

**components/startup-light/PaymentPanel.tsx：**
- 新增 ormHtml?: string | null prop
- 新增 containerRef（注入 formHtml 的容器）和 hasSubmittedRef（防重複 submit）
- useEffect 在 formHtml 存在時：
  - 設定 hasSubmittedRef.current = true（僅一次）
  - 100ms 後在 container 內查詢 <form> 並呼叫 orm.submit()
- 條件渲染：
  - ormHtml 存在 → 顯示「正在前往藍新金流付款頁…」藍色卡片，不顯示 confirm 按鈕
  - ormHtml 不存在 → 維持原有 mock confirm 按鈕
- 隱藏容器 <div ref={containerRef} dangerouslySetInnerHTML={{ __html: formHtml }} className="hidden" />

### 23.3 安全設計

| 措施 | 說明 |
|------|------|
| formHtml 來源 | 只應來自本機 /api/create-payment 回傳 |
| HasSubmittedRef | 防止同一個 formHtml 被 submit 多次 |
| 不呼叫 confirm-payment | NewebPay 流程完全繞過 mock confirm |
| 不更新 Payment.status | 付款確認由 webhook 處理 |
| mock 流程不變 | 無 formHtml 時完全維持既有行為 |

### 23.4 測試

**scripts/test-payment-panel-newebpay.ps1：**

| # | 測試案例 | 預期結果 |
|---|---------|----------|
| M1 | Mock flow: create-payment 回傳不含 formHtml | response.formHtml === undefined |
| M2 | Mock flow: confirm-payment 仍可正常運作 | confirm-payment 回 200 |
| N1 | NewebPay flow: formHtml 存在且 payment/analysisId 完整 | formHtml + payment + analysisId 皆存在 |
| N2 | NewebPay flow: confirm-payment 不應被呼叫（回 404） | Provider guard 使 confirm-payment 回 404 |
| N3 | FormHtml 包含有效 form 標記 | form / action / submit 皆存在 |

### 23.5 Phase 3P-C 已完成項目

- [x] app/page.tsx — 新增 paymentFormHtml state、capture、prop pass
- [x] components/startup-light/PaymentPanel.tsx — formHtml prop、auto-submit、conditional rendering
- [x] scripts/test-payment-panel-newebpay.ps1 — 測試腳本
- [x] docs/payment-integration-plan.md — 本文件更新
- [x] docs/launch-checklist.md — 補上 formHtml handoff 檢查項

### 23.6 尚未做的事

- Production 環境仍不可啟用 PAYMENT_PROVIDER=newebpay（需 Phase 3Q）
- 不執行 prisma db push（不需要）
- 不修改 API routes

## Phase 3P-E — 金流註解與小安全整理（2026-06-13）

### 概述

Phase 3P-E 不修改付款流程或 API route，只補安全註解與小防呆：

1. **app/payment/result/page.tsx** — polling useEffect 前補安全註解，說明 ReturnURL 不可信、本頁不更新付款狀態、付款成功只以 webhook 更新後的 /api/payment-status 結果為準
2. **components/startup-light/PaymentPanel.tsx** — formHtml prop 補安全註解（來源限制、dangerouslySetInnerHTML 理由、script 不執行需手動 submit）
3. **components/startup-light/PaymentPanel.tsx** — useEffect 找不到 form 時補 console.warn，避免靜默失敗
4. **docs/payment-integration-plan.md** — 本文件更新
5. **docs/launch-checklist.md** — 補註解 / safety note 檢查項

### 安全註解重點

| 檔案 | 註解內容 |
|------|----------|
| payment/result/page.tsx | ReturnURL 不可信、payment-status 唯讀、webhook 為唯一付款確認來源 |
| PaymentPanel.tsx interface | formHtml 只應來自 /api/create-payment、dangerouslySetInnerHTML 僅為 submit form 至 MPG、React 不執行 script |
| PaymentPanel.tsx hidden div | formHtml 來源為 server API、內容為靜態 hidden fields、React 已 strip script |
| PaymentPanel.tsx useEffect | 說明手動 submit 原因、hasSubmittedRef 防重複 |

### 防呆變更

- useEffect 中找不到 form 時執行 console.warn("[PaymentPanel] formHtml injected but no <form> found in container")

### Phase 3P-E 不做的事

- 不抽 helper
- 不改 getBaseUrl
- 不改 provider 分支
- 不改付款狀態判定
- 不改 webhook
- 不改 submit-analysis
- 不改 UI 文案
- 不改 API routes


**文件維護者：** ____________________ **最後更新日期：** 2026-06-13


## 22. Phase 3O-B — Payment Status API + Payment Result Page（2026-06-13）

### 22.1 概述

Phase 3O-B 建立 ReturnURL 導回後需要的基礎設施：

1. **GET `/api/payment-status`** — 唯讀付款狀態查詢 API，不回寫 DB
2. **`/payment/result`** — 付款結果頁面，顯示付款狀態並提供繼續流程的按鈕

本階段不正式承接 NewebPay ReturnURL POST，也不改 create-payment / PaymentPanel。正規 formHtml submit 與 ReturnURL 參數帶法留到 Phase 3P。

### 22.2 Payment Status API

**端點：** `GET /api/payment-status?paymentId=xxx`

**行為：**

| 情境 | HTTP 狀態 | 回應 |
|------|-----------|------|
| `paymentId` 未提供 | 400 | `{ error: "缺少付款編號" }` |
| Payment 不存在 | 404 | `{ error: "付款不存在" }` |
| Payment 存在 | 200 | `{ paymentId, status, paidAt, amountTwd, analysisId }` |

**安全限制：**

- 只讀，不可更新 Payment.status
- 不回傳 `providerRawResponse`
- 不回傳 `providerPaymentId`
- 不回傳 webhook raw payload
- 不回傳 TradeInfo / TradeSha / card info / HashKey / HashIV
- 不回傳 amount mismatch / signature 等 webhook 驗證細節

### 22.3 Payment Result Page

**路徑：** `/payment/result?paymentId=xxx&analysisId=xxx（可選）`

**狀態與 UI：**

| 狀態 | UI | 下一步 |
|------|-----|--------|
| **查詢中** | Spinner + 「查詢付款狀態中…」 | 自動 |
| **pending**（輪詢中） | 「付款處理中，請稍候」含 spinner | 每 3 秒輪詢，最多 10 次 |
| **pending**（逾時） | 「付款仍在處理中」+ 重新整理提示 | 回到首頁 |
| **paid** | 「付款成功」+ 付款時間 + 金額 | 「開始填寫後三題」→ 導回 `/?paymentId=xxx&analysisId=yyy` |
| **failed** | 「付款未完成」 | 回到首頁重新建立付款 |
| **expired** | 「付款已逾期」 | 回到首頁 |
| **not_found** | 「找不到付款資訊」 | 回到首頁 |
| **error** | 「發生錯誤」 | 回到首頁 |

**輪詢策略：** 3 秒間隔，最多 10 次（30 秒）。超過後停止輪詢並顯示逾時訊息。

### 22.4 安全設計

| 設計 | 說明 |
|------|------|
| ReturnURL 不可信 | 付款成功只能由 NotifyURL webhook 確認 |
| payment-status 不回寫 DB | 僅查詢，無 side effect |
| 頁面不顯示內部錯誤細節 | amount mismatch / signature 等不暴露給使用者 |
| analysisId 優先使用 API 回傳值 | URL query 的 analysisId 僅作為 fallback |

### 22.5 Phase 3O-B 已完成項目

- [x] `app/api/payment-status/route.ts` — 唯讀付款狀態查詢 API
- [x] `app/payment/result/page.tsx` — 付款結果頁（含 polling 邏輯）
- [x] `scripts/test-payment-status.mjs` — 5 個測試案例
- [x] `scripts/test-payment-status.ps1` — 測試執行腳本
- [x] `docs/payment-integration-plan.md` — 本文件更新
- [x] `docs/launch-checklist.md` — 補上 payment-status / payment-result 檢查項

### 22.6 尚未做的事

- create-payment 尚未切換到 NewebPay（formHtml 產出後自動 submit 到 MPG）
- NewebPay ReturnURL POST 尚未正式承接（ReturnURL 設定與參數帶法）
- PaymentPanel 尚未整合 NewebPay formHtml submit 按鈕
- sandbox / production 真實付款測試（Phase 3P）

---


## 23. Phase 3P-C — PaymentPanel formHtml Handoff（2026-06-13）

### 23.1 概述

Phase 3P-C 讓 PaymentPanel 在收到 create-payment 回應中的 formHtml 時，不再顯示 mock「確認付款」按鈕，而是顯示導向藍新付款頁的狀態訊息，並手動 submit formHtml 裡的 form。

### 23.2 前端變更

**app/page.tsx：**
- 新增 paymentFormHtml state
- handlePaymentClick 在收到 data.formHtml 時寫入 paymentFormHtml
- updateRiskField 重置 paymentFormHtml（避免殘留）
- 將 paymentFormHtml 作為 ormHtml prop 傳給 PaymentPanel

**components/startup-light/PaymentPanel.tsx：**
- 新增 ormHtml?: string | null prop
- 新增 containerRef（注入 formHtml 的容器）和 hasSubmittedRef（防重複 submit）
- useEffect 在 formHtml 存在時：
  - 設定 hasSubmittedRef.current = true（僅一次）
  - 100ms 後在 container 內查詢 <form> 並呼叫 orm.submit()
- 條件渲染：
  - ormHtml 存在 → 顯示「正在前往藍新金流付款頁…」藍色卡片，不顯示 confirm 按鈕
  - ormHtml 不存在 → 維持原有 mock confirm 按鈕
- 隱藏容器 <div ref={containerRef} dangerouslySetInnerHTML={{ __html: formHtml }} className="hidden" />

### 23.3 安全設計

| 措施 | 說明 |
|------|------|
| formHtml 來源 | 只應來自本機 /api/create-payment 回傳 |
| HasSubmittedRef | 防止同一個 formHtml 被 submit 多次 |
| 不呼叫 confirm-payment | NewebPay 流程完全繞過 mock confirm |
| 不更新 Payment.status | 付款確認由 webhook 處理 |
| mock 流程不變 | 無 formHtml 時完全維持既有行為 |

### 23.4 測試

**scripts/test-payment-panel-newebpay.ps1：**

| # | 測試案例 | 預期結果 |
|---|---------|----------|
| M1 | Mock flow: create-payment 回傳不含 formHtml | response.formHtml === undefined |
| M2 | Mock flow: confirm-payment 仍可正常運作 | confirm-payment 回 200 |
| N1 | NewebPay flow: formHtml 存在且 payment/analysisId 完整 | formHtml + payment + analysisId 皆存在 |
| N2 | NewebPay flow: confirm-payment 不應被呼叫（回 404） | Provider guard 使 confirm-payment 回 404 |
| N3 | FormHtml 包含有效 form 標記 | form / action / submit 皆存在 |

### 23.5 Phase 3P-C 已完成項目

- [x] app/page.tsx — 新增 paymentFormHtml state、capture、prop pass
- [x] components/startup-light/PaymentPanel.tsx — formHtml prop、auto-submit、conditional rendering
- [x] scripts/test-payment-panel-newebpay.ps1 — 測試腳本
- [x] docs/payment-integration-plan.md — 本文件更新
- [x] docs/launch-checklist.md — 補上 formHtml handoff 檢查項

### 23.6 尚未做的事

- Production 環境仍不可啟用 PAYMENT_PROVIDER=newebpay（需 Phase 3Q）
- 不執行 prisma db push（不需要）
- 不修改 API routes

## Phase 3P-E — 金流註解與小安全整理（2026-06-13）

### 概述

Phase 3P-E 不修改付款流程或 API route，只補安全註解與小防呆：

1. **app/payment/result/page.tsx** — polling useEffect 前補安全註解，說明 ReturnURL 不可信、本頁不更新付款狀態、付款成功只以 webhook 更新後的 /api/payment-status 結果為準
2. **components/startup-light/PaymentPanel.tsx** — formHtml prop 補安全註解（來源限制、dangerouslySetInnerHTML 理由、script 不執行需手動 submit）
3. **components/startup-light/PaymentPanel.tsx** — useEffect 找不到 form 時補 console.warn，避免靜默失敗
4. **docs/payment-integration-plan.md** — 本文件更新
5. **docs/launch-checklist.md** — 補註解 / safety note 檢查項

### 安全註解重點

| 檔案 | 註解內容 |
|------|----------|
| payment/result/page.tsx | ReturnURL 不可信、payment-status 唯讀、webhook 為唯一付款確認來源 |
| PaymentPanel.tsx interface | formHtml 只應來自 /api/create-payment、dangerouslySetInnerHTML 僅為 submit form 至 MPG、React 不執行 script |
| PaymentPanel.tsx hidden div | formHtml 來源為 server API、內容為靜態 hidden fields、React 已 strip script |
| PaymentPanel.tsx useEffect | 說明手動 submit 原因、hasSubmittedRef 防重複 |

### 防呆變更

- useEffect 中找不到 form 時執行 console.warn("[PaymentPanel] formHtml injected but no <form> found in container")

### Phase 3P-E 不做的事

- 不抽 helper
- 不改 getBaseUrl
- 不改 provider 分支
- 不改付款狀態判定
- 不改 webhook
- 不改 submit-analysis
- 不改 UI 文案
- 不改 API routes


**文件維護者：** ____________________ **最後更新日期：** 2026-06-13


### 22.7 Phase 3O-C — 主頁承接 paymentId / analysisId Query Handoff（2026-06-13）

Phase 3O-C 讓 `app/page.tsx` 在收到 `?paymentId=xxx&analysisId=yyy` URL query 時，透過 `/api/payment-status` 確認付款狀態，安全地顯示後三題表單。

**流程：**

```
使用者從 /payment/result（或 ReturnURL）到達 /?paymentId=xxx&analysisId=yyy
     │
     ├─ urlHandoffStatus = "loading" → 顯示「正在確認付款狀態」
     │
     ├─ GET /api/payment-status?paymentId=xxx
     │
     ├─ status === "paid"
     │   ├─ 設定 paymentData / paymentConfirmed / showFullForm
     │   ├─ analysisId 優先使用 API 回傳值（不信任 URL analysisId）
     │   └─ 顯示 PaidQuestionForm → 使用者填寫後三題 → submit-analysis
     │
     ├─ status === "pending"
     │   ├─ 顯示「付款仍在處理中」+ 連結回 /payment/result
     │   └─ 不顯示 PaidQuestionForm
     │
     ├─ 404
     │   └─ 顯示「找不到付款資訊」
     │
     └─ error
         └─ 顯示「發生錯誤」
```

**安全檢查：**

- 不能只因 URL 有 paymentId/analysisId 就進後三題
- 必須等待 `/api/payment-status` 回傳 `status === "paid"` 才可進入
- 不呼叫 confirm-payment
- 不更新 Payment.status
- 不繞過 submit-analysis 的 `payment.status === paid` 檢查
- analysisId 優先使用 API 回傳值，URL analysisId 僅為 fallback

**Phase 3O-C 已完成項目：**

- [x] `app/page.tsx` — URL query handoff + payment-status API 查詢 + 狀態 UI
- [x] `docs/payment-integration-plan.md` — 本文件更新
- [x] `docs/launch-checklist.md` — 補上 query handoff 檢查項


### 22.8 Phase 3P-B — create-payment NewebPay Provider FormHtml（2026-06-13）

Phase 3P-B 讓 `/api/create-payment` 依 `PAYMENT_PROVIDER` 環境變數選擇 provider。

**Provider 選擇邏輯：**

```
PAYMENT_PROVIDER === "newebpay"
  → getPaymentProvider("newebpay")
  → 回傳包含 formHtml 的回應

PAYMENT_PROVIDER 未設定 或 = "mock"
  → getPaymentProvider("mock")
  → 原有回應格式不變（不含 formHtml）
```

**NewebPay 流程（PAYMENT_PROVIDER=newebpay）：**

1. `recordStore.createPayment()` 建立 Payment + Analysis（自動產生 paymentId）
2. `newebpayProvider.createPayment()` 以 `payment.id` 作為 `merchantOrderNo`
3. 傳入 `notifyUrl` = `${baseUrl}/api/payment-webhook`
4. 傳入 `returnUrl` = `${baseUrl}/payment/result?paymentId=${payment.id}&analysisId=${analysis.id}`
5. 回傳 `{ payment, analysisId, formHtml }`

**baseUrl 推導方式（`getBaseUrl()` 輔助函式）：**

| 優先 | 來源 | 範例值 |
|------|------|--------|
| 1 | `process.env.APP_BASE_URL` | `https://ai-startup-traffic-light.vercel.app` |
| 2 | `process.env.VERCEL_URL`（自動補 https://） | `https://project.vercel.app` |
| 3 | `http://localhost:3000`（fallback） | `http://localhost:3000` |

**安全限制：**

- 不更新 `Payment.status`
- 不呼叫 `confirmPayment`
- 不呼叫 `confirmPaymentByWebhook`
- `formHtml` 不包含 HashKey / HashIV
- 回應不包含 `providerRawResponse`
- mock provider 的回應格式與欄位完全維持不變

**Phase 3P-B 已完成項目：**

- [x] `app/api/create-payment/route.ts` — provider 選擇 + NewebPay flow + baseUrl helper
- [x] `scripts/create-payment-newebpay-test.mjs` — mock/newebpay 流程測試
- [x] `scripts/test-create-payment-newebpay.ps1` — 測試執行腳本
- [x] `docs/payment-integration-plan.md` — 本文件更新
- [x] `docs/launch-checklist.md` — 補上 create-payment provider switch 檢查項


## Phase 3T-A — AI Cost Abuse Guard + 文件更新（2026-06-14）

### NewebPay Sandbox E2E 狀態

NewebPay sandbox E2E 目前 **blocked by external dependency**：

- 原因：藍新會員 / 商店後台需身分證上傳與人工認證，尚未完成
- 影響：無法執行 sandbox 真實付款測試（create-payment → MPG 付款 → NotifyURL callback → 確認 paid）
- 當前狀態：等待藍新人工認證完成後續跑 sandbox E2E
- 不退路：create-payment route 已有 PAYMENT_PROVIDER=newebpay 分支（附 production guard），
  sandbox E2E 通過前不可啟用 production PAYMENT_PROVIDER=newebpay

### Phase 3T-A 已完成項目

- [x] lib/internal-auth.ts — 新增 internal request 驗證輔助模組
- [x] pp/api/analyze-idea/route.ts — 新增 internal-only guard（無 header 回 403）
- [x] pp/api/submit-analysis/route.ts — 傳送 x-internal-secret header 至 analyze-idea
- [x] pp/api/risk-scan/route.ts — 新增 rate limit（30 req / 10 min）
- [x] docs/payment-integration-plan.md — 本文件更新（含 NewebPay blocked 狀態）
- [x] docs/launch-checklist.md — 新增 production blocking gates


## Phase 3W-A — Low-Risk Endpoint Rate Limit 補洞（2026-06-14）

### 概述

Phase 3W-A 對 /api/feedback 與 /api/error-report 加上 memory rate limit，補齊既有 rate limit 風格的防濫用頁面。

### 變更內容

**app/api/feedback/route.ts：**
- 新增 rate limit：30 req / 10 min per IP，用現有 lib/rate-limit.ts
- 429 回傳 error: rate_limited + Retry-After header
- 不改 feedback 資料結構

**app/api/error-report/route.ts：**
- 新增 rate limit：10 req / 10 min per IP，用現有 lib/rate-limit.ts
- 429 回傳 error: rate_limited + Retry-After header
- 保留既有 paymentId unique / MIME / size 檢查
- 不改 Prisma schema
- 不接圖片儲存服務

### Phase 3W-A 已完成項目

- [x] app/api/feedback/route.ts — 新增 rate limit（30 req / 10 min）
- [x] app/api/error-report/route.ts — 新增 rate limit（10 req / 10 min）
- [x] docs/launch-checklist.md — 補上 feedback / error-report rate limit 檢查項
- [x] docs/payment-integration-plan.md — 本文檔更新

---

---
**文件維護者：** ____________________ **最後更新日期：** 2026-06-14
