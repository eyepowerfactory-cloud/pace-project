# Pace (ペース)

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?style=for-the-badge&logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

**ユーザーの自律性を尊重し、停滞からの再開を支援する「伴走型」目標管理アプリ**

[🚀 デモを見る](#) | [📖 ドキュメント](./SETUP_GUIDE.md) | [🐛 バグ報告](https://github.com/eyepowerfactory-cloud/pace-project/issues)

</div>

---

## ✨ 特徴

Paceは従来の目標管理アプリとは異なり、**命令や強制ではなく、提案と選択**を重視します。

- 🎯 **3層計画支援**: Vision (1-5年) → Quarter → Weekly/Daily の段階的な計画
- 🧠 **AI状態推定**: 行動ログから STUCK/OVERLOAD 等を自動推定
- 💡 **パーソナライズされた提案**: 状態に応じた10種類の提案タイプ
- 🛡️ **罪悪感を煽らない設計**: 「すべき」「しなさい」などの命令形を一切使用しない
- 🔒 **セキュアな認証**: JWT + sessionVersion方式で強制ログアウトに対応
- 🔄 **Resilience パターン**: AI API呼び出しの信頼性を確保

## 🎬 デモ

> 🚧 デプロイ後にデモリンクを追加予定

**テストアカウント:**
- 管理者: `admin@pace.local` / `admin123456`
- Alice (OVERLOAD): `alice@pace.local` / `test123456`
- Bob (STUCK): `bob@pace.local` / `test123456`
- Carol (NORMAL): `carol@pace.local` / `test123456`

## 🖼️ スクリーンショット

> 🚧 スクリーンショットは準備中です

## プロジェクト概要

**技術スタック:**
- Next.js 16 (App Router)
- TypeScript
- Prisma + PostgreSQL
- Tailwind CSS
- Anthropic Claude API

**中核機能:**
1. **3層計画支援**: Vision (1y/3y/5y) → Quarter → Weekly/Daily
2. **状態推定**: 行動ログから Stuck/Overload 等を推定（ルールベース）
3. **AI提案**: 状態に応じた提案（ユーザー選択制、10種類のSuggestionType）
4. **sessionVersion方式**: 強制ログアウト機能（管理者がユーザーを即座に無効化）
5. **Paceトーン**: 命令形禁止、仮説提示、許可形式（罪悪感を煽らない）

## セットアップ

### 1. 依存関係インストール

```bash
npm install
```

### 2. 環境変数設定

```bash
cp .env.example .env
```

`.env` を編集して以下を設定:
- `DATABASE_URL`: PostgreSQL接続URL
- `JWT_SECRET`: JWT署名用シークレット（本番環境では変更必須）
- `ANTHROPIC_API_KEY`: Claude API キー

### 3. データベースセットアップ

```bash
# Prisma Client生成
npm run db:generate

# マイグレーション実行
npm run db:migrate

# シードデータ投入（オプション選択）
npm run db:seed        # 基本（管理者 + 1ユーザー）
npm run db:seed:rich   # リッチ（管理者 + 3ユーザー、様々な状態）推奨
```

### 4. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能

## テストアカウント

シード後に以下のアカウントでログイン可能:

**基本シード:**
- **管理者**: `admin@pace.local` / `admin123456`
- **ユーザー**: `test@pace.local` / `test123456`

**リッチシード（推奨）:**
- **管理者**: `admin@pace.local` / `admin123456`
- **Alice (OVERLOAD)**: `alice@pace.local` / `test123456` - タスク過多、ストレス高
- **Bob (STUCK)**: `bob@pace.local` / `test123456` - 停滞中、postpone多発
- **Carol (NORMAL)**: `carol@pace.local` / `test123456` - バランス良好

## プロジェクト構造

```
pace-project/
├── actions/              # Server Actions
│   ├── auth.ts          # 認証（サインアップ、ログイン、ログアウト）
│   ├── admin.ts         # 管理者機能（停止、強制ログアウト）
│   ├── state.ts         # 状態計算
│   ├── vision.ts        # VisionCard CRUD
│   ├── goals.ts         # QuarterGoal CRUD
│   ├── plans.ts         # WeeklyPlan/DailyPlan CRUD
│   └── tasks.ts         # Task CRUD + complete/postpone
├── domains/             # ドメインロジック
│   ├── state/
│   │   ├── signals.ts   # シグナル抽出
│   │   ├── rules.ts     # スコア計算ルール
│   │   └── calculator.ts # StateSnapshot計算エンジン
│   ├── suggestion/      # 提案生成・適用（Phase 5）
│   └── tone/            # Paceトーン検証（Phase 6）
├── lib/
│   ├── prisma.ts        # Prisma Clientシングルトン
│   ├── auth.ts          # 認証ガード（requireActiveSession）
│   ├── auth/
│   │   ├── session.ts   # JWT管理
│   │   └── errors.ts    # 認証エラー定義
│   └── zod.ts           # Zodバリデーションスキーマ
├── services/
│   ├── ai/
│   │   └── client.ts    # Claude APIクライアント（Resilience適用）
│   ├── resilience/
│   │   ├── retry.ts     # Retry with Backoff + Jitter
│   │   ├── timeout.ts   # Timeout
│   │   └── circuit-breaker.ts # Circuit Breaker
│   ├── experiments/     # A/Bテスト（Phase 6）
│   └── observability/   # ログ（Phase 6）
└── prisma/
    ├── schema.prisma    # 完全なPrismaスキーマ
    └── seed.ts          # シードデータ
```

## 実装フェーズ

### Phase 8: UI実装 ✅

- [x] 認証画面（ログイン/サインアップ）
- [x] ダッシュボード（状態表示、AI提案）
- [x] タスク管理画面（CRUD、complete、postpone）
- [x] ビジョン管理画面（1年/3年/5年）
- [x] 四半期目標管理画面（OKR/SMART/自由形式）
- [x] 週次・日次計画画面
- [x] プロフィール画面
- [x] 管理者画面（ユーザー管理、強制ログアウト）
- [x] 共通レイアウトとナビゲーション
- [x] レスポンシブデザイン
- [x] 共通コンポーネント（LoadingSpinner、ErrorAlert、EmptyState）

### Phase 1: 基盤構築（Auth + sessionVersion） ✅

- [x] Prismaスキーマ実装
- [x] 認証システム（JWT + sessionVersion）
- [x] `requireActiveSession` ガード
- [x] 管理者機能（停止、強制ログアウト）
- [x] Resilience パターン（Retry, Timeout, Circuit Breaker）

### Phase 2: Prismaスキーマ完全実装 ✅

- [x] 全Enum/Model定義
- [x] リレーション設定
- [x] インデックス最適化

### Phase 3: Vision/Quarter/Plans/Tasks CRUD ✅

- [x] VisionCard CRUD
- [x] QuarterGoal CRUD
- [x] WeeklyPlan/DailyPlan CRUD
- [x] Task CRUD + complete/postpone

### Phase 4: StateSnapshot 計算（ルールベース） ✅

- [x] シグナル抽出（signals.ts）
- [x] スコア計算ルール（rules.ts）
- [x] StateSnapshot計算エンジン（calculator.ts）

### Phase 5: SuggestionEvent + responses + applySuggestion ✅

- [x] 5種類の提案生成（PLAN_REDUCE, TASK_MICROSTEP等）
- [x] 提案適用（applySuggestion）
- [x] ユーザー応答記録

### Phase 6: AI生成 + PromptVersion + ABテスト ✅

- [x] Claude API統合
- [x] プロンプトバージョン解決
- [x] Paceトーン検証
- [x] Repair + Fallback
- [x] A/Bテスト割り当て（決定論的バケット）
- [x] AiGenerationLog記録

## 重要な設計判断

### sessionVersion方式

ユーザーの `sessionVersion` をインクリメントすることで、全てのJWTを即座に無効化します。

```typescript
// 強制ログアウト
await prisma.user.update({
  where: { id: userId },
  data: { sessionVersion: { increment: 1 } }
});
```

次回アクセス時、`requireActiveSession` がJWTの `sv` とDBの `sessionVersion` を比較し、不一致で401を返します。

### Resilience パターン

AI API呼び出しに以下のパターンを適用:

1. **Retry**: 最大2回、Exponential Backoff + Jitter
2. **Timeout**: 15秒
3. **Circuit Breaker**: 連続失敗時にリクエスト拒否

### Paceトーン

AI生成文言の検証ルール:

- 禁止語: 「すべき」「しなさい」「必ず」「サボ」「怠け」「ダメ」「失敗」
- 禁止パターン: 「あなたは〜だ」（断定ラベル）、「今すぐ〜しましょう」（命令形）

違反時は1回だけRepair実行、失敗時はFallback文言を使用。

## データベーススキーマ

主要モデル:

- **User**: id, email, passwordHash, role, status, **sessionVersion**
- **VisionCard**: Vision（1y/3y/5y）
- **QuarterGoal**: 四半期目標
- **Task**: タスク（priority, postponeCount, originType）
- **StateSnapshot**: 状態スナップショット（scoresJson, primaryState）
- **SuggestionEvent**: 提案イベント（suggestionType, response）
- **PromptVersion**: プロンプトバージョン（hash, status）
- **Experiment**: A/Bテスト実験
- **AiGenerationLog**: AI生成ログ（validationOk, repairUsed, fallbackUsed）
- **AdminAuditLog**: 管理者操作ログ

## コマンド

```bash
# 開発
npm run dev

# ビルド
npm run build

# 本番起動
npm start

# データベース
npm run db:generate    # Prisma Client生成
npm run db:migrate     # マイグレーション
npm run db:push        # スキーマプッシュ（開発用）
npm run db:seed        # シードデータ投入
npm run db:studio      # Prisma Studio起動

# テスト
npm run test:basic     # 基本動作確認
npm run test:auth      # 認証テスト
npm run test:state     # 状態計算テスト
npm run test:suggestions  # 提案生成テスト
npm run test:all       # 全テスト実行

# リント
npm run lint
```

## デプロイ

### Google Cloud (Cloud Run + Cloud SQL)

1. Cloud SQL (PostgreSQL) インスタンス作成
2. `DATABASE_URL` を Cloud SQL接続文字列に設定
3. Cloud Run にデプロイ:

```bash
gcloud run deploy pace-app \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL="postgresql://..." \
  --set-env-vars JWT_SECRET="..." \
  --set-env-vars ANTHROPIC_API_KEY="..."
```

## 🤝 コントリビューション

コントリビューションを歓迎します！以下の方法で参加できます：

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

バグ報告や機能要望は [Issues](https://github.com/eyepowerfactory-cloud/pace-project/issues) からお願いします。

## 🙏 謝辞

このプロジェクトは以下の技術によって支えられています：

- [Next.js](https://nextjs.org/) - Reactフレームワーク
- [Prisma](https://www.prisma.io/) - ORMデータベースツールキット
- [Anthropic Claude](https://www.anthropic.com/) - AI API
- [Tailwind CSS](https://tailwindcss.com/) - ユーティリティファーストCSSフレームワーク
- [Neon](https://neon.tech/) - サーバーレスPostgreSQL

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルを参照してください。

## 📧 お問い合わせ

プロジェクトに関する質問や提案は [Issues](https://github.com/eyepowerfactory-cloud/pace-project/issues) でお願いします。

---

<div align="center">

**Built with ❤️ using Next.js and Claude AI**

⭐ このプロジェクトが役に立ったら、ぜひスターをお願いします！

</div>
