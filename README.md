# 每週計劃 PWA

## 部署步驟（30 分鐘搞掂）

### 步驟 1：開 GitHub repo
1. 去 [github.com/new](https://github.com/new)
2. Repository name 填：`my-planner`（或者你鍾意嘅名）
3. 揀 **Public**（免費 Vercel 要 public）
4. 撳 **Create repository**

### 步驟 2：上傳啲檔案
喺 GitHub 個 repo 頁面：
1. 撳 **uploading an existing file** 連結
2. 將呢個 folder 入面**所有檔案**（除咗 `node_modules` 同 `dist`）拖入去
3. scroll 落底，撳 **Commit changes**

### 步驟 3：connect Vercel
1. 去 [vercel.com](https://vercel.com)，用 GitHub 登入
2. 撳 **Add New** → **Project**
3. 揀你頭先個 `my-planner` repo，撳 **Import**
4. 唔使改任何 setting（Vercel 會自己認到 Vite）
5. 撳 **Deploy**

### 步驟 4：等 1-2 分鐘
Vercel 自動 build 同 deploy，完成後會畀你個網址例如：
```
https://my-planner-abc.vercel.app
```

### 步驟 5：手機加到主畫面

**iPhone (Safari)：**
1. 用 Safari 打開個網址
2. 撳底部「分享」掣
3. 揀「加到主畫面」
4. 個 app icon 會出現喺主畫面

**Android (Chrome)：**
1. Chrome 打開個網址
2. 撳右上角 ⋮ 三點 menu
3. 揀「安裝應用程式」或「新增至主畫面」

完成！而家你有一個真正屬於自己嘅 app。

## 之後想改 code？

直接喺 GitHub 改檔案，Vercel 會自動重新 deploy，幾分鐘後你嘅 app 就會更新。

## 想換 app 名 / icon？

- App 名：改 `public/manifest.json` 嘅 `name` 同 `short_name`
- Icon：用 [favicon.io](https://favicon.io) 整新 icon，replace `public/icon-192.png` 同 `public/icon-512.png`
