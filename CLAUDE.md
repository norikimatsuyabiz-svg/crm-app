# CLAUDE.md — ひとり営業用顧客管理アプリ

## 1. 技術スタック

| 要素 | 選択 | 備考 |
|---|---|---|
| マークアップ | HTML5 | index.html 1枚 |
| スクリプト | Vanilla JavaScript (ES2020) | フレームワークなし |
| スタイル | Tailwind CSS v3 (CDN) + styles.css | カスタムスタイルは styles.css に追記 |
| 永続化 | localStorage | サーバー・外部DB なし |
| ビルド | なし | ブラウザで直接開くだけ |

---

## 2. ディレクトリ構成

```
顧客管理/
├── index.html   # HTML骨格・Tailwind CDN読み込み・app.js/styles.css参照
├── app.js       # 全ロジック（即時実行関数で包む）
├── styles.css   # Tailwindで表現できないカスタムスタイルのみ
├── CLAUDE.md    # このファイル
└── spec.md      # 仕様書
```

### 各ファイルの責務

- **index.html**: `<div id="app">` をルートに持つ静的HTML。タブ・左ペイン・右ペインの空箱を定義。スクリプトは `<body>` 末尾で読み込む。
- **app.js**: データ操作・DOM操作・イベント処理をすべて担う。グローバルスコープを汚染しないよう即時実行関数 `(function() { ... })()` で全体を包む。
- **styles.css**: Tailwindユーティリティで書けないもの（アクセントライン、カスタムスクロールバー等）のみ記述。

---

## 3. コーディング規約

### ビュー・モード切替

- ビュー切替（顧客 / パイプライン）は `data-view` 属性で管理し、`switchView(viewName)` 関数で制御する。
- 右ペインのモード切替（空状態 / 顧客詳細 / 顧客フォーム / 商談フォーム）は `showPane(paneName, payload)` 関数で制御する。
- 表示・非表示は Tailwind の `hidden` クラスを付け外しする（`style.display` は使わない）。

### ID命名規則

| プレフィックス | 対象 |
|---|---|
| `view-*` | タブで切り替わるビュー全体（例: `view-customers`, `view-pipeline`） |
| `pane-*` | 右ペインの各モード（例: `pane-empty`, `pane-customer-detail`, `pane-customer-form`, `pane-deal-form`） |
| `input-*` | フォームの入力要素（例: `input-company`, `input-deal-title`） |
| `btn-*` | ボタン要素（例: `btn-new-customer`, `btn-save-customer`） |

### 関数の長さ

- 1関数は **50行以内** を目安にする。超える場合は責務を分割する。

### 変数宣言

- `const` を優先する。再代入が必要な場合のみ `let` を使う。`var` は使わない。

### グローバル汚染禁止

- `app.js` の全コードを即時実行関数で包む。
  ```js
  (function () {
    'use strict';
    // ここにすべてのコードを書く
  })();
  ```

### コメント方針

- WHYが非自明なもの（制約・回避策・暗黙の前提）にのみ書く。
- 処理内容の説明コメント（「顧客を保存する」等）は書かない。
- セクション区切りとして `// === 顧客CRUD ===` のような見出しコメントは可。

---

## 4. データ構造

### 顧客オブジェクト

```js
{
  id: "c_1700000000000",      // "c_" + Date.now()
  company: "株式会社〇〇",
  contactName: "山田 太郎",
  title: "営業部長",          // 任意
  email: "yamada@example.com",// 任意
  phone: "03-0000-0000",      // 任意
  memo: "メモ本文",           // 任意、複数行
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

### 商談オブジェクト

```js
{
  id: "d_1700000000001",      // "d_" + Date.now()
  customerId: "c_1700000000000", // 顧客の id と紐付け（1対多）
  dealTitle: "サービスA導入提案",
  amount: 500000,             // 整数・円。未入力時は null
  status: "lead",             // "lead" | "proposal" | "won"
  followUpMemo: "メモ本文",   // 任意、複数行
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### localStorage キー

| キー | 型 | 説明 |
|---|---|---|
| `crm-customers` | JSON配列 | 顧客オブジェクトの配列 |
| `crm-deals` | JSON配列 | 商談オブジェクトの配列 |

### 1対多の紐付け

- 商談は `customerId` フィールドで顧客 `id` を参照する（外部キー方式）。
- 顧客削除時は `crm-deals` から `customerId` が一致するものをすべて削除（連鎖削除）。

---

## 5. デザイン規約

### 配色

| 用途 | 値 |
|---|---|
| アクセントカラー | `#c15f3c`（Claudeオレンジ） |
| 背景 | `white` / `gray-50` |
| テキスト（主） | `gray-900` |
| テキスト（副） | `gray-500` |
| ステータス: 見込み (lead) | `gray-100` + `gray-600` テキスト |
| ステータス: 提案 (proposal) | `orange-100` + `orange-700` テキスト |
| ステータス: 成約 (won) | `green-100` + `green-700` テキスト |

### フォント

```css
font-family: "游ゴシック", "Yu Gothic", sans-serif;
```

### レイアウト

- 左ペイン幅: `340px` 固定（`min-width: 340px`）
- 右ペイン: `flex-1`（残り全幅）
- 全体高さ: `100vh`（スクロールは各ペイン内で発生）

### 角丸・影

- 角丸: `rounded-lg`（8px）で統一
- 影: `shadow-sm` を基本。モーダル相当の要素のみ `shadow-md`

### ボタン

- プライマリ: `bg-[#c15f3c] text-white hover:bg-[#a84e2e]`
- セカンダリ: `border border-gray-300 text-gray-700 hover:bg-gray-50`
- 危険系（削除）: `text-red-600 hover:bg-red-50`

### ステータスバッジ

- `<span>` タグで `px-2 py-0.5 rounded text-xs font-medium` を基本スタイルに適用

### 商談カードのアクセントライン

- カード左端に `border-l-[3px]` でステータス色のラインを引く（styles.css または Tailwind の任意値で実装）

---

## 6. ワークフロー

```
変更前
  ↓
1. spec.md で仕様を確認する
2. 変更対象のファイル（index.html / app.js / styles.css）を把握する
3. 影響範囲（他ビュー・他関数）を確認する
  ↓
実装
  ↓
4. ブラウザで index.html を直接開く
5. 対象の操作フローを手動で一通り確認する
   - 顧客の作成・編集・削除
   - 商談の作成・編集・削除・ステータス遷移
   - パイプラインビューの表示と「←」「→」ボタン
6. localStorage の中身をブラウザのDevTools（Application タブ）で確認する
  ↓
動作確認完了
```

---

## 7. やってはいけないこと

| 禁止事項 | 理由 |
|---|---|
| `npm install` / パッケージマネージャの使用 | ビルド環境不要。CDNのみ |
| webpack / Vite 等ビルドツールの導入 | ブラウザで直接開く構成を維持する |
| Node.js / Python 等サーバーサイドコード | 純粋なフロントエンドのみ |
| 外部API呼び出し（fetch, XHR） | オフライン動作・プライバシー保護のため |
| `var` の使用 | `const` / `let` のみ |
| グローバル変数の直接定義 | 即時実行関数の外に `let/const` を書かない |
| jQuery 等の追加ライブラリ読み込み | Vanilla JS + Tailwind CDN のみ |
| `innerHTML` への未サニタイズな文字列代入 | XSS防止。テキスト挿入は `textContent` を使う |
