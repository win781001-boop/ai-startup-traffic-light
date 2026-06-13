# AI創業紅綠燈 上線前測試清單

> 版本：v0.13
> 建立日期：2026-06-09
> 用途：正式上線前人工測試核對，涵蓋 API、防濫用、邊界輸入、UI、金流等面向

---

## 1. 基本環境檢查

- [ ] `git status` clean
- [ ] `npm run build` 通過
- [ ] Vercel production deployment 正常
- [ ] 環境變數正確
  - [ ] `OPENAI_BASE_URL`
  - [ ] `OPENAI_MODEL`
  - [ ] `OPENAI_API_KEY`
  - [ ] `DATABASE_URL`

---

## 2. 本機 API 測試

- [ ] `npm run dev` 可正常啟動
- [ ] 執行 `scripts/test-submit-flow.ps1` 全部通過
- [ ] 預設測試不應呼叫 DeepSeek
- [ ] 11 passed / 0 failed / 2 skipped 為目前基準
- [ ] 不要在未經確認時加 `-IncludeAiCostTests`

---

## 3. 正常使用者流程測試

- [ ] 正常商業點子可以通過 precheck
- [ ] mock payment 可以建立 paymentId
- [ ] 後三題可以提交
- [ ] 成功 completed 後顯示紅 / 黃 / 綠
- [ ] 顯示 judgmentId
- [ ] 顯示 judgmentTime
- [ ] 顯示 version
- [ ] 顯示 answer summary
- [ ] 顯示 market signs
- [ ] 顯示 judgment summary
- [ ] 顯示 biggest risk
- [ ] 顯示下載 HTML 報告
- [ ] 顯示 feedback 按鈕

---

## 4. needs_revision 測試

- [ ] 低資訊輸入回 needs_revision
- [ ] 非商業點子回 needs_revision 或被 precheck 擋下
- [ ] needs_revision 不顯示紅黃綠
- [ ] needs_revision 不顯示 judgmentId
- [ ] needs_revision 不顯示下載報告
- [ ] needs_revision 不顯示 feedback
- [ ] needs_revision 可保留付款資格
- [ ] 最多 3 次修改
- [ ] 超過後回 attempts_exhausted

---

## 5. system_error 測試

- [ ] 系統錯誤不應扣 revision attempt
- [ ] 系統錯誤不應消耗付款資格
- [ ] 系統錯誤不應產生正式判定
- [ ] 系統錯誤不應顯示下載報告
- [ ] 系統錯誤需要保留 submission / analysis record 供追查

---

## 6. 防濫用測試

- [ ] repeated confirm 同一 payment 應被拒絕
- [ ] duplicate submit 應被拒絕
- [ ] completed 後不可再次 submit
- [ ] create-payment rate limit 超過時回 429
- [ ] submit-analysis rate limit 超過時回 429
- [ ] 429 回傳 `error: rate_limited`
- [ ] 429 有 `Retry-After` header
- [ ] confirm-payment rate limit 超過時回 429
- [ ] confirm-payment 429 有 Retry-After header

---

## 7. 邊界輸入測試

- [ ] 翻譯任務應被擋
- [ ] 翻譯產品點子應允許
- [ ] 股票查詢應被擋
- [ ] 股票工具產品點子應允許
- [ ] 數學題應被擋
- [ ] 數學工具產品點子應允許
- [ ] 文案代寫任務應被擋
- [ ] 文案工具產品點子應允許
- [ ] 新聞查詢應被擋
- [ ] 新聞摘要產品點子應允許
- [ ] 洗評價 / 灰產 / 違法項目應被拒絕或 needs_revision
- [ ] 高風險產業應有風險提示

---

## 8. 手機版 / UI 測試

- [ ] 手機寬度表單正常
- [ ] 按鈕不溢出
- [ ] 結果區塊可讀
- [ ] 下載按鈕可點
- [ ] feedback 按鈕可點
- [ ] 政策頁連結可點
- [ ] 長文字不爆版

---

## 9. 下載報告測試

- [ ] completed 後可下載 HTML
- [ ] HTML 報告包含 judgmentId
- [ ] HTML 報告包含判定時間
- [ ] HTML 報告包含版本
- [ ] HTML 報告可離線打開
- [ ] needs_revision 不提供下載

---

## 10. Feedback 測試

- [ ] completed 後可送 feedback
- [ ] feedback 寫入 Neon Feedback table
- [ ] needs_revision 不顯示 feedback
- [ ] duplicate feedback 行為需確認

---

## 11. 政策頁與付款前文案

- [ ] 服務條款可開啟
- [ ] 隱私權政策可開啟
- [ ] 退款政策可開啟
- [ ] 付款前文案清楚說明這是一次性 AI 創業點子判定
- [ ] 清楚說明不是商業顧問
- [ ] 清楚說明不保證創業成功
- [ ] 清楚說明亂填 / 非創業點子不保證退款
- [ ] 正式客服信箱尚未設定前不可正式上線

---

## 12. 真金流前檢查

- [ ] 選定金流服務
- [ ] paymentId 與真實金流訂單號對應
- [ ] 付款成功才允許 submit-analysis
- [ ] 付款失敗不可 submit-analysis
- [ ] webhook 防重複（dedupeKey + 重複回 200）
- [ ] webhook 紀錄付款狀態（PaymentWebhookLog + Payment.status 更新）
- [ ] webhook production guard 正確（NODE_ENV=production 時回 404，不處理 payload）
- [ ] 重複付款處理
- [ ] 退款處理流程
- [ ] confirm-payment endpoint 有 production guard（NODE_ENV=production 時回 404）
- [ ] confirm-payment endpoint 有 provider guard（非 mock provider 時回 404）
- [ ] confirm-payment endpoint 有 rate limit（10 req / 10 min）
- [ ] 真金流 webhook 透過 PaymentProvider.verifyCallback() 驗證簽章
- [ ] 真金流 webhook 驗證付款金額與 Payment.amountTwd 相符
- [ ] 真金流 webhook 驗證 providerPaymentId 可對應到內部 paymentId
- [ ] 真金流 webhook idempotency（dedupeKey 防重複處理）
- [ ] pending payment 過期（expired）與失敗（failed）處理規則已定義
- [ ] create-payment 重複訂單（idempotency）策略已決定
- [ ] PaymentProvider 支援 formHtml / notifyUrl / returnUrl 等正式金流欄位
- [ ] ErrorReport / refund / payment incident 流程已定義



- [ ] 金流測試環境通過
- [ ] 金流正式環境通過

---

## 13. 上線前不得完成前就做的事

以下事項不在 v0.x 範圍，上線前不應提前進行：

- [ ] 不做會員系統
- [ ] 不做後台管理
- [ ] 不做結果查詢頁
- [ ] 不做課程 funnel
- [ ] 不做訂閱制
- [ ] 不做複雜 SEO
- [ ] 不做顧問服務包裝

---

## 14. 最終上線判定

> 以下全數通過後方可正式上線。

- [ ] 本機 build 通過
- [ ] 本機 API 測試通過
- [ ] Vercel production 測試通過
- [ ] 正常 completed 測試通過
- [ ] needs_revision 測試通過
- [ ] system_error 處理確認
- [ ] rate limit 測試通過
- [ ] 手機版測試通過
- [ ] 政策頁確認
- [ ] 客服信箱確認
- [ ] 金流測試通過
- [ ] 退款流程確認

---

**檢查人員簽名：** ____________________ **日期：** ____________________
