# Pace プロジェクト セットアップガイド

実装が完了したPaceプロジェクトをローカル環境で動作させるための手順です。

## 前提条件

- Node.js 18以上
- Docker（PostgreSQL用）
- npm

## セットアップ手順

### 1. PostgreSQLの起動

Dockerを使用してローカル開発用のPostgreSQLを起動します。

```bash
# PostgreSQLコンテナの起動
docker run -d \
  --name pace-postgres \
  -e POSTGRES_USER=pace \
  -e POSTGRES_PASSWORD=pace123 \
  -e POSTGRES_DB=pace_db \
  -p 5432:5432 \
  postgres:16

# 起動確認
docker ps | grep pace-postgres
```

### 2. 環境変数の設定

`.env`ファイルを編集して、データベース接続情報を設定します。

```bash
cd /Users/apple/AI/01_dev/pace-project

# .envを編集
cat > .env << 'EOF'
# Database
DATABASE_URL="postgresql://pace:pace123@localhost:5432/pace_db"

# JWT Secret (本番環境では変更必須)
JWT_SECRET="development-secret-key-change-in-production-min-32-chars"

# Anthropic API（AI生成機能を使用する場合）
ANTHROPIC_API_KEY="sk-ant-your-api-key-here"

# Environment
NODE_ENV="development"
EOF
```

### 3. Prisma Clientの生成

```bash
npm run db:generate
```

**期待される出力:**
```
✔ Generated Prisma Client (v7.3.0) to ./node_modules/@prisma/client in XXXms
```

### 4. データベースマイグレーションの実行

```bash
npm run db:migrate -- --name init
```

**期待される出力:**
```
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "pace_db" at "localhost:5432"

Applying migration `20260129000000_init`

✔ Generated Prisma Client (v7.3.0)

Database schema migrated successfully!
```

### 5. シードデータの投入

**オプション1: 基本シードデータ（管理者 + 1ユーザー）**

```bash
npm run db:seed
```

**期待される出力:**
```
Seeding database...
✓ Admin user created: admin@pace.local
✓ Test user created: test@pace.local
✓ Prompt template created: SUGGESTION_COPY
✓ Prompt version created (v1, default)
✓ Experiment created: suggestion_copy_test_2026_01

Seed completed successfully!

Test credentials:
  Admin: admin@pace.local / admin123456
  User:  test@pace.local / test123456
```

**オプション2: リッチシードデータ（管理者 + 3ユーザー、様々な状態） 推奨**

```bash
npm run db:seed:rich
```

**期待される出力:**
```
Seeding rich test data...

=== Creating User A (OVERLOAD) ===
✓ User A created: alice@pace.local
✓ Created 20 tasks (15 this week = OVERLOAD)
✓ StateSnapshot created (OVERLOAD, confidence: 75)
✓ SuggestionEvent created (PLAN_REDUCE, VIEWED)

=== Creating User B (STUCK) ===
✓ User B created: bob@pace.local
✓ Created 8 tasks (5 with high postponeCount = STUCK)
✓ StateSnapshot created (STUCK, confidence: 70)
✓ SuggestionEvent created (TASK_MICROSTEP, VIEWED)

=== Creating User C (NORMAL) ===
✓ User C created: carol@pace.local
✓ Created 10 tasks (6 this week, 2 done = NORMAL)
✓ StateSnapshot created (NORMAL, confidence: 85)
✓ SuggestionEvent created (MOTIVATION_REMIND, ACCEPTED)

=== Seed completed successfully! ===

Test credentials:
  Admin:   admin@pace.local / admin123456
  User A:  alice@pace.local / test123456  (OVERLOAD: 15 tasks this week)
  User B:  bob@pace.local   / test123456  (STUCK: high postponeCount)
  User C:  carol@pace.local / test123456  (NORMAL: balanced, 2/6 done)

Summary:
  - Alice: タスク過多（OVERLOAD状態）、15個の今週タスク、期限超過あり
  - Bob:   停滞中（STUCK状態）、5個のタスクが3回以上postpone済み
  - Carol: バランス良好（NORMAL状態）、6個の今週タスク、2個完了済み
```

**3ユーザーの特徴:**
- **Alice（OVERLOAD）**: 新規事業立ち上げ中、タスク15個/週で負荷過多、ストレス8/10
- **Bob（STUCK）**: 転職準備中、ポートフォリオ作成が停滞、postpone多発
- **Carol（NORMAL）**: マラソンとキャリアをバランス良く管理、完了率高い

### 6. TypeScriptビルド確認

```bash
npx tsc --noEmit
```

エラーが出なければ成功です。

### 7. Prisma Studioの起動（オプション）

データベースの内容を視覚的に確認できます。

```bash
npm run db:studio
```

ブラウザで http://localhost:5555 が開きます。

## テストアカウント

### 基本シード（npm run db:seed）

| ロール | メール | パスワード |
|--------|--------|-----------|
| 管理者 | admin@pace.local | admin123456 |
| ユーザー | test@pace.local | test123456 |

### リッチシード（npm run db:seed:rich）推奨

| ロール | メール | パスワード | 状態 | 特徴 |
|--------|--------|-----------|------|------|
| 管理者 | admin@pace.local | admin123456 | - | 全権限 |
| Alice | alice@pace.local | test123456 | OVERLOAD | タスク15個/週、期限超過あり |
| Bob | bob@pace.local | test123456 | STUCK | postpone多発、停滞中 |
| Carol | carol@pace.local | test123456 | NORMAL | バランス良好、完了率高い |

## 主要なnpmコマンド

```bash
# 開発サーバー起動（UI実装後）
npm run dev

# ビルド
npm run build

# 本番起動
npm start

# データベース関連
npm run db:generate    # Prisma Client生成
npm run db:migrate     # マイグレーション実行
npm run db:push        # スキーマプッシュ（開発用）
npm run db:seed        # シードデータ投入（基本）
npm run db:seed:rich   # リッチシードデータ投入（3ユーザー、推奨）
npm run db:studio      # Prisma Studio起動

# テスト
npm run test:basic     # 基本動作確認
npm run test:auth      # 認証テスト
npm run test:state     # 状態計算テスト
npm run test:suggestions  # 提案生成テスト
npm run test:3users    # 3ユーザー状態確認
npm run test:all       # 全テスト実行

# TypeScript型チェック
npx tsc --noEmit
```

## Server Actionsの動作確認

シード実行後、Node.jsのREPLで動作確認できます。

### 1. 認証のテスト

```typescript
// test-auth.ts
import { signInAction, getCurrentUserAction } from './actions/auth';

async function testAuth() {
  console.log('=== 認証テスト ===\n');

  // ログイン
  console.log('1. ログイン試行...');
  const result = await signInAction({
    email: 'test@pace.local',
    password: 'test123456'
  });
  console.log('✓ ログイン成功:', result.user.email);

  // 現在のユーザー取得
  console.log('\n2. 現在のユーザー取得...');
  const user = await getCurrentUserAction();
  console.log('✓ ユーザー情報:', user);
}

testAuth().catch(console.error);
```

実行:
```bash
npx tsx test-auth.ts
```

### 2. 状態計算のテスト

```typescript
// test-state.ts
import { computeStateSnapshotAction, getLatestStateSnapshotAction } from './actions/state';

async function testState() {
  console.log('=== 状態計算テスト ===\n');

  // 状態計算
  console.log('1. StateSnapshot計算...');
  const result = await computeStateSnapshotAction({
    windowDays: 7,
    selfReport: {
      stress: 5,
      capacity: 7,
      motivation: 6
    }
  });
  console.log('✓ 計算完了:', {
    primaryState: result.snapshot.primaryState,
    confidence: result.snapshot.primaryConfidence,
    signals: result.snapshot.topSignals
  });

  // 最新状態取得
  console.log('\n2. 最新状態取得...');
  const latest = await getLatestStateSnapshotAction();
  console.log('✓ 最新状態:', latest.snapshot);
}

testState().catch(console.error);
```

### 3. 提案生成のテスト

```typescript
// test-suggestions.ts
import { getSuggestionsAction } from './actions/suggestions';
import { createTaskAction } from './actions/tasks';

async function testSuggestions() {
  console.log('=== 提案生成テスト ===\n');

  // テスト用タスクを作成（15個）
  console.log('1. テストタスク作成...');
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  for (let i = 1; i <= 15; i++) {
    await createTaskAction({
      title: `テストタスク ${i}`,
      priority: i * 5,
      plannedWeekStart: weekStart
    });
  }
  console.log('✓ 15個のタスク作成完了');

  // 提案生成
  console.log('\n2. 提案生成...');
  const { suggestions, snapshot } = await getSuggestionsAction({
    forceCompute: true,
    limit: 3
  });

  console.log('✓ 状態:', {
    primaryState: snapshot.primaryState,
    confidence: snapshot.primaryConfidence
  });

  console.log('\n✓ 提案:', suggestions.map(s => ({
    type: s.type,
    title: s.title
  })));
}

testSuggestions().catch(console.error);
```

## トラブルシューティング

### PostgreSQLに接続できない

```bash
# コンテナが起動しているか確認
docker ps

# 起動していなければ再起動
docker start pace-postgres

# ログ確認
docker logs pace-postgres
```

### マイグレーションエラー

```bash
# スキーマをリセット
docker exec -it pace-postgres psql -U pace -d pace_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# マイグレーション再実行
npm run db:migrate -- --name init
```

### Prisma Clientが見つからない

```bash
# Prisma Client再生成
npm run db:generate

# node_modulesクリア
rm -rf node_modules
npm install
npm run db:generate
```

## 次のステップ

### Phase 8: UI実装（オプション）

現在はバックエンド・ドメインロジック・AI統合が完成しています。

Next.js App Routerでフロントエンドを実装する場合:

1. **認証画面**: `/app/(auth)/login/page.tsx`
2. **ダッシュボード**: `/app/(dashboard)/page.tsx`
3. **Vision管理**: `/app/(dashboard)/visions/page.tsx`
4. **タスク一覧**: `/app/(dashboard)/tasks/page.tsx`
5. **提案表示**: コンポーネント化

### デプロイ（Google Cloud）

```bash
# Cloud SQL作成
gcloud sql instances create pace-db \
  --database-version=POSTGRES_16 \
  --tier=db-f1-micro \
  --region=asia-northeast1

# Cloud Run デプロイ
gcloud run deploy pace-app \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated
```

### モニタリング

- Google Cloud Logging
- Prometheus + Grafana
- Sentry（エラートラッキング）

## 実装完了チェックリスト

- [x] Phase 1: Auth + sessionVersion
- [x] Phase 2: Prismaスキーマ
- [x] Phase 3: Resilience パターン
- [x] Phase 4: StateSnapshot計算
- [x] Phase 5: データCRUD（32アクション）
- [x] Phase 6: 提案エンジン（5種類）
- [x] Phase 7: AI生成 + A/Bテスト
- [ ] データベースセットアップ
- [ ] シードデータ投入
- [ ] 動作確認

## 参考リソース

- [Prisma ドキュメント](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Anthropic API](https://docs.anthropic.com/)
- [PostgreSQL 16](https://www.postgresql.org/docs/16/)

## サポート

問題が発生した場合:

1. `IMPLEMENTATION_STATUS.md` で実装状況確認
2. `PHASE*_SUMMARY.md` で各フェーズの詳細確認
3. TypeScriptエラーは `npx tsc --noEmit` で確認
4. データベース状態は `npm run db:studio` で確認
