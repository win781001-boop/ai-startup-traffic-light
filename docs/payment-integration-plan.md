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

> **注意：** 型別中曾定義 ejected_invalid_idea / ejected_low_information / ejected_unsupported，但目前程式碼已使用統一的 
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


---

**文件維護者：** ____________________ **最後更新日期：** 2026-06-12
