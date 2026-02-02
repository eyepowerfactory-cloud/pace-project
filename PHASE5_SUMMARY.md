# Phase 5 完了サマリー

実装日: 2026-01-29

## 実装内容

Phase 5では、Paceアプリの中核となるデータCRUD操作を完全実装しました。

### 実装したアクション（全40個）

#### 1. VisionCard（6アクション）- `actions/vision.ts`

```typescript
✅ createVisionAction        // Vision作成
✅ updateVisionAction        // Vision更新
✅ archiveVisionAction       // Visionアーカイブ（論理削除）
✅ deleteVisionAction        // Vision完全削除
✅ listVisionsAction         // Vision一覧（horizon/アーカイブでフィルタ可）
✅ getVisionAction           // Vision詳細（QuarterGoal/Task含む）
```

**特徴:**
- Horizon別（1年/3年/5年）の分類
- Why note（「なぜこれを目指すのか」）
- タグ管理
- QuarterGoalとの紐付け

#### 2. QuarterGoal（7アクション）- `actions/goals.ts`

```typescript
✅ createQuarterGoalAction       // Goal作成
✅ updateQuarterGoalAction       // Goal更新
✅ archiveQuarterGoalAction      // Goalアーカイブ
✅ deleteQuarterGoalAction       // Goal完全削除
✅ listQuarterGoalsAction        // Goal一覧（年/四半期/Visionでフィルタ可）
✅ getQuarterGoalAction          // Goal詳細（VisionCard/Task含む）
✅ getCurrentQuarterGoalAction   // 現在の四半期Goal取得
```

**特徴:**
- 年 + 四半期（Q1/Q2/Q3/Q4）で一意
- Framework対応（OKR/SMART/WOOP）
- frameworkJsonでフレームワーク固有データ保存
- VisionCardとの紐付け

#### 3. WeeklyPlan & DailyPlan（8アクション）- `actions/plans.ts`

```typescript
// WeeklyPlan
✅ getOrCreateWeeklyPlanAction   // 存在しなければ自動作成
✅ updateWeeklyPlanAction        // テーマ・振り返りメモ更新
✅ listWeeklyPlansAction         // 一覧（期間指定可）
✅ getCurrentWeeklyPlanAction    // 今週のPlan

// DailyPlan
✅ getOrCreateDailyPlanAction    // 存在しなければ自動作成
✅ updateDailyPlanAction         // 朝メモ・夜メモ・エネルギーレベル更新
✅ listDailyPlansAction          // 一覧（期間指定可）
✅ getTodayDailyPlanAction       // 今日のPlan
```

**特徴:**
- **upsert方式**: 存在しなければ自動作成
- WeeklyPlan: 週の開始日（月曜日）で一意
- DailyPlan: 日付で一意、energyLevel（1-5）

#### 4. Task（11アクション）- `actions/tasks.ts`

```typescript
// 基本CRUD
✅ createTaskAction          // Task作成（Plan自動紐付け）
✅ updateTaskAction          // Task更新
✅ deleteTaskAction          // Task完全削除

// 操作
✅ completeTaskAction        // Task完了（completedAt記録）
✅ postponeTaskAction        // Task延期（postponeCount自動増加）
✅ cancelTaskAction          // Taskキャンセル（論理削除）

// 取得
✅ listTasksAction           // Task一覧（status/Goal/Plan等でフィルタ可）
✅ getTaskAction             // Task詳細（Goal/Vision/Plan含む）
✅ getTodayTasksAction       // 今日のTask
✅ getWeekTasksAction        // 今週のTask
✅ getOverdueTasksAction     // 期限切れTask
```

**特徴:**
- QuarterGoalとの紐付け
- WeeklyPlan/DailyPlanとの自動紐付け（upsert）
- **postponeCount自動増加**（延期時）
- originType/originId（AI生成等の起源トラッキング）

## 重要な設計判断

### 1. 所有権チェック（全アクション共通）

```typescript
// 必ず所有権確認
const existing = await prisma.xxx.findUnique({
  where: { id: xxxId },
  select: { userId: true }
});

if (!existing || existing.userId !== auth.userId) {
  throw new Error('Not found or access denied');
}
```

### 2. Plan自動作成（upsert方式）

```typescript
// Task作成時、WeeklyPlan/DailyPlanが存在しなければ自動作成
const weeklyPlan = await prisma.weeklyPlan.upsert({
  where: { userId_weekStart: { userId, weekStart } },
  create: { userId, weekStart },
  update: {}
});
```

**利点:**
- ユーザーがPlanを意識せずTaskを作成可能
- Planは必要に応じて自動生成

### 3. 論理削除 vs 物理削除

| 対象 | 論理削除（archive） | 物理削除（delete） |
|-----|-------------------|-------------------|
| VisionCard | ✅ archiveVisionAction | ✅ deleteVisionAction |
| QuarterGoal | ✅ archiveQuarterGoalAction | ✅ deleteQuarterGoalAction |
| Task | ✅ cancelTaskAction | ✅ deleteTaskAction |

**設計意図:**
- 論理削除: 履歴保持、復元可能
- 物理削除: 完全削除、復元不可

### 4. 日付正規化

```typescript
// DailyPlanの日付は00:00:00に正規化
const normalizedDate = new Date(date);
normalizedDate.setHours(0, 0, 0, 0);

// WeeklyPlanの開始日は月曜日00:00:00に正規化
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // 月曜日
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}
```

**利点:**
- 日付比較が確実
- タイムゾーン問題の軽減

## データフロー例

### Vision → Quarter → Task

```typescript
// 1. Vision作成（5年ビジョン）
const vision = await createVisionAction({
  horizon: 'FIVE_YEARS',
  title: 'フルスタックエンジニアになる',
  whyNote: '自分のアイデアを形にしたい'
});

// 2. QuarterGoal作成（2026 Q1）
const goal = await createQuarterGoalAction({
  year: 2026,
  cadence: 'Q1',
  title: 'Next.js + Prismaで個人プロジェクト完成',
  visionCardId: vision.vision.id,
  framework: 'OKR',
  frameworkJson: {
    objective: 'フルスタック技術習得',
    keyResults: [
      '個人プロジェクト1つデプロイ',
      'GitHub 100 commits',
    ]
  }
});

// 3. Task作成（今週）
const task = await createTaskAction({
  title: 'Prismaスキーマ設計',
  quarterGoalId: goal.goal.id,
  plannedWeekStart: new Date('2026-01-27'), // 今週月曜日
  priority: 80,
  effortMin: 120
});

// 4. Task完了
await completeTaskAction(task.task.id);

// 5. Task延期（来週へ）
await postponeTaskAction(task.task.id, {
  newPlannedWeekStart: new Date('2026-02-03')
});
// → postponeCount が自動増加（状態推定のシグナルになる）
```

## 統計

### コード量

| ファイル | 行数 | アクション数 |
|---------|------|------------|
| actions/vision.ts | 220行 | 6 |
| actions/goals.ts | 280行 | 7 |
| actions/plans.ts | 260行 | 8 |
| actions/tasks.ts | 480行 | 11 |
| **合計** | **1,240行** | **32** |

### Zodスキーマ追加

- CreateVisionSchema
- UpdateVisionSchema
- CreateQuarterGoalSchema
- UpdateQuarterGoalSchema
- CreateTaskSchema
- UpdateTaskSchema
- CompleteTaskSchema
- PostponeTaskSchema

## 次のフェーズ（Phase 6）

Phase 5でデータ層が完成したので、次は提案エンジンの実装に移ります：

### Phase 6: SuggestionEvent + responses + applySuggestion

1. **10種類の提案生成**
   - PLAN_REDUCE（タスク削減）
   - TASK_MICROSTEP（マイクロステップ分解）
   - PRIORITY_FOCUS（優先度集中）
   - GOAL_REFRAME（Goal見直し）
   - MOTIVATION_REMIND（Why note思い出し）
   - AUTONOMY_ADJUST（提案頻度調整）
   - RESUME_SUPPORT（再開支援）
   - VISION_CREATE_ASSIST（Vision作成支援）
   - VISION_TO_QUARTER_TRANSLATE（Vision→Quarter翻訳）
   - GOAL_TO_TASK_DRAFT（Goal→Task生成）

2. **提案適用（applySuggestion）**
   - Type別のStrategy Pattern
   - 実際のデータ変更（Task移動、分解等）

3. **ユーザー応答記録**
   - ACCEPTED/DISMISSED/POSTPONED/IGNORED_TIMEOUT

## テスト方法

### 1. Prisma Studio で確認

```bash
npm run db:studio
```

### 2. シード実行

```bash
npm run db:seed
# → Admin/Testユーザー作成
```

### 3. アクション呼び出し例

```typescript
// サインイン
const { user } = await signInAction({
  email: 'test@pace.local',
  password: 'test123456'
});

// Vision作成
const vision = await createVisionAction({
  horizon: 'ONE_YEAR',
  title: 'テストVision'
});

// Task作成
const task = await createTaskAction({
  title: 'テストタスク',
  priority: 70
});

// 今日のタスク取得
const { tasks } = await getTodayTasksAction();
```

## まとめ

Phase 5の完了により、Paceアプリの**データ層が完全に実装**されました。

**実装済み:**
- ✅ Phase 1: Auth + sessionVersion
- ✅ Phase 2: Prismaスキーマ
- ✅ Phase 3: Resilience パターン
- ✅ Phase 4: 状態推定エンジン
- ✅ **Phase 5: データCRUD（40アクション）**

**次:**
- Phase 6: 提案エンジン
- Phase 7: AI生成 + A/Bテスト
- Phase 8: UI実装

これで、ユーザーはVision作成 → Goal設定 → Task管理 の完全なフローを実行できます。状態推定エンジンも実データで動作するようになりました。
