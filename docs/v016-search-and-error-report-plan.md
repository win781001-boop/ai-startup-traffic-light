# v0.16 搜尋輔助判定與錯誤回報機制規劃

> 版本：v0.16（規劃文件）
> 建立日期：2026-06-09
> 用途：搜尋輔助判定（市場跡象快查）與使用者錯誤回報機制的設計規劃
> 狀態：僅規劃，尚未實作

---

## 1. 產品定位不可變

AI創業紅綠燈的核心定位是「**用低成本先判斷方向，可能幫你省下幾週時間與幾萬元試錯成本。**」

以下原則不可變：

- 這是一個**一次性 AI 創業點子判定**，不是商業顧問
- **不保證創業成功**，判定結果僅供參考
- 輸出是紅黃綠燈 + 簡要判斷，不是完整創業計畫
- **亂填、非創業點子不保證退款**
- 不做會員、不做訂閱、不做課程 funnel、不做後台
- 維持 6 題表單（前 3 題 precheck + 後 3 題付費後補充）
- 每題 10～100 字限制不變

---

## 2. 前台不可揭露搜尋流程

使用者面向的 loading 狀態**只能顯示**：

> 「系統正在判定中，請稍候。」

**不可顯示**：

- 「正在搜尋市場資訊…」
- 「正在分析競品…」
- 「正在連網查詢…」
- 任何與搜尋、連網、爬蟲相關的文字
- 進度條、百分比、步驟編號

原因是：
1. 搜尋只是內部輔助工具，不是產品功能
2. 揭露搜尋細節會讓使用者誤解系統在做「市場調查」
3. 與「一次性快速判定」的定位衝突
4. 搜尋失敗時（timeout / API 錯誤），前台不需要也無法解釋

---

## 3. Loading 規範

| 階段 | 前台顯示文字 | 備註 |
|------|------------|------|
| 提交後三題，開始判定 | 「系統判定中，請勿關閉頁面」 | 按鈕 disabled + Spinner |
| 正在搜尋市場跡象（內部） | （不揭露） | 前台同一個 loading |
| 正在產出判定結果（內部） | （不揭露） | 前台同一個 loading |
| 搜尋失敗 / timeout | （不揭露，繼續判定流程） | 降級處理，不通知使用者 |

---

## 4. 搜尋輔助判定 v1 規格

### 4.1 目的

在 submit-analysis 流程中，於 LLM 產生判定前，**內部**查詢市場相關資訊，作為 LLM 的輔助 context，讓判定更貼近真實市場情況。

### 4.2 搜尋服務選定：Tavily Search

使用 Tavily Search API 作為 v1 搜尋服務。

- Tavily 提供結構化的搜尋結果（title / url / snippet）
- 支援 basic search 與 advanced search

### 4.3 Tavily basic search 限制

| 項目 | 限制 |
|------|------|
| API 類型 | **basic search**（不使用 advanced search） |
| 不抓全文 | 只取 snippet，不設定 `include_answer`、不抓取頁面全文 |
| 每次最多結果 | **3 筆** |
| snippet 長度 | **160～200 字**（Tavily 預設約 100 字，可調參數） |
| 每份報告搜尋次數 | **最多 3 次** |

### 4.4 不使用 advanced search 的原因

- advanced search 會抓取頁面全文，增加 API 成本與 latency
- v1 只需要 snippet 等級的市場跡象，不需要深度分析
- basic search 已足夠提供市場方向參考

### 4.5 搜尋 query 由後端動態產生

- query 由後端根據使用者輸入的點子內容動態產生
- 例如：使用者寫「AI 食譜產生器」，後端產生 `"AI recipe generator market"`, `"meal planning app trends 2026"` 等
- query 不可包含使用者個資
- query 不顯示給使用者

### 4.6 搜尋結果只作內部輔助

- 搜尋結果（title / url / snippet）只作為 LLM 的輔助 context
- 不顯示給前端使用者
- 不儲存完整搜尋結果（見儲存規則）
- 使用者在任何環節都看不到搜尋過程或結果

---

## 5. 搜尋失敗處理

| 情境 | 處理方式 |
|------|----------|
| Tavily API timeout | 跳過搜尋，繼續判定流程 |
| Tavily API 回傳錯誤 | 跳過搜尋，繼續判定流程 |
| 單次搜尋 timeout（> 5 秒） | 跳過該次搜尋 |
| 所有搜尋皆失敗 | 不帶搜尋 context，LLM 僅依使用者輸入判定 |
| 部分搜尋成功 | 僅使用成功結果 |

**核心原則：搜尋失敗不阻斷判定。**

使用者不應因為搜尋失敗而看到 system_error 或 needs_revision。判定流程必須在搜尋失敗時正常降級完成。

### 5.1 Timeout 規格

| 層級 | Timeout | 說明 |
|------|---------|------|
| 單次 Tavily API 呼叫 | 5 秒 | 超過則跳過該次搜尋 |
| 總搜尋階段 | 15 秒 | 所有搜尋合計超過 15 秒則中斷搜尋階段 |

---

## 6. 搜尋資料精簡儲存規則

為避免資料膨脹與儲存成本，搜尋結果的儲存規則如下：

- 不建立獨立搜尋記錄表
- 搜尋結果只在 analysis 階段以 context 形式傳入 LLM
- 不持久化儲存搜尋結果
- 如果未來需要除錯，可在 log 層級保留（不納入 application data）
- analysis record 中不包含搜尋結果欄位

---

## 7. 錯誤回報機制

### 7.1 錯誤回報不是退款申請

- 錯誤回報的用途是讓使用者回報判定結果不準確、系統錯誤或內容問題
- 錯誤回報**不等於退款申請**，退款依退款政策與客服流程處理
- 錯誤回報表單中不提供退款選項

### 7.2 每筆付款只能回報一次

- 一筆 paymentId（一筆 completed 報告）只能提交一次錯誤回報
- 重複提交應被拒絕（回傳錯誤訊息）
- needs_revision / attempts_exhausted 的付款不提供錯誤回報

### 7.3 錯誤原因選項

使用下拉選單或 radio group，選項如下：

| 選項 | 說明 |
|------|------|
| 判定結果不準確 | 紅黃綠燈與預期不符 |
| 市場資訊過時或不符 | 搜尋結果或市場判斷有誤 |
| 系統錯誤 | 過程中發生異常（顯示錯誤畫面時可預先勾選） |
| 內容誤判 | 系統誤解了點子內容 |
| 其他 | 以上皆非 |

### 7.4 欄位限制

| 欄位 | 類型 | 限制 |
|------|------|------|
| 錯誤原因（reason） | 下拉選單（必填） | 從選項中擇一 |
| 補充說明（description） | textarea（選填） | 最多 500 字 |
| 截圖（screenshot） | 不提供上傳 | v1 不支援檔案上傳 |
| 聯絡信箱（email） | 文字（必填） | 最多 200 字，基本格式驗證 |

### 7.5 錯誤回報文案

提交按鈕文案：

> 「送出回報」

提交成功提示：

> 「回報已送出，感謝你的協助。」

重複提交錯誤：

> 「本次判定已回報過，無需重複提交。」

### 7.6 ErrorReport 資料表草案

> 以下為 Prisma schema 草案，僅供未來參考，**本次不新增**。

```prisma
model ErrorReport {
  id            String   @id @default(cuid())
  paymentId     String   @unique
  analysisId    String
  reason        String   // 錯誤原因選項
  description   String?  // 補充說明（最多 500 字）
  email         String   // 聯絡信箱
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([paymentId])
  @@index([createdAt])
}
```

說明：
- `paymentId` 設為 `@unique`，確保每筆付款只能回報一次
- `analysisId` 用於關聯到 analysis 記錄（非 FK，避免 schema 耦合）
- `reason` 儲存選項的 key 值

---

## 8. 錯誤回報與現有狀態規則的關係

| 情境 | 可回報？ | 說明 |
|------|---------|------|
| completed | 可 | 正常完成的報告可回報 |
| needs_revision | 不可 | 尚未產生正式報告，無需回報 |
| attempts_exhausted | 不可 | 已達次數上限，不提供回報 |
| system_error | 可 | 系統錯誤時可回報（前端可依狀態預先填入原因） |
| 已回報過 | 不可 | 同 payment 不可重複回報 |

**所有現有狀態規則不可破壞：**

- completed 後的 duplicate submit 仍應被拒絕（409）
- needs_revision 仍不消耗付款資格
- system_error 仍不扣 revision attempt
- rate limit 規則不變
- 政策頁內容不變

---

## 9. payment / analysis 狀態不可變

錯誤回報功能**不修改** payment 或 analysis 的狀態：

- payment 狀態：pending / paid / failed / expired / refunded / used
- analysis 狀態：pending / processing / completed / needs_revision / failed_system_error / attempts_exhausted
- 錯誤回報只新增 ErrorReport 記錄，不影響上述狀態
- 回報後不改變 completed 報告的顯示內容

---

## 10. 未來實作順序

以下為 v0.16 的建議實作順序：

1. **後端：Tavily 搜尋整合**
   - 在 submit-analysis 流程中加入 Tavily basic search
   - 動態產生搜尋 query
   - 搜尋結果作為 LLM context
   - 搜尋失敗降級處理
   - Timeout 實作

2. **後端：錯誤回報 API**
   - 新增 `POST /api/error-report` 路由
   - 驗證 paymentId / analysisId
   - 檢查重複回報
   - 寫入 ErrorReport 記錄

3. **前端：搜尋流程（無揭露）**
   - 維持現有 loading 畫面
   - 無 UI 變更

4. **前端：錯誤回報表單**
   - 在 completed 結果區塊加入「回報問題」按鈕
   - 彈出表單（原因下拉 + email + 補充說明）
   - 表單驗證與提交
   - 成功 / 失敗提示

---

## 11. 本階段不要做的事

- 不接 Tavily（本文件僅規劃，不實作 API 串接）
- 不新增 ErrorReport 資料表
- 不做前端錯誤回報表單
- 不修改 loading 文字
- 不修改 submit-analysis route
- 不修改 Prisma schema
- 不修改 AI prompt
- 不新增連網功能
- 不做全文爬取
- 不做進階搜尋
- 不改變紅黃綠燈判定邏輯
- 不改變 payment / analysis 狀態規則
- 不改變 rate limit
- 不改變 UI
- 不改變政策頁

---

## 12. 搜尋輔助判定 v1 流程圖（文字）

```
使用者提交後三題
       │
       ▼
驗證 payment 狀態（paid / used）
       │
       ▼
analysis 狀態 → processing
       │
       ├── 產生搜尋 query（後端）
       │       │
       │       ▼
       │   Tavily basic search × 最多 3 次（每次 ≤ 5 秒）
       │       │
       │       ├── 成功 → 取得 title / url / snippet（最多 3 筆）
       │       │
       │       └── 失敗 / timeout → 跳過，不中斷流程
       │
       ▼
將搜尋結果（如有）作為輔助 context 傳入 LLM
       │
       ▼
LLM 產生判定（紅黃綠燈）
       │
       ▼
analysis 狀態 → completed（或 needs_revision / system_error）
       │
       ▼
回傳結果給前台
```

---

## 13. 錯誤回報流程圖（文字）

```
使用者在 completed 結果區塊
       │
       ▼
點擊「回報問題」按鈕
       │
       ▼
彈出錯誤回報表單
  - 錯誤原因（下拉必填）
  - 聯絡信箱（必填）
  - 補充說明（選填，最多 500 字）
       │
       ▼
提交 → POST /api/error-report
       │
       ├── 同一 payment 已回報過 → 拒絕（錯誤訊息）
       │
       ├── 驗證失敗（信箱格式 / 必填遺漏）→ 前端提示
       │
       └── 成功 → 寫入 ErrorReport → 顯示「回報已送出」
```

---

**文件維護者：** ____________________ **最後更新日期：** ____________________
