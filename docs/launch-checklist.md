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

##### 藍新 NewebPay 專用檢查

- [ ] PAYMENT_PROVIDER=newebpay 已設定
- [ ] NEWEBPAY_MERCHANT_ID 已設定且正確
- [ ] NEWEBPAY_HASH_KEY / NEWEBPAY_HASH_IV 已設定且未外洩
- [ ] NEWEBPAY_MPG_URL 指向正確環境（測試或正式）
- [ ] NotifyURL 可由藍新伺服器正確存取（非 localhost）
- [ ] ReturnURL / ClientBackURL 不作為付款成功依據
- [ ] TradeInfo / TradeSha 驗證通過才改 paid
- [ ] Amt 與 Payment.amountTwd 完全一致才可改 paid
- [ ] MerchantOrderNo 可正確對應內部 paymentId
- [ ] TradeNo 有保存為 providerPaymentId
- [ ] webhook / notify idempotency 測試通過
- [ ] 重複 notify 不會重複處理（dedupeKey 正確）
- [ ] failed / expired 狀態處理規則已確認
- [ ] sandbox 測試通過：付款成功／失敗／重複通知／金額不符／訂單不存在
- [ ] production 前 confirm-payment 仍為 404
- [ ] mock webhook production guard 仍有效
- [ ] NewebPay provider skeleton 不可在 production 被誤認為正式完成
- [ ] verifyCallback 未完成前不可讓 newebpay notify 改 Payment.status
- [ ] createPayment 未完成前不可開啟 PAYMENT_PROVIDER=newebpay production
- [ ] NewebPay crypto helper encrypt/decrypt roundtrip 通過
- [ ] TradeSha deterministic 測試通過
- [ ] buildMpgFormFields 加密後 TradeInfo 不包含明文 MerchantOrderNo / MerchantID
- [ ] HashKey / HashIV 不出現在 log 或 commit
- [ ] NewebPay provider createPayment 測試通過（env 檢查、formHtml 安全、raw 安全）
- [ ] formHtml 不包含 HashKey / HashIV
- [ ] TradeInfo 不洩漏明文 MerchantOrderNo
- [ ] verifyCallback invalid signature 測試通過
- [ ] verifyCallback decrypt failed 測試通過
- [ ] verifyCallback JSON parse 測試通過
- [ ] verifyCallback URL-encoded parse 測試通過
- [ ] verifyCallback amount parse 測試通過
- [ ] verifyCallback status success / failed 判定測試通過
- [ ] verifyCallback Card6No / Card4No 不保存於 sanitizedPayload
- [ ] verifyCallback HashKey / HashIV 不洩漏於 raw
- [ ] NewebPay webhook route tests（35 assertions）全部通過
- [ ] mock webhook production guard 在 NODE_ENV=production 時仍回 404
- [ ] PAYMENT_PROVIDER=newebpay 時 production 可處理 NotifyURL
- [ ] NewebPay form-urlencoded callback parse 測試通過
- [ ] NewebPay invalid signature → processed:false
- [ ] NewebPay failed status → processed:false
- [ ] NewebPay amount mismatch → processed:false
- [ ] NewebPay payment_not_found → processed:false
- [ ] NewebPay duplicate callback → duplicated:true，不重複更新
- [ ] Route 層不自行解密/驗簽，全部透過 provider.verifyCallback()
- [ ] paid:false 不更新 Payment.status
- [ ] paid:true 後必須走 confirmPaymentByWebhook()，不可直接 update
- [ ] ReturnURL 不可做為付款確認依據
- [ ] create-payment 尚未切換 PAYMENT_PROVIDER=newebpay
- [ ] payment-status API 唯讀，不可更新 Payment.status
- [ ] payment-status API 缺少 paymentId 時回 400
- [ ] payment-status API payment 不存在時回 404
- [ ] payment-status API 不回傳 providerRawResponse / webhook payload
- [ ] payment-status API pending / paid 狀態正確
- [ ] /payment/result 頁面在 paid 時顯示「開始填寫後三題」按鈕
- [ ] /payment/result 頁面 polling 3 秒一次，最多 10 次
- [ ] /payment/result 頁面逾時後停止輪詢並顯示處理中訊息
- [ ] /payment/result 頁面不暴露 amount mismatch / signature 等內部細節
- [ ] /?paymentId=&analysisId= query handoff 測試通過
- [ ] paid paymentId 才能進 PaidQuestionForm
- [ ] pending paymentId 顯示等待提示，不進後三題
- [ ] invalid paymentId 顯示錯誤，不進後三題
- [ ] URL analysisId 不可信，優先使用 API 回傳值
- [ ] 主頁不呼叫 confirm-payment
- [ ] 主頁不更新 Payment.status
- [ ] submit-analysis 的 payment.status === paid 檢查未被繞過
- [ ] create-payment PAYMENT_PROVIDER=mock 時回應不含 formHtml（既有流程不變）
- [ ] create-payment PAYMENT_PROVIDER=newebpay 時回應含 formHtml
- [ ] formHtml 含 MerchantOrderNo 對應 paymentId
- [x] formHtml ReturnURL 指向 /payment/result?paymentId=&analysisId=
- [x] formHtml NotifyURL 指向 /api/payment-webhook
- [x] formHtml 不含 HashKey / HashIV
- [x] create-payment 回應不含 providerRawResponse
- [x] create-payment 不更新 Payment.status
- [x] create-payment 不呼叫 confirmPayment / webhook
- [x] create-payment 尚未切換 NewebPay（Phase 3P-C 處理 formHtml submit + PaymentPanel）- [ ] PaymentPanel 在無 formHtml 時仍顯示 mock confirm 按鈕
- [ ] PaymentPanel 在有 formHtml 時顯示藍新導流訊息，不顯示 confirm 按鈕
- [ ] PaymentPanel 在有 formHtml 時不呼叫 /api/confirm-payment
- [ ] PaymentPanel 在有 formHtml 時嘗試 submit form
- [ ] hasSubmittedRef 防止 form 被重複 submit
- [ ] 找不到 form 時不會卡死
- [ ] formHtml 來源只應是 /api/create-payment 回傳
- [ ] ReturnURL 仍只導回 /payment/result，付款成功與否由 webhook 判定
- [ ] mock create-payment / confirm-payment 流程未被破壞
- [ ] 無 formHtml 時 mock 流程與之前完全相同
- [ ] ./scripts/test-payment-panel-newebpay.ps1 通過（mock + newebpay 模式）


- [ ] ReturnURL 尚未正式承接（Prototype 3P 處理）
- [ ] verifyCallback 未完成前不可開 production
- [ ] app/api/create-payment 尚未切換 PAYMENT_PROVIDER=newebpay




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





