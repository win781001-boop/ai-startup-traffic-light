# AI創業紅綠燈 上線前測試清單

> 版本：v0.13
> 建立日期：2026-06-09
> 用途：正式上線前人工測試核對，涵蓋 API、防濫用、邊界輸入、UI、金流等面向

---


## 0. 測試指令索引 / Test Command Index

> 本節為 v0.14 新增，對應 phase 3X-B / 3X-C 整理的 npm scripts 分層。
> 實際指令以 package.json scripts 為準。

### 0a. 上線前最小必跑

每次 deployment 前至少執行：

- `npm run build`
- `npm run test:unit` — 190 assertions，純邏輯無需 dev server

### 0b. 本機 mock / DB 類整合測試 (需手動啟動 dev server)

先在本機啟動 dev server（`npm run dev`），確認 .env.local 中有 DATABASE_URL 且 DB 可連線，
再執行以下任一：

- `npm run test:submit-flow` — 測完整 API 提交流程 (含 state transition、rate limit、邊界)
- `npm run test:payment-webhook` — 測 mock webhook dedup / signature / amount
- `npm run test:payment-status` — 測 payment-status 唯讀 API

### 0c. NewebPay 本機整合測試 (腳本自動管理 dev server)

以下腳本會自動 kill 現有 node 行程、以 PAYMENT_PROVIDER=newebpay + 測試 Key 啟動 dev server、執行測試、最後清理。**執行時勿手動啟動 dev server**：

- `npm run test:newebpay:webhook` — 測 NotifyURL webhook route (form-urlencoded callback)
- `npm run test:create-payment:newebpay` — 先試 mock，失敗則以 newebpay 模式重試
- `npm run test:payment-panel:newebpay` — 依序測 mock 與 newebpay 兩種模式

### 0d. 注意事項

- **不存在 `npm run test:integration:local`**。不要把所有 integration tests 硬串在一起，因為部分腳本會自動 kill/start dev server（0c），與需手動啟動 dev server 的腳本（0b）有 server 生命週期衝突，無法安全串接。
- **真實 NewebPay sandbox E2E** 仍需等藍新人工認證後手動執行（含 create-payment → MPG 付款頁 → NotifyURL callback → paid 確認），不在 npm scripts 中。

### 0e. Production 前建議驗證順序

1. `npm run build`
2. `npm run test:unit`
3. 跑本機 mock integration（0b）
4. 跑 NewebPay 本機 integration（0c）
5. 等藍新認證後跑 sandbox E2E
6. production 小額實刷 49 元
7. final payment / security review

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
- [ ] feedback rate limit 超過時回 429
- [ ] error-report rate limit 超過時回 429

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





##### Phase 3P-E 安全註解與防呆

- [ ] payment/result/page.tsx 有 ReturnURL 不可信 / payment-status 唯讀 / webhook 為唯一來源 的註解
- [ ] PaymentPanel.tsx formHtml prop 有來源限制與 dangerouslySetInnerHTML 理由的註解
- [ ] PaymentPanel.tsx useEffect 找不到 form 時有 console.warn（不靜默失敗）
- [ ] PaymentPanel.tsx hidden container 有安全設計的註解
- [ ] docs/payment-integration-plan.md 有 Phase 3P-E 紀錄
- [ ] docs/launch-checklist.md 有本節檢查項
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


---

## 15. Production Blocking Gates

> 以下為強制攔截條件。任一項未通過，不可公開正式對外流量或收款。

- [ ] Sandbox E2E 未跑通，不可啟用 PAYMENT_PROVIDER=newebpay（需包含 create-payment → MPG 付款 → NotifyURL callback → paid 確認）
- [ ] Production 小額實刷未通過，不可公開正式收款（需實際刷 49 元並確認完整流程）
- [ ] AI cost abuse guard 未完成前，不可開放公開流量（含 analyze-idea internal guard、risk-scan rate limit）
- [ ] Serverless-compatible rate limit 核心已完成（lib/rate-limit.ts 支援 Upstash Redis REST），但 production 必須設定 UPSTASH env var 才能跨 serverless instance 生效
  - [ ] production 已設定 UPSTASH_REDIS_REST_URL
  - [ ] production 已設定 UPSTASH_REDIS_REST_TOKEN
  - [ ] local/dev 可不設定（自動使用 memory fallback），但正式上線前必須設定

---


## 16. Production Env Reference (v0.19+)

> 以下為目前 Production 已設定的環境變數整理，供部署、關公測、正式收費時參考。

### 16a. Public Beta ON/OFF

PUBLIC_BETA=true
NEXT_PUBLIC_PUBLIC_BETA=true
NEXT_PUBLIC_BETA_END_DATE=2026-06-21

- PUBLIC_BETA=true：後端 /api/submit-analysis 允許建立 0 元 beta_free 紀錄，跳過付款驗證
- NEXT_PUBLIC_PUBLIC_BETA=true：前端不顯示付款流程，直接進入 6 題表單
- NEXT_PUBLIC_BETA_END_DATE：只作 UI 顯示（「預計公測至 YYYY/MM/DD」），不自動切換金流
- 關閉公測時，須將 PUBLIC_BETA 與 NEXT_PUBLIC_PUBLIC_BETA 改為 false 或移除，並重新部署
- NEXT_PUBLIC_ 變數為 build-time env，修改後不 redeploy 前端不會更新

### 16b. Internal Auth

INTERNAL_API_SECRET=<sensitive>

- Production 必填。/api/submit-analysis 透過 x-internal-secret header 呼叫 /api/analyze-idea
- 若未設定，線上判定會出現 forbidden
- Production 不得設定 ALLOW_INTERNAL_API_BYPASS=true

### 16c. Tavily Search

TAVILY_API_KEY=<sensitive>

- Production 若要啟用真實搜尋輔助市場跡象，必須設定
- 未設定時靜默 fallback，不阻斷判定；AI 僅依賴使用者輸入推估 marketSignals
- 設定後需 Redeploy
- 可用 Tavily 後台 usage / credits 變化確認是否有呼叫


### 16c-1. Tavily Cost Guard (Beta)

```
TAVILY_DAILY_LIMIT=300
PUBLIC_BETA_TAVILY_QUERY_LIMIT=0
```

**TAVILY_DAILY_LIMIT**
- Tavily ??????????????????????
- ????????????AI ?????????? marketSignals
- ?? 300 ?/?
- production ?????memory fallback ? serverless ??????
- ??? Upstash Redis ??? serverless ??????

**PUBLIC_BETA_TAVILY_QUERY_LIMIT**
- Public Beta ???????????? Tavily ??
- ???????? `0`?????? `1`??? 1 ????
- ???????? 3 ????? env ??
- ?????? 3?????????

**Public Beta Rate Limit**
- `/api/submit-analysis` ? Public Beta ????????? rate limit?
  - Beta: **3 ? / 10 ?? / IP**
  - ???**10 ? / 10 ?? / IP**
- Production ???? `UPSTASH_REDIS_REST_URL` ? `UPSTASH_REDIS_REST_TOKEN`?
  ?? memory fallback ? serverless ? instance ???????

**Cost Abuse ??**
- ?? Tavily pay-as-you-go??? free credits ?????
- ? Tavily ???? daily usage
- ? Vercel Logs ?? `[tavily-budget] daily limit reached`
- ??????????? Analysis ???? >30/min?????? Public Beta
- ?????? `PUBLIC_BETA` ? `NEXT_PUBLIC_PUBLIC_BETA` ?? `false` ? Redeploy

### 16d. Redeploy 注意事項

- Vercel Environment Variables 修改後必須 Redeploy
- 尤其是 NEXT_PUBLIC_ 變數（build-time env），不 redeploy 則前端不會更新
- 若同時修改多個 env，建議一次修改後一次 Redeploy

### 16e. 正式收費切換提醒（重要）

公測結束恢復收費時，請注意以下事項：

1. 不要打開 /api/confirm-payment — 此 endpoint 的 production guard 必須保留（回 404）
2. 正式收費應改由 PAYMENT_PROVIDER=newebpay + NewebPay form handoff + NotifyURL webhook + /api/payment-status 流程完成
3. 關閉公測前需確認以下 NewebPay env 已齊全：

PAYMENT_PROVIDER=newebpay
NEWEBPAY_MERCHANT_ID=
NEWEBPAY_HASH_KEY=
NEWEBPAY_HASH_IV=
NEWEBPAY_MPG_URL=
APP_BASE_URL=https://ai-startup-traffic-light.vercel.app

4. 關閉公測步驟建議順序：
   - 先確認 NewebPay sandbox E2E 測試通過
   - 補齊 NewebPay production env vars
   - 將 PUBLIC_BETA 與 NEXT_PUBLIC_PUBLIC_BETA 設為 false
   - 將 PAYMENT_PROVIDER 設為 newebpay
   - Redeploy 並執行小額實刷測試
   - 觀察 /api/payment-webhook 是否正常處理 NotifyURL
**檢查人員簽名：** ____________________ **日期：** ____________________
