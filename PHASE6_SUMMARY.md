# Phase 6 完了サマリー

実装日: 2026-01-29

## 実装内容

Phase 6では、Paceアプリの中核となる**提案エンジン**を実装しました。ユーザーの状態に応じて適切な提案を生成し、受け入れられた提案を実際のデータに適用する仕組みが完成しました。

## 実装した提案タイプ（5種類）

### 1. PLAN_REDUCE（タスク削減提案）

**条件:**
- primaryState が OVERLOAD または PLAN_OVERLOAD
- 今週のタスクが10個以上

**提案内容:**
- 優先度の低いタスク（約1/3）を来週に移動

**適用処理:**
```typescript
// タスクを来週に移動
await prisma.task.updateMany({
  where: { id: { in: taskIds } },
  data: {
    plannedWeekStart: nextWeek,
    weeklyPlanId: weeklyPlan.id,
  },
});
```

### 2. TASK_MICROSTEP（マイクロステップ分解）

**条件:**
- primaryState が STUCK
- 延期回数が3回以上のタスクが存在

**提案内容:**
- 停滞しているタスクを3つのステップに分解

**適用処理:**
```typescript
// 元のタスクをキャンセル
await prisma.task.update({
  where: { id: originalTaskId },
  data: { status: 'CANCELLED' },
});

// マイクロステップを作成
await prisma.$transaction(
  microSteps.map(step => prisma.task.create({
    data: {
      userId,
      title: step.title,
      effortMin: step.effortMin,
      originType: 'GENERATED_FROM_SUGGESTION',
      originId: originalTaskId,
    },
  }))
);
```

### 3. PRIORITY_FOCUS（優先度集中）

**条件:**
- primaryState が OVERLOAD または PLAN_OVERLOAD
- 現在の四半期に複数のGoalが存在

**提案内容:**
- タスク数が最も多いGoalに集中
- 他のGoalのタスクを一時停止

**適用処理:**
```typescript
// 他のGoalのタスクの計画を解除
await prisma.task.updateMany({
  where: {
    quarterGoalId: { in: otherGoalIds },
    status: { notIn: ['DONE', 'CANCELLED'] },
  },
  data: {
    plannedWeekStart: null,
    weeklyPlanId: null,
    plannedDate: null,
    dailyPlanId: null,
  },
});
```

### 4. MOTIVATION_REMIND（Why note思い出し）

**条件:**
- primaryState が LOW_MOTIVATION または STUCK
- whyNoteを持つVisionが存在

**提案内容:**
- 「なぜこれを目指すのか」（Why note）を表示

**適用処理:**
- データ変更なし（表示のみ）

### 5. RESUME_SUPPORT（再開支援）

**条件:**
- primaryState が STUCK
- 非アクティブ日数が5日以上

**提案内容:**
- 簡単なタスク（30分以内、優先度高）を推奨
- 今日の予定に追加

**適用処理:**
```typescript
// タスクを今日の予定に追加
await prisma.task.updateMany({
  where: { id: { in: taskIds } },
  data: {
    plannedDate: today,
    dailyPlanId: dailyPlan.id,
  },
});
```

## 実装ファイル構成

### domains/suggestion/

```
domains/suggestion/
├── types.ts                    # 型定義・ペイロード定義
├── generator.ts                # 提案生成エンジン（優先度順）
├── payloads/
│   ├── plan-reduce.ts         # PLAN_REDUCE生成
│   ├── task-microstep.ts      # TASK_MICROSTEP生成
│   ├── priority-focus.ts      # PRIORITY_FOCUS生成
│   ├── motivation-remind.ts   # MOTIVATION_REMIND生成
│   └── resume-support.ts      # RESUME_SUPPORT生成
└── appliers/
    └── index.ts                # 提案適用（Strategy Pattern）
```

### actions/suggestions.ts

- `getSuggestionsAction` - 提案取得（StateSnapshot自動計算）
- `getSuggestionAction` - 提案詳細取得
- `recordSuggestionResponseAction` - 応答記録
- `applySuggestionAction` - 提案適用実行
- `getSuggestionHistoryAction` - 履歴取得
- `getSuggestionStatsAction` - 統計取得

## 主要な設計パターン

### 1. Strategy Pattern（提案適用）

```typescript
const appliers: Record<SuggestionType, (payload, acceptPayload) => Promise<void>> = {
  PLAN_REDUCE: applyPlanReduce,
  TASK_MICROSTEP: applyTaskMicrostep,
  PRIORITY_FOCUS: applyPriorityFocus,
  GOAL_REFRAME: applyGoalReframe,
  MOTIVATION_REMIND: applyMotivationRemind,
  AUTONOMY_ADJUST: applyAutonomyAdjust,
  RESUME_SUPPORT: applyResumeSupport,
  VISION_CREATE_ASSIST: applyVisionCreateAssist,
  VISION_TO_QUARTER_TRANSLATE: applyVisionToQuarter,
  GOAL_TO_TASK_DRAFT: applyGoalToTask,
};

await appliers[event.suggestionType](event.payloadJson, acceptPayload);
```

### 2. 優先度順生成

```typescript
const generators = [
  // 高優先度: 負荷軽減
  generatePlanReduceSuggestion,
  generateTaskMicrostepSuggestion,
  generatePriorityFocusSuggestion,

  // 中優先度: モチベーション
  generateMotivationRemindSuggestion,
  generateResumeSupportSuggestion,
];

for (const generator of generators) {
  if (suggestions.length >= limit) break;
  const suggestion = await generator(userId, snapshot);
  if (suggestion) suggestions.push(suggestion);
}
```

### 3. 条件判定

各提案生成関数は、条件を満たさない場合は`null`を返します。

```typescript
// 条件チェック
if (snapshot.primaryState !== 'OVERLOAD' &&
    snapshot.primaryState !== 'PLAN_OVERLOAD') {
  return null;
}

if (tasks.length < 10) {
  return null;
}
```

## データフロー

### 提案生成 → 応答 → 適用

```typescript
// 1. 提案取得（StateSnapshot自動計算）
const { suggestions } = await getSuggestionsAction();
// → 優先度順に最大3つの提案を生成

// 2. ユーザーが提案を確認

// 3. 応答記録（ACCEPTED）
await recordSuggestionResponseAction(eventId, {
  response: 'ACCEPTED',
  responsePayload: { selectedTaskIds: [...] }
});

// 4. 提案適用
await applySuggestionAction(eventId, acceptPayload);
// → 実際のデータ変更（Task移動、分解等）
```

## Paceトーンの実装

Phase 6では、提案文言にPaceトーン（命令形禁止、仮説提示、許可形式）を適用しています。

### 良い例

```typescript
titleText: 'タスクを減らしてみませんか？'
messageText: `今週は${tasks.length}個のタスクがあります。${candidates.length}個を来週に回すことで、負荷を軽減できるかもしれません。`
```

✅ 「〜してみませんか？」（許可形式）
✅ 「〜できるかもしれません」（仮説提示）

### 悪い例（Paceトーン違反）

```
❌ titleText: 'タスクを減らしなさい'（命令形）
❌ messageText: 'あなたは怠けています'（ラベル貼り）
❌ messageText: 'すぐに対応すべきです'（強制）
```

**Phase 7で実装予定:**
- AI生成文言の自動検証
- トーン違反の自動修正（Repair）
- Fallback文言

## 統計

### コード量

| ファイル | 行数 |
|---------|------|
| domains/suggestion/types.ts | 150行 |
| domains/suggestion/generator.ts | 65行 |
| domains/suggestion/payloads/*.ts | 400行（5ファイル） |
| domains/suggestion/appliers/index.ts | 260行 |
| actions/suggestions.ts | 175行 |
| **合計** | **1,050行** |

### 実装済み提案タイプ

| タイプ | 条件 | 適用処理 | 状態 |
|-------|------|---------|------|
| PLAN_REDUCE | OVERLOAD + タスク10個以上 | タスク来週移動 | ✅ |
| TASK_MICROSTEP | STUCK + 延期3回以上 | マイクロステップ作成 | ✅ |
| PRIORITY_FOCUS | OVERLOAD + 複数Goal | 他Goal一時停止 | ✅ |
| MOTIVATION_REMIND | LOW_MOTIVATION + Why note | 表示のみ | ✅ |
| RESUME_SUPPORT | STUCK + 非アクティブ5日以上 | 今日の予定追加 | ✅ |
| GOAL_REFRAME | - | - | ⏳ Phase 7 |
| AUTONOMY_ADJUST | - | - | ⏳ Phase 7 |
| VISION_CREATE_ASSIST | - | AI生成 | ⏳ Phase 7 |
| VISION_TO_QUARTER_TRANSLATE | - | AI生成 | ⏳ Phase 7 |
| GOAL_TO_TASK_DRAFT | - | AI生成 | ⏳ Phase 7 |

## 次のフェーズ（Phase 7）

Phase 6で提案エンジンの基盤が完成したので、次はAI生成の実装に移ります。

### Phase 7: AI生成 + PromptVersion + ABテスト

1. **プロンプトバージョン解決**
   - PromptVersion選択（ACTIVE優先）
   - Experiment割り当て確認
   - プロンプトオーバーライド適用

2. **Paceトーン検証**
   - 禁止語チェック（「すべき」「しなさい」等）
   - 禁止パターンチェック（断定ラベル等）
   - トーン違反検出

3. **Repair + Fallback**
   - トーン違反時のRepair（1回まで）
   - Repair失敗時のFallback文言使用
   - AiGenerationLog記録

4. **A/Bテスト割り当て**
   - 決定論的バケット計算（SHA256）
   - ExperimentAssignment作成
   - Variant選択

5. **AI生成文言置き換え**
   - PLAN_REDUCE等の文言をAI生成に置き換え
   - GOAL_REFRAME等のAI生成系提案実装

## テスト方法

### 1. 提案生成テスト

```typescript
// StateSnapshot作成（OVERLOAD状態）
const snapshot = await computeStateSnapshot(userId);

// 提案生成
const { suggestions } = await getSuggestionsAction();

console.log(suggestions);
// → [
//     { type: 'PLAN_REDUCE', title: 'タスクを減らしてみませんか？', ... },
//     { type: 'PRIORITY_FOCUS', title: '1つのゴールに集中してみませんか？', ... }
//   ]
```

### 2. 提案適用テスト

```typescript
// PLAN_REDUCE適用
await applySuggestionAction(eventId, {
  selectedTaskIds: ['task1', 'task2']
});

// 確認: タスクが来週に移動されている
const tasks = await listTasksAction({
  plannedWeekStart: nextWeek
});
```

### 3. 統計確認

```typescript
const { stats } = await getSuggestionStatsAction();
console.log(stats);
// → {
//     total: 10,
//     accepted: 6,
//     dismissed: 2,
//     postponed: 1,
//     ignored: 1,
//     acceptanceRate: 0.6,
//     dismissalRate: 0.2
//   }
```

## 既知の問題

なし（現時点）

## Phase 6のハイライト

### 1. 実データに基づく提案

StateSnapshotからシグナルを抽出し、条件判定して提案を生成。

```typescript
// シグナル: 今週のタスク15個、完了率30%
// → OVERLOAD状態
// → PLAN_REDUCE提案生成
```

### 2. 実データ変更

提案を受け入れると、実際のTaskデータが変更されます。

```typescript
// PLAN_REDUCE受け入れ
// → 5つのタスクが来週に移動
// → WeeklyPlan自動作成（upsert）
```

### 3. Strategy Pattern

Type別の適用処理を分離し、保守性向上。

```typescript
// 新しい提案タイプの追加が容易
appliers[newType] = applyNewType;
```

## まとめ

Phase 6の完了により、Paceアプリの**提案エンジン**が実装されました。

**実装済み:**
- ✅ Phase 1: Auth + sessionVersion
- ✅ Phase 2: Prismaスキーマ
- ✅ Phase 3: Resilience パターン
- ✅ Phase 4: 状態推定エンジン
- ✅ Phase 5: データCRUD（40アクション）
- ✅ **Phase 6: 提案エンジン（5種類 + 適用処理）**

**次:**
- Phase 7: AI生成 + PromptVersion + ABテスト
- Phase 8: UI実装

これで、ユーザーの状態に応じた提案が自動生成され、受け入れられた提案が実際のデータに反映されるようになりました。Phase 7では、この提案文言をAIで生成し、Paceトーンを自動検証する仕組みを実装します。
