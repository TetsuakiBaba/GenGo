# Design Guide

このドキュメントは、Research Metadata Health Check と姉妹サービスで統一した見た目・操作感を保つためのデザイン指針です。各サービスは内容や対象データが異なっても、同じ情報密度、控えめな視覚表現、明確な作業導線を共有します。

## Design Principles

- 研究・業務支援ツールとして、静かで信頼できる印象を優先する。
- 装飾よりも、確認、入力、提出などの作業が迷わず進むことを重視する。
- 1 画面目から実際の作業に入れる構成にする。マーケティング的なランディングページにはしない。
- 色数を抑え、線、余白、タイポグラフィで構造を見せる。
- 各カードは独立した作業単位として扱い、カード内カードは作らない。
- 日本語・英語の切り替えを前提に、文字量が増えても破綻しない余白と折り返しを確保する。

## Visual Tone

全体の印象は「白地、細い罫線、控えめな影、低彩度」です。大学・研究支援・メタデータ確認の文脈に合うよう、華美なグラデーション、装飾的な背景、丸みの強い UI は避けます。

推奨する見え方:

- 明るい白背景
- 黒に近い文字色
- ごく薄いグレーのセクション背景
- 角丸なし、または最小限
- 細い border による区切り
- 小さめの uppercase ラベル
- 落ち着いたカードリスト

避ける見え方:

- 強いブランドカラーで画面全体を染める
- 大きな装飾イラストや抽象背景
- 角丸の強いポップなカード
- カードの中にさらにカードを重ねる
- 見出しやボタンの過度な太字
- 説明文で操作方法を長く案内すること

## Design Tokens

姉妹サービスでも、まずは以下の CSS custom properties を共通の出発点にします。

```css
:root {
  color-scheme: light;
  --page: #ffffff;
  --section: #f9f9f9;
  --surface: #ffffff;
  --ink: #333333;
  --strong: #222222;
  --body: #555555;
  --muted: #888888;
  --hairline: #eeeeee;
  --line: #e8e8e8;
  --form: #dddddd;
  --disabled: #cfcfcf;
  --disabled-bg: #f5f5f5;
  --overlay: rgba(0, 0, 0, 0.8);
  --shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
  --font-ui: "Outfit", "Zen Kaku Gothic New", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Zen Kaku Gothic New", "Helvetica Neue", Arial, sans-serif;
  --font-serif: "Palatino", "Zen Old Mincho", serif;
}
```

### Color Usage

- `--page`: ページ全体の背景。
- `--surface`: カード、フォーム、主要パネルの背景。
- `--section`: 補助パネル、番号、ロック状態、薄い強調背景。
- `--strong`: 主要テキスト、主要ボタン、選択状態。
- `--body`: 説明文、通常テキスト。
- `--muted`: ラベル、補助情報、進捗補足。
- `--hairline`: カードや行の最も薄い区切り。
- `--line`: badge や補助 UI の線。
- `--form`: 入力欄・非アクティブ寄りのコントロール線。

アクセントカラーを追加する場合は、画面全体の 5% 未満に抑えます。サービスごとの識別には、ロゴ、kicker テキスト、ボタン文言、ページタイトルを優先し、背景色で差を作りすぎないようにします。

## Typography

- UI ラベル、ボタン、見出しには `--font-ui` を使う。
- 通常本文には `--font-body` を使う。
- ヒーロー直下の導入文など、少し説明的で落ち着いた文章には `--font-serif` を使える。
- 全体の `letter-spacing` は基本 0。ラベルや小型ボタンのみ `0.08em` から `0.14em` 程度を使う。
- 見出しは太くしすぎず、`font-weight: 400` を基本にする。

代表サイズ:

- `h1`: `clamp(2.25rem, 5vw, 4.8rem)`、line-height `1.04`
- `h2`: `clamp(1.35rem, 2.2vw, 2rem)`、line-height `1.2`
- `h3`: `1rem`
- section label: `0.72rem`
- checklist body: `0.95rem`
- small badge: `0.64rem` から `0.78rem`

## Layout

ページ全体は `.shell` で中央寄せします。

```css
.shell {
  width: min(1120px, calc(100vw - 4rem));
  margin: 0 auto;
  padding: 5.5rem 0 6rem;
}
```

基本構成:

1. Hero: サービス名、短い説明、主要アクション、言語切り替え
2. Primary workflow: 自動確認や最初に行う操作
3. Summary: 進捗や状態の一覧
4. Context panels: モード選択、注意事項、推奨表記など
5. Checklist cards: 作業単位ごとのカード
6. Submission / final action: 提出・コピー・エクスポート
7. Modal: 詳細説明や背景情報

セクション間隔は原則 `1rem` を基準にします。カード内部の余白は `1.5rem` を基準にし、一覧行は `1rem 1.5rem` を使います。

## Hero

Hero はブランドと用途を最初に伝える場所です。ただし、業務ツールなので過度に大きな装飾領域にはしません。

推奨:

- ロゴまたは簡潔なブランドマークを上部中央に置く。
- kicker で組織名やサービス群を示す。
- H1 はサービス名またはサービスの直接的な目的にする。
- intro は 1 段落に収める。
- 詳細説明は inline badge またはモーダルに逃がす。
- 言語切り替えは hero actions 内に置く。

## Cards

カードは作業単位です。カードの見た目は以下を基本にします。

```css
.card,
.submission,
.summary article,
.auto-check,
.notice {
  border: 1px solid var(--hairline);
  border-radius: 0;
  background: var(--surface);
  box-shadow: var(--shadow);
}
```

カードヘッダー:

- 左に `.section-number`
- 中央に `h2` と説明文
- 右に進捗などの status badge
- ヘッダー下に必要があれば link list

チェックリスト行:

- 左に項目文
- 項目文の横に必要な action badge
- 右に状態ボタン群
- 行ごとに `border-bottom` で区切る

カード hover は `translateY(-2px)` 程度に留めます。大きな浮遊感や影の変化は避けます。

## Buttons And Links

主要アクションは黒背景、二次アクションは白背景に黒線を基本にします。

- Primary: 提出、自動チェック、最重要操作。
- Secondary: モーダル表示、補助的な導線。
- State button: 完了、要確認、対象外などの状態変更。
- Action badge: sign in、create account、open profile など、項目に紐づく外部リンク。
- Text link: 補足説明内の参照リンク。

Action badge は、チェック項目の意味を補助する小さなボタンとして使います。

```css
.check-action-badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.55rem;
  border: 1px solid var(--line);
  background: var(--section);
  color: var(--body);
  font-family: var(--font-ui);
  font-size: 0.64rem;
  letter-spacing: 0.08em;
  line-height: 1;
  padding: 0.22rem 0.48rem;
  text-decoration: none;
  text-transform: lowercase;
  white-space: nowrap;
}
```

外部サービスのアクションは、説明文ではなく該当する項目の横に置きます。これにより、ユーザーが「何を確認するか」と「どこで確認するか」を同時に理解できます。

## Forms

フォームは縦方向に読みやすく、入力欄と確認リンクを横並びにします。

- 入力欄は `height: 3rem` 相当を基本にする。
- border は `--form`。
- 角丸は 0。
- ラベルは小さめの uppercase 風 UI 表現にする。
- 入力値から確認 URL を生成できる場合は、右側に `ページを確認` / `Open profile` を出す。
- 無効状態は opacity と disabled cursor で示す。

2 カラムフォームは desktop のみ。mobile では 1 カラムにします。

## Progress And State

状態は `done`、`needs`、`na` のように明確な語彙で統一します。

- Done: 黒背景、白文字。
- Needs: 薄いグレー背景、黒文字。
- Not applicable: disabled に近い薄い表現。

進捗カードは数値を大きく、ラベルを小さく表示します。達成率や件数は、色ではなくサイズと配置で目立たせます。

## Modals

詳細説明や背景情報はモーダルにまとめます。通常画面では、作業に必要な情報だけを表示します。

モーダルの使いどころ:

- サービスの目的や背景
- 参照元
- 評価指標との関係
- 詳細な説明文

通常カード内に長い解説を置きすぎないようにします。

## Language And Copy

日本語と英語の両方で使うことを前提にします。

- UI ラベルは短くする。
- 説明文は 1 段落を短めにする。
- チェック項目は「完了条件」として書く。
- ボタンは動詞から始める。
- 外部サービス名は原則として正式名称を使う。
- 日本語内でも ORCID、Scopus、Web of Science、Google Scholar など固有名詞は英語表記を維持する。

例:

- Good: `ORCIDアカウントを確認した`
- Good: `Scopus Author ProfileでORCID連携を確認した`
- Avoid: `ORCIDを開いて必要に応じてログインして内容を確認してください`

## Responsive Behavior

900px 以下:

- summary、mode-switch、auto-check、notice、field-grid は 1 カラム化する。
- check-row は 1 カラム化する。
- state button は横幅を詰めすぎず、必要なら折り返す。

620px 以下:

- shell の左右余白を `1rem` 程度まで縮める。
- hero は左寄せにする。
- intro は body font に切り替えて読みやすくする。
- field-control は 1 カラムにする。

小画面では、ボタンや badge のテキストが親要素からはみ出さないことを最優先します。

## Accessibility

- 主要セクションには `aria-label` または `aria-labelledby` を付ける。
- 状態ボタン群には項目テキストを使った `aria-label` を付ける。
- disabled の見た目だけでなく、必要に応じて `disabled` または `aria-disabled` を設定する。
- 外部リンクは `target="_blank"` と `rel="noreferrer"` を付ける。
- 色だけで状態を伝えない。文言と配置で意味が分かるようにする。
- モーダルは `role="dialog"`、`aria-modal="true"`、閉じるボタンの `aria-label` を設定する。

## Sister Service Adaptation

姉妹サービスを作るときは、以下だけをサービスごとに変えます。

- logo / brand mark
- kicker
- H1
- intro
- checklist sections
- external action URLs
- submission fields
- modal explanation

変えないもの:

- token names
- card structure
- button hierarchy
- section spacing
- typography rules
- state vocabulary
- responsive breakpoints

## Implementation Checklist

新しい姉妹サービスを公開する前に確認します。

- CSS tokens が共通している。
- `.shell` の幅と上下余白が共通している。
- カードの border、shadow、radius が共通している。
- 各チェックカードは「説明文 + 項目 + 状態ボタン」の構造になっている。
- 外部リンクは、説明文ではなく関連項目の action badge として配置している。
- 主要導線は primary action、補助導線は secondary action になっている。
- モバイルでボタン、badge、入力欄のテキストがはみ出していない。
- 日本語・英語どちらでもレイアウトが破綻しない。
- `node --check app.js` など、該当する構文チェックを通している。

