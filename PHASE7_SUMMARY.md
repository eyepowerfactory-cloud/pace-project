# Phase 7 完了サマリー

実装日: 2026-01-29

## 実装内容

Phase 7では、**AI生成 + PromptVersion + A/Bテスト**を実装しました。提案文言をAIで生成し、Paceトーンを自動検証、違反時は自動修正（Repair）、失敗時はFallback文言を使用する仕組みが完成しました。

## 実装統計

### コード量

| カテゴリ | ファイル数 | 行数 |
|---------|-----------|------|
| **Paceトーン検証** | 2 | 230行 |
| **A/Bテスト** | 1 | 172行 |
| **PromptVersion管理** | 1 | 203行 |
| **AI生成統合** | 1 | 301行 |
| **管理者アクション** | 2 | 434行 |
| **Phase 7合計** | **7** | **1,340行** |
| **プロジェクト全体** | **39ファイル** | **6,018行** |

## 主要機能

### 1. Paceトーン検証

**目的:** AI生成文言がPaceトーン原則に従っているかチェック

**Paceトーン原則:**
- ✅ 命令形禁止（「〜すべき」「〜しなさい」は使用しない）
- ✅ 仮説提示（「〜かもしれません」「〜の可能性があります」）
- ✅ 許可形式（「〜してみませんか？」「〜することができます」）
- ✅ 罪悪感を煽らない（「サボ」「怠け」「ダメ」は禁止）
- ✅ ラベル貼り禁止（「あなたは〜だ」という断定は避ける）

**禁止語リスト:**
```typescript
const FORBIDDEN_WORDS = [
  'すべき', 'しなさい', 'しなければならない',
  'サボ', '怠け', 'ダメ', '失敗',
  '今すぐ', 'すぐに', '絶対',
];
```

**禁止パターン:**
```typescript
const FORBIDDEN_PATTERNS = [
  /あなたは.{0,20}(だ|です|ですね)/,  // 断定ラベル
  /に違いない/,                        // 決めつけ
  /今すぐ.{0,10}しましょう$/,         // 強制命令
];
```

**実装ファイル:** `domains/tone/validator.ts` (144行)

### 2. AI生成統合（Repair + Fallback + Logging）

**フロー:**

```typescript
1. PromptVersion解決（実験割り当てチェック）
   ↓
2. AI生成（Claude API）
   ↓
3. トーン検証
   ├─ 違反なし → 成功ログ → 完了
   └─ 違反あり → Repair試行
                  ├─ 成功 → 成功ログ（repairUsed=true）
                  └─ 失敗 → Fallback文言 → ログ（fallbackUsed=true）
```

**コード例:**

```typescript
// AI生成
const copy = await generateSuggestionCopy(userId, 'PLAN_REDUCE', {
  stateType: 'OVERLOAD',
  stateScore: 65,
  taskCount: 15,
  candidatesCount: 5,
});

// 結果
// {
//   title: 'タスクを減らしてみませんか？',
//   message: '今週は15個のタスクがあります。5個を来週に回すことで、負荷を軽減できるかもしれません。'
// }
```

**実装ファイル:** `services/ai/generator.ts` (301行)

### 3. Repair（トーン違反の自動修正）

**目的:** トーン違反を検出した場合、AIで自動修正（1回まで）

**修正プロンプト例:**

```
以下のトーン違反を修正してください：

- 禁止語「すべき」が含まれています
- 禁止パターン「今すぐ〜しましょう」に該当します

Paceトーン原則：
- 命令形禁止
- 仮説提示
- 許可形式
...

修正後のJSONを出力してください。
```

**実装:** `services/ai/generator.ts` の `repairSuggestionCopy`

### 4. Fallback文言

**目的:** AI生成とRepairが両方失敗した場合の安全策

**全10種類実装:**

```typescript
const FALLBACK_COPY = {
  PLAN_REDUCE: {
    title: 'タスクを整理してみませんか？',
    message: '今週のタスクが多いようです。いくつかを来週に回すことで、進めやすくなるかもしれません。',
  },
  TASK_MICROSTEP: {
    title: '小さなステップに分けてみませんか？',
    message: 'このタスクを小さなステップに分けることで、始めやすくなる可能性があります。',
  },
  // ... 残り8種類
};
```

**実装ファイル:** `domains/tone/fallbacks.ts` (86行)

### 5. A/Bテスト（決定論的バケット）

**目的:** PromptVersionのA/Bテストを決定論的に実施

**特徴:**
- 同じuserIdとexperimentKeyは常に同じVariantに割り当てられる
- SHA256ハッシュを使用した決定論的バケット計算
- 0-99の範囲に正規化

**実装:**

```typescript
// バケット計算（決定論的）
export function calculateBucket(userId: string, experimentKey: string): number {
  const input = `${userId}:${experimentKey}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex');
  const hashValue = parseInt(hash.slice(0, 8), 16);
  return hashValue % 100;  // 0-99
}

// 実験割り当て
const bucket = calculateBucket(userId, experimentKey);

// 重み付き選択
let cumulative = 0;
for (const variant of experiment.variants) {
  cumulative += variant.weight;
  if (bucket < cumulative) {
    return variant.key;  // このVariantに割り当て
  }
}
```

**Variant設定例:**

```typescript
// Experiment: suggestion_copy_test_2026_01
// Variants:
//   - control (weight: 50)
//   - variant_a (weight: 50, configJson: { promptVersionOverrides: { SUGGESTION_COPY: 'version_2_id' } })

// ユーザーA（bucket=23） → control
// ユーザーB（bucket=67） → variant_a
```

**実装ファイル:** `services/experiments/assigner.ts` (172行)

### 6. PromptVersion管理

**目的:** プロンプトのバージョン管理とA/Bテスト対応

**主要機能:**

```typescript
// PromptVersion解決
const promptVersion = await resolvePromptVersion('SUGGESTION_COPY', userId);

// 解決ロジック:
// 1. ユーザーの実験割り当てチェック
// 2. Variantのプロンプトオーバーライド確認
// 3. オーバーライドがあればそれを使用
// 4. なければデフォルト（ACTIVE）を使用
```

**PromptVersionアクティブ化:**

```typescript
// 同じtemplate + variantの他のバージョンを自動ARCHIVE
await activatePromptVersion(promptVersionId);

// トランザクションで実行:
// 1. 同じtemplate + variantの他のACTIVEをARCHIVED
// 2. このバージョンをACTIVE
```

**実装ファイル:** `services/ai/prompt-resolver.ts` (203行)

### 7. AiGenerationLog記録

**目的:** 全AI生成プロセスをログに記録し、分析可能に

**記録内容:**

```typescript
await prisma.aiGenerationLog.create({
  data: {
    userId,
    type: 'SUGGESTION_COPY',
    promptKey: 'SUGGESTION_COPY',
    promptVersionId,
    modelName: 'claude-sonnet-4-5-20250929',
    inputJson: { systemPrompt, userPrompt },
    outputJson: validated,
    validationOk: true,
    violationsJson: violations,
    repairUsed: false,
    fallbackUsed: false,
    latencyMs: 1523,
    tokenCountIn: 245,
    tokenCountOut: 87,
  },
});
```

**統計取得:**

```typescript
const { stats } = await getAiGenerationStatsAction();

// {
//   total: 1000,
//   validationOk: 850,
//   repairUsed: 120,
//   fallbackUsed: 30,
//   successRate: 0.85,
//   repairRate: 0.12,
//   fallbackRate: 0.03,
//   avgLatencyMs: 1523
// }
```

## 管理者アクション

### Experiment管理

```typescript
// 実験作成
await createExperimentAction({
  key: 'suggestion_copy_v2_test',
  name: 'Suggestion Copy v2 A/B Test',
  description: 'より共感的な文言のテスト'
});

// Variant追加
await addExperimentVariantAction(experimentId, {
  key: 'control',
  name: 'Control',
  weight: 50,
});

await addExperimentVariantAction(experimentId, {
  key: 'variant_empathetic',
  name: 'Empathetic Version',
  weight: 50,
  configJson: {
    promptVersionOverrides: {
      SUGGESTION_COPY: 'prompt_version_v2_id'
    }
  }
});

// 実験開始
await startExperimentAction(experimentId);
```

**実装ファイル:** `actions/experiments.ts` (200行)

### PromptVersion管理

```typescript
// PromptVersion作成
await createPromptVersionAction({
  templateKey: 'SUGGESTION_COPY',
  version: 2,
  variant: 'empathetic',
  systemText: '...',
  userText: '...',
  notes: 'より共感的な文言に改善'
});

// アクティブ化
await activatePromptVersionAction(promptVersionId);

// ログ確認
const { logs } = await getAiGenerationLogsAction({
  promptKey: 'SUGGESTION_COPY',
  limit: 100
});
```

**実装ファイル:** `actions/prompts.ts` (234行)

## データフロー例

### 提案生成（AI生成統合）

```typescript
// 1. 提案生成
const suggestion = await generatePlanReduceSuggestion(userId, snapshot);

// 内部処理:
// 1-1. PromptVersion解決
//      → ユーザーの実験割り当てチェック
//      → Variant 'empathetic' に割り当て済み
//      → PromptVersion v2 使用

// 1-2. AI生成
//      systemPrompt: 'あなたはPaceアプリのAIアシスタントです。...'
//      userPrompt: 'ユーザー状態: OVERLOAD, タスク数: 15...'
//      → Claude API呼び出し

// 1-3. トーン検証
//      → 禁止語「すべき」を検出
//      → Repair試行

// 1-4. Repair
//      → 「すべき」→「してみませんか？」に修正
//      → 再検証: OK

// 1-5. ログ記録
//      validationOk: true
//      repairUsed: true
//      fallbackUsed: false

// 2. SuggestionEvent作成（AI生成文言使用）
const event = await prisma.suggestionEvent.create({
  data: {
    titleText: copy.title,  // AI生成（Repair後）
    messageText: copy.message,
    // ...
  }
});
```

## Phase 7で追加されたテーブル

既存のPrismaスキーマに含まれていますが、Phase 7で実際に使用開始：

- ✅ `PromptTemplate` - プロンプトテンプレート
- ✅ `PromptVersion` - プロンプトバージョン（hash, status, systemText, userText）
- ✅ `Experiment` - A/Bテスト実験
- ✅ `ExperimentVariant` - 実験Variant（weight, configJson）
- ✅ `ExperimentAssignment` - ユーザー割り当て
- ✅ `AiGenerationLog` - AI生成ログ（validationOk, repairUsed, fallbackUsed）

## 完了フェーズ

- ✅ **Phase 1**: Auth + sessionVersion
- ✅ **Phase 2**: Prismaスキーマ完全実装
- ✅ **Phase 3**: Resilience パターン
- ✅ **Phase 4**: StateSnapshot計算エンジン
- ✅ **Phase 5**: データCRUD（32アクション）
- ✅ **Phase 6**: 提案エンジン（5種類 + 適用処理）
- ✅ **Phase 7**: AI生成 + PromptVersion + A/Bテスト ← **完了！**

## 次のフェーズ

### Phase 8: UI実装（計画外）

Phase 1〜7で、Paceアプリの**バックエンド・ドメインロジック・AI統合**が完全に実装されました。

次のステップ（オプション）：
1. **UI実装**: Next.js App Routerでフロントエンド
2. **デプロイ**: Google Cloud Run + Cloud SQL
3. **モニタリング**: Observability実装

## テスト方法

### 1. AI生成テスト

```bash
# Prisma Studio起動
npm run db:studio

# PromptVersion作成（管理画面）
# → templateKey: SUGGESTION_COPY
# → systemText, userText設定
# → activatePromptVersion

# 提案生成
const { suggestions } = await getSuggestionsAction();

# → AI生成文言が使用される
# → トーン違反があればRepair
# → Repair失敗ならFallback
```

### 2. A/Bテスト

```bash
# Experiment作成
await createExperimentAction({
  key: 'test_2026_01',
  name: 'Test Experiment'
});

# Variant追加
await addExperimentVariantAction(experimentId, {
  key: 'control',
  weight: 50
});

await addExperimentVariantAction(experimentId, {
  key: 'variant_a',
  weight: 50,
  configJson: { promptVersionOverrides: { SUGGESTION_COPY: 'v2_id' } }
});

# 実験開始
await startExperimentAction(experimentId);

# ユーザーA → control
# ユーザーB → variant_a（決定論的）
```

### 3. ログ確認

```typescript
// AI生成ログ
const { logs } = await getAiGenerationLogsAction({
  userId,
  limit: 50
});

// 統計
const { stats } = await getAiGenerationStatsAction();
// → successRate: 0.85
// → repairRate: 0.12
// → fallbackRate: 0.03
```

## 既知の問題

なし（現時点）

## Phase 7のハイライト

### 1. 完全自動化されたトーン検証

AI生成 → 検証 → Repair → Fallback の完全自動フロー

### 2. 決定論的A/Bテスト

同じユーザーは常に同じVariantに割り当てられる

### 3. 全プロセスのログ記録

AiGenerationLogで全生成プロセスを追跡可能

### 4. Paceトーン原則の実装

禁止語・禁止パターンの自動検出と修正

## まとめ

Phase 7の完了により、Paceアプリの**AI生成・A/Bテスト・トーン検証**が実装されました。

**実装済み:**
- ✅ Phase 1〜6: バックエンド・ドメインロジック
- ✅ **Phase 7: AI生成・A/Bテスト統合**

**特徴:**
- AI生成文言の自動検証
- トーン違反の自動修正
- Repair失敗時のFallback
- 決定論的A/Bテスト
- 全プロセスのログ記録

**コード量:**
- Phase 7: 1,340行
- プロジェクト全体: 6,018行

これで、提案文言がAIで生成され、Paceトーンが自動検証され、A/Bテストが実施可能になりました！🎉
