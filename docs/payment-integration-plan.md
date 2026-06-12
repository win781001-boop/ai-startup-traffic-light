# AI創業紅綠燈 真金流串接設計文件

> 版本：v0.22
> 建立日期：2026-06-09
> 用途：正式金流串接前的完整設計文件，釐清 payment / analysis / webhook / refund / duplicate handling 規則

---

## 1. 目前付款狀態

目前（v0.14）仍是 **mock payment** 階段：

- `create-payment` 不串接真實金流，直接回傳一組 mock paymentId
- `confirm-payment` 使用 mock 確認，不涉及真實付款
- 無 webhook 端點
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

> PaymentWebhookLog model 尚未新增（留到 webhook endpoint phase）。

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
| `app/api/payment-webhook/route.ts` | **新增** — 接收金流 webhook，更新 payment 狀態 |
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

**文件維護者：** ____________________ **最後更新日期：** ____________________
