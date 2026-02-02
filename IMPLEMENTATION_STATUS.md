# Pace プロジェクト実装状況

最終更新: 2026-01-29

## 完了した実装

### Phase 1: 基盤構築（Auth + sessionVersion） ✅

#### 1. Prisma スキーマ
- ✅ 完全なスキーマ定義（全Enum + 全Model）
- ✅ sessionVersion フィールド実装
- ✅ リレーション設定
- ✅ インデックス最適化

**ファイル**: `prisma/schema.prisma`

#### 2. 認証システム
- ✅ JWT セッション管理 (`lib/auth/session.ts`)
- ✅ sessionVersion 検証ガード (`lib/auth.ts`)
- ✅ requireActiveSession 実装
- ✅ requireAdminRole 実装
- ✅ AuthError 定義

**主要ファイル**:
- `lib/auth.ts` - 認証ガード
- `lib/auth/session.ts` - JWT管理
- `lib/auth/errors.ts` - エラー定義

#### 3. Server Actions
- ✅ signUpAction - ユーザー登録
- ✅ signInAction - ログイン
- ✅ signOutAction - ログアウト
- ✅ getCurrentUserAction - 現在のユーザー取得

**ファイル**: `actions/auth.ts`

#### 4. 管理者機能
- ✅ adminSuspendUserAction - ユーザー停止
- ✅ adminUnsuspendUserAction - 停止解除
- ✅ **adminForceLogoutUserAction** - 強制ログアウト（sessionVersion+=1）
- ✅ adminUpdateUserRoleAction - ロール変更
- ✅ adminDeleteUserAction - ユーザー削除
- ✅ adminListUsersAction - ユーザー一覧
- ✅ adminGetAuditLogsAction - 監査ログ取得

**ファイル**: `actions/admin.ts`

**重要**: `adminForceLogoutUserAction` は sessionVersion をインクリメントすることで、ユーザーの全JWTを即座に無効化します。

### Phase 2: Resilience パターン ✅

taisun_agent の実績あるパターンを移植:

#### 1. Retry with Exponential Backoff
- ✅ Exponential Backoff + Jitter
- ✅ リトライ可能エラー判定（5xx, 429, network errors）
- ✅ 最大試行回数設定

**ファイル**: `services/resilience/retry.ts`

#### 2. Timeout
- ✅ AbortController ベース
- ✅ Promise.race フォールバック
- ✅ TimeoutError 定義

**ファイル**: `services/resilience/timeout.ts`

#### 3. Circuit Breaker
- ✅ CLOSED/OPEN/HALF_OPEN 状態管理
- ✅ 連続失敗時の自動遮断
- ✅ タイムアウト後の試行的再開

**ファイル**: `services/resilience/circuit-breaker.ts`

### Phase 3: AI Client ✅

#### Claude API クライアント
- ✅ Anthropic SDK 統合
- ✅ Resilience パターン適用（Retry + Timeout）
- ✅ JSON出力サポート
- ✅ トークン数推定

**ファイル**: `services/ai/client.ts`

**設定**:
- Model: `claude-sonnet-4-5-20250929`
- Timeout: 15秒
- Retry: 最大2回、Exponential Backoff + Jitter

### Phase 4: State Calculation（状態推定） ✅

#### 1. シグナル抽出
- ✅ タスク完了率計算
- ✅ 期限切れタスク数
- ✅ 延期回数（7日間）
- ✅ 非アクティブ日数
- ✅ 提案拒否率
- ✅ Vision/Plan関連シグナル

**ファイル**: `domains/state/signals.ts`

#### 2. スコア計算ルール（仕様書準拠）
- ✅ OVERLOAD（タスク過負荷）
- ✅ STUCK（停滞）
- ✅ VISION_OVERLOAD（Vision多すぎ）
- ✅ PLAN_OVERLOAD（Plan多すぎ）
- ✅ AUTONOMY_REACTANCE（提案拒否反応）
- ✅ LOW_MOTIVATION（モチベーション低下）
- ✅ LOW_SELF_EFFICACY（自己効力感低下）

**ファイル**: `domains/state/rules.ts`

#### 3. StateSnapshot 計算エンジン
- ✅ シグナル抽出 → スコア計算 → primaryState決定
- ✅ 自己申告データのマージ
- ✅ DB保存

**ファイル**: `domains/state/calculator.ts`

#### 4. State Actions
- ✅ computeStateSnapshotAction
- ✅ getLatestStateSnapshotAction
- ✅ getStateSnapshotHistoryAction

**ファイル**: `actions/state.ts`

### その他

#### Zodバリデーション
- ✅ Auth スキーマ（SignUp, SignIn）
- ✅ Vision スキーマ
- ✅ QuarterGoal スキーマ
- ✅ Task スキーマ
- ✅ State スキーマ（SelfReport）
- ✅ Admin スキーマ

**ファイル**: `lib/zod.ts`

#### Prisma
- ✅ Prisma Client シングルトン (`lib/prisma.ts`)
- ✅ Seed スクリプト (`prisma/seed.ts`)
  - Admin ユーザー: `admin@pace.local` / `admin123456`
  - Test ユーザー: `test@pace.local` / `test123456`
  - Prompt Template & Version
  - Experiment サンプル

#### 環境設定
- ✅ `.env.example`
- ✅ package.json スクリプト
  - `npm run db:generate`
  - `npm run db:migrate`
  - `npm run db:seed`
  - `npm run db:studio`

### Phase 5: Vision/Quarter/Plans/Tasks CRUD ✅

#### 1. VisionCard CRUD
- ✅ createVisionAction - Vision作成
- ✅ updateVisionAction - Vision更新
- ✅ archiveVisionAction - Visionアーカイブ
- ✅ deleteVisionAction - Vision完全削除
- ✅ listVisionsAction - Vision一覧取得
- ✅ getVisionAction - Vision詳細取得

**ファイル**: `actions/vision.ts`

#### 2. QuarterGoal CRUD
- ✅ createQuarterGoalAction - Goal作成
- ✅ updateQuarterGoalAction - Goal更新
- ✅ archiveQuarterGoalAction - Goalアーカイブ
- ✅ deleteQuarterGoalAction - Goal完全削除
- ✅ listQuarterGoalsAction - Goal一覧取得
- ✅ getQuarterGoalAction - Goal詳細取得
- ✅ getCurrentQuarterGoalAction - 現在の四半期Goal取得

**ファイル**: `actions/goals.ts`

#### 3. WeeklyPlan & DailyPlan CRUD
- ✅ getOrCreateWeeklyPlanAction - WeeklyPlan取得/作成
- ✅ updateWeeklyPlanAction - WeeklyPlan更新
- ✅ listWeeklyPlansAction - WeeklyPlan一覧
- ✅ getCurrentWeeklyPlanAction - 今週のPlan取得
- ✅ getOrCreateDailyPlanAction - DailyPlan取得/作成
- ✅ updateDailyPlanAction - DailyPlan更新
- ✅ listDailyPlansAction - DailyPlan一覧
- ✅ getTodayDailyPlanAction - 今日のPlan取得

**ファイル**: `actions/plans.ts`

#### 4. Task CRUD + Operations
- ✅ createTaskAction - Task作成
- ✅ updateTaskAction - Task更新
- ✅ completeTaskAction - Task完了
- ✅ postponeTaskAction - Task延期（postponeCount自動増加）
- ✅ cancelTaskAction - Taskキャンセル
- ✅ deleteTaskAction - Task完全削除
- ✅ listTasksAction - Task一覧取得（フィルタ対応）
- ✅ getTaskAction - Task詳細取得
- ✅ getTodayTasksAction - 今日のTask取得
- ✅ getWeekTasksAction - 今週のTask取得
- ✅ getOverdueTasksAction - 期限切れTask取得

**ファイル**: `actions/tasks.ts`

**重要機能**:
- 所有権チェック（全アクション）
- WeeklyPlan/DailyPlan自動作成（upsert）
- postponeCount自動増加（延期時）
- QuarterGoal/VisionCard紐付け対応

### Phase 6: SuggestionEvent + responses + applySuggestion ✅

#### 1. 提案生成（5種類実装）
- ✅ PLAN_REDUCE - タスク削減提案
- ✅ TASK_MICROSTEP - マイクロステップ分解
- ✅ PRIORITY_FOCUS - 優先度集中
- ✅ MOTIVATION_REMIND - Why note思い出し
- ✅ RESUME_SUPPORT - 再開支援

**ファイル**: `domains/suggestion/payloads/*.ts`

#### 2. 提案適用（applySuggestion）
- ✅ Strategy Pattern実装（Type別処理）
- ✅ applyPlanReduce - タスク来週移動
- ✅ applyTaskMicrostep - マイクロステップ作成
- ✅ applyPriorityFocus - 他Goal一時停止
- ✅ applyResumeSupport - 今日の予定追加
- ⏳ AI生成系（GOAL_REFRAME等）はPhase 7で実装

**ファイル**: `domains/suggestion/appliers/index.ts`

#### 3. ユーザー応答記録
- ✅ recordSuggestionResponseAction - 応答記録
- ✅ applySuggestionAction - 提案適用実行
- ✅ getSuggestionsAction - 提案取得
- ✅ getSuggestionHistoryAction - 履歴取得
- ✅ getSuggestionStatsAction - 統計取得

**ファイル**: `actions/suggestions.ts`

#### 4. 提案生成エンジン
- ✅ generateSuggestions - メイン生成関数（優先度順）
- ✅ generateSingleSuggestion - 単一提案生成（テスト用）

**ファイル**: `domains/suggestion/generator.ts`

**重要機能**:
- StateSnapshotベースの提案生成
- 条件判定（状態・タスク数等）
- 所有権チェック（全アクション）
- ダミー文言実装（Phase 7でAI生成に置き換え）

### Phase 7: AI生成 + PromptVersion + ABテスト ✅

#### 1. Paceトーン検証
- ✅ checkToneViolations - トーン違反チェック
- ✅ hasToneViolations - 違反有無判定
- ✅ formatViolations - 違反説明文生成
- ✅ generateRepairSystemPrompt - Repair用プロンプト生成
- ✅ 禁止語リスト（「すべき」「しなさい」等）
- ✅ 禁止パターン（断定ラベル、強制命令等）

**ファイル**: `domains/tone/validator.ts`

#### 2. Fallback文言
- ✅ 全10種類のSuggestionType別Fallback文言
- ✅ getFallbackCopy - Fallback文言取得

**ファイル**: `domains/tone/fallbacks.ts`

#### 3. A/Bテスト割り当て
- ✅ calculateBucket - 決定論的バケット計算（SHA256）
- ✅ assignExperiment - 実験割り当て
- ✅ getUserExperimentVariant - ユーザー割り当て取得
- ✅ getExperimentAssignments - 実験割り当て一覧

**ファイル**: `services/experiments/assigner.ts`

#### 4. プロンプトバージョン解決
- ✅ resolvePromptVersion - PromptVersion解決
- ✅ replaceTemplateVariables - テンプレート変数置換
- ✅ calculatePromptHash - PromptVersionハッシュ計算
- ✅ createPromptVersion - PromptVersion作成
- ✅ activatePromptVersion - PromptVersionアクティブ化

**ファイル**: `services/ai/prompt-resolver.ts`

#### 5. AI生成統合（Repair + Fallback + Logging）
- ✅ generateSuggestionCopy - 提案文言AI生成
- ✅ repairSuggestionCopy - トーン違反修正（1回まで）
- ✅ logAiGeneration - AiGenerationLog記録
- ✅ generateTaskMicrostepDraft - マイクロステップAI生成（例）

**ファイル**: `services/ai/generator.ts`

#### 6. 管理者アクション
- ✅ createExperimentAction - 実験作成
- ✅ addExperimentVariantAction - Variant追加
- ✅ startExperimentAction - 実験開始
- ✅ pauseExperimentAction - 実験停止
- ✅ completeExperimentAction - 実験完了
- ✅ listExperimentsAction - 実験一覧
- ✅ getExperimentAction - 実験詳細
- ✅ assignUserToExperimentAction - 手動割り当て

**ファイル**: `actions/experiments.ts`

- ✅ createPromptVersionAction - PromptVersion作成
- ✅ activatePromptVersionAction - PromptVersionアクティブ化
- ✅ listPromptVersionsAction - PromptVersion一覧
- ✅ getPromptVersionAction - PromptVersion詳細
- ✅ getAiGenerationLogsAction - AI生成ログ取得
- ✅ getAiGenerationStatsAction - AI生成統計取得

**ファイル**: `actions/prompts.ts`

**重要機能**:
- AI生成文言の自動検証
- トーン違反時の自動修正（Repair）
- Repair失敗時のFallback文言使用
- 決定論的A/Bテスト割り当て
- 全プロセスのログ記録

## 未実装（次フェーズ）

### Phase 8: UI実装
- [ ] Next.js App Router ページ
- [ ] 認証画面
- [ ] ダッシュボード
- [ ] Vision/Goal/Task 管理画面
- [ ] 管理者画面

## セットアップ手順（開発者向け）

### 1. PostgreSQL準備

ローカル開発用のPostgreSQLを起動:

```bash
# Docker使用例
docker run -d \
  --name pace-postgres \
  -e POSTGRES_USER=pace \
  -e POSTGRES_PASSWORD=pace123 \
  -e POSTGRES_DB=pace_db \
  -p 5432:5432 \
  postgres:16
```

### 2. 環境変数設定

```bash
cp .env.example .env
```

`.env` を編集:

```env
DATABASE_URL="postgresql://pace:pace123@localhost:5432/pace_db"
JWT_SECRET="your-secret-key-at-least-32-characters-long"
ANTHROPIC_API_KEY="sk-ant-..."
NODE_ENV="development"
```

### 3. データベースセットアップ

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## テスト手順

### 1. 強制ログアウトテスト

```bash
# 1. テストユーザーでログイン
# 2. 管理者が強制ログアウト実行
# 3. テストユーザーが次のリクエスト実行 → 401 SESSION_INVALID
```

### 2. sessionVersion検証

```typescript
// DB確認
SELECT id, email, sessionVersion FROM "User" WHERE email = 'test@pace.local';

// 強制ログアウト後
// sessionVersion が 1 → 2 にインクリメントされる
```

### 3. 状態計算テスト

```typescript
// StateSnapshot計算
const snapshot = await computeStateSnapshot(userId, 7);

// 結果確認
console.log(snapshot.primaryState);      // "OVERLOAD" | "STUCK" | ...
console.log(snapshot.primaryConfidence); // 0-100
console.log(snapshot.topSignalsJson);    // ["overdue_tasks_high", ...]
```

## 重要なファイル

### 認証・セキュリティ
- `lib/auth.ts` - **最重要**: requireActiveSession（sessionVersion検証）
- `lib/auth/session.ts` - JWT発行/検証
- `actions/admin.ts` - **adminForceLogoutUserAction**

### ドメインロジック
- `domains/state/calculator.ts` - StateSnapshot計算エンジン
- `domains/state/rules.ts` - スコア計算ルール（仕様書準拠）
- `domains/state/signals.ts` - シグナル抽出

### AIサービス
- `services/ai/client.ts` - Claude API クライアント（Resilience適用）
- `services/resilience/` - Retry/Timeout/CircuitBreaker

### データベース
- `prisma/schema.prisma` - 完全なスキーマ定義
- `prisma/seed.ts` - 初期データ投入

## 次のステップ

### 優先度 High
1. **Phase 5**: Vision/Quarter/Plans/Tasks CRUD
   - データ入力がないと状態計算が意味をなさない
2. **UI実装**: 基本的な画面
   - 認証画面、ダッシュボード、タスク一覧

### 優先度 Medium
3. **Phase 6**: SuggestionEvent
   - 提案生成・適用ロジック
4. **Phase 7**: AI生成 + A/Bテスト
   - プロンプトバージョン管理
   - Paceトーン検証

### 優先度 Low
5. **テスト**: Jest/Playwright
6. **CI/CD**: GitHub Actions
7. **デプロイ**: Google Cloud Run

## 既知の問題

なし（現時点）

## パフォーマンス最適化メモ

### 状態計算のDB負荷
- extractSignals で複数のクエリ実行
- 最適化候補: 単一クエリで集計（JOINまたはサブクエリ）

### AI API レイテンシ
- Claude API: 2-5秒
- Timeout: 15秒設定済み
- Fallback文言を準備（Phase 7）

## セキュリティチェックリスト

- [x] sessionVersion による強制ログアウト
- [x] JWT検証（requireActiveSession）
- [x] パスワードハッシュ化（bcrypt, 10 rounds）
- [x] Zodバリデーション
- [x] 管理者権限チェック（requireAdminRole）
- [x] 監査ログ（AdminAuditLog）
- [ ] Rate Limiting（未実装）
- [ ] CSRF対策（Next.js デフォルト）
- [ ] XSS対策（React デフォルト + サニタイゼーション）

## ライセンス

MIT
