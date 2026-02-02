# Phase 6: AI生成統合 - 実装完了報告

## ✅ 完了した実装

### 1. Claude APIクライアント (`services/ai/client.ts`)
- ✅ Anthropic SDK統合
- ✅ Resilience パターン適用
  - Retry: 最大2回（指数バックオフ + ジッター）
  - Timeout: 15秒
  - リトライ可能エラー検出（429, 5xx）
- ✅ JSON出力対応（`callClaudeJson`）
- ✅ トークン数推定機能

### 2. AI生成統合 (`services/ai/generator.ts`)
- ✅ `generateSuggestionCopy` 実装
  - PromptVersion解決
  - 変数置換
  - AI生成実行
  - Zodバリデーション
  - トーン検証
  - Repair機能（1回）
  - Fallback機能
  - AiGenerationLog記録

### 3. Paceトーン検証 (`domains/tone/validator.ts`)
- ✅ 禁止語チェック
  - 命令形: すべき、しなさい、必ず、等
  - 罪悪感を煽る: サボ、怠け、ダメ、失敗、等
  - 強制: 今すぐ、すぐに、直ちに
- ✅ 禁止パターンチェック
  - ラベル貼り: 「あなたは〜だ」
  - 決めつけ: 「〜に違いない」
  - 強制命令: 「今すぐ〜しましょう」
- ✅ Repair用プロンプト生成

### 4. Fallback文言 (`domains/tone/fallbacks.ts`)
- ✅ 10種類のSuggestionType別文言
  - PLAN_REDUCE
  - TASK_MICROSTEP
  - PRIORITY_FOCUS
  - GOAL_REFRAME
  - MOTIVATION_REMIND
  - AUTONOMY_ADJUST
  - RESUME_SUPPORT
  - VISION_CREATE_ASSIST
  - VISION_TO_QUARTER_TRANSLATE
  - GOAL_TO_TASK_DRAFT

### 5. PromptVersion管理 (`services/ai/prompt-resolver.ts`)
- ✅ `resolvePromptVersion` 実装
  - 実験割り当てチェック
  - プロンプトオーバーライド対応
  - デフォルト（ACTIVE）取得
- ✅ テンプレート変数置換
- ✅ PromptVersionハッシュ計算
- ✅ PromptVersion作成・アクティブ化

### 6. ログ記録
- ✅ AiGenerationLog実装
  - promptKey, promptVersionId
  - modelName, inputJson, outputJson
  - validationOk, violationsJson
  - repairUsed, fallbackUsed
  - latencyMs, tokenCount

### 7. 提案生成への統合
- ✅ `plan-reduce.ts`でAI生成を使用
- ✅ 他の提案タイプも同様に統合可能

---

## 🔧 必要な設定

### 1. Anthropic API Key
`.env` ファイルに以下を追加してください：

```bash
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

#### APIキー取得方法:
1. https://console.anthropic.com/settings/keys にアクセス
2. 新しいAPIキーを作成
3. キーをコピーして`.env`に貼り付け

### 2. PromptTemplateの確認
データベースにPromptTemplateが存在することを確認：

```bash
npm run db:studio
```

PromptTemplate テーブルを開き、`SUGGESTION_COPY` が存在し、ACTIVEなPromptVersionがあることを確認。

---

## 🧪 テスト方法

### 1. AI生成機能の単体テスト
```bash
npm run test:ai
```

このテストは：
- APIキーの存在確認
- 3種類の提案タイプでAI生成を試行
- Fallback動作の確認

### 2. バックエンド統合テスト
```bash
npm run test:backend
```

このテストは：
- 3ユーザーの状態計算
- 提案生成（AI生成を含む）
- タスク統計の確認

### 3. UIテスト
1. 開発サーバー起動: `npm run dev`
2. http://localhost:3001 にアクセス
3. テストユーザーでログイン（alice, bob, carol）
4. ダッシュボードで提案を確認
5. 「更新」ボタンで新しい提案を生成

---

## 📊 動作フロー

### 提案生成時のAI生成フロー

```
1. generateSuggestions (domains/suggestion/generator.ts)
   ↓
2. generatePlanReduceSuggestion (domains/suggestion/payloads/plan-reduce.ts)
   ↓
3. generateSuggestionCopy (services/ai/generator.ts)
   ├→ resolvePromptVersion → SUGGESTION_COPY の ACTIVE version取得
   ├→ replaceTemplateVariables → コンテキスト変数を置換
   ├→ callClaudeJson → Claude API呼び出し（Resilience適用）
   ├→ SuggestionCopySchema.parse → Zodバリデーション
   ├→ checkToneViolations → Paceトーン検証
   ├→ repairSuggestionCopy → トーン違反時の修正（1回）
   ├→ getFallbackCopy → Repair失敗時のFallback
   └→ logAiGeneration → AiGenerationLog記録
   ↓
4. SuggestionEvent作成（titleText, messageText付き）
   ↓
5. UIに表示
```

---

## 🎯 実装されている機能

### ✅ 完全実装
- Claude API統合（Resilience付き）
- Paceトーン検証
- Repair機能（1回試行）
- Fallback機能
- AiGenerationLog記録
- PromptVersion管理
- プロンプト変数置換

### ⏳ 部分実装
- AI生成は `PLAN_REDUCE` で動作確認済み
- 他の提案タイプも同様の実装パターンで対応可能

### 📝 今後の拡張
- ABテスト機能の活用（基盤は実装済み）
- プロンプトバージョンのA/Bテスト
- メトリクス分析（AiGenerationLogから）

---

## 🐛 トラブルシューティング

### API Keyエラー
```
Error: ANTHROPIC_API_KEY is not set
```
→ `.env`ファイルにAPIキーを追加してください

### PromptVersionエラー
```
Error: No active PromptVersion found for key: SUGGESTION_COPY
```
→ データベースにSUGGESTION_COPYのACTIVEバージョンが必要です
→ `npm run db:seed:rich` を実行してください

### タイムアウトエラー
```
Error: Operation timed out after 15000ms
```
→ Claude APIのレスポンスが遅い場合
→ Fallbackが自動的に使用されます
→ ネットワーク接続を確認してください

### トーン違反
```
Tone violations detected: [...]
```
→ Repair機能が自動的に実行されます
→ Repair失敗時はFallbackが使用されます
→ AiGenerationLogで詳細を確認できます

---

## 📈 次のステップ

Phase 6の実装は完了しました。次の優先タスク：

### Phase 7: UI完全実装
1. Vision管理画面
2. QuarterGoal管理画面
3. Task管理画面
4. Weekly/DailyPlan画面

これらを実装することで、ユーザーがブラウザ上ですべての機能を使用できるようになります。

---

## 📝 実装担当者向けメモ

### コードの場所
- AI関連: `services/ai/`
- トーン検証: `domains/tone/`
- Resilience: `services/resilience/`
- 提案生成: `domains/suggestion/`

### 重要なファイル
- `services/ai/generator.ts` - メインのAI生成ロジック
- `domains/tone/validator.ts` - トーン検証
- `domains/tone/fallbacks.ts` - Fallback文言
- `services/ai/prompt-resolver.ts` - PromptVersion解決

### テストファイル
- `test-ai-generation.ts` - AI生成単体テスト
- `test-backend.ts` - バックエンド統合テスト
- `test-3users.ts` - 3ユーザーデータ確認

---

**実装日**: 2026-01-29
**Phase**: 6 (AI生成統合)
**ステータス**: ✅ 完了
