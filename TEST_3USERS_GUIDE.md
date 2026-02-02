# 3ユーザーテストガイド

## 概要

Paceプロジェクトの動作確認のため、3人の異なる状態のユーザーダミーデータを作成しました。

### ユーザープロファイル

| ユーザー | メール | 状態 | 特徴 |
|---------|--------|------|------|
| **Alice** | alice@pace.local | OVERLOAD | タスク過多、期限超過多数 |
| **Bob** | bob@pace.local | STUCK | 停滞中、postpone多発 |
| **Carol** | carol@pace.local | NORMAL | バランス良好、完了率高い |

全ユーザーのパスワード: `test123456`

---

## Alice（OVERLOAD状態）

### プロフィール
- **表示名**: Alice（タスク過多）
- **状態**: OVERLOAD（信頼度75%）
- **ストレス**: 8/10
- **キャパシティ**: 3/10
- **モチベーション**: 6/10

### Vision
1. **1年**: 新規事業を立ち上げる（重要度90）
2. **3年**: 持続可能なビジネスモデル確立（重要度85）

### QuarterGoal
1. **MVP開発完了** - プロダクト開発
   - OKR: コア機能5つ実装、ベータユーザー20人獲得
2. **マーケティング基盤構築** - 集客
   - OKR: SNSフォロワー500人、ブログ記事10本公開

### Task状況
- **今週のタスク数**: 15個（過多）
- **期限超過**: 複数あり
- **優先度**: 幅広く分散
- **特徴**: 並行作業が多すぎる、キャパオーバー

### 提案履歴
- **PLAN_REDUCE**: タスクを減らしてみませんか？（VIEWED）

### テストポイント
- OVERLOAD状態の検出精度
- PLAN_REDUCE提案の適切性
- タスク削減提案の受け入れフロー

---

## Bob（STUCK状態）

### プロフィール
- **表示名**: Bob（停滞中）
- **状態**: STUCK（信頼度70%）
- **ストレス**: 6/10
- **キャパシティ**: 5/10
- **モチベーション**: 3/10
- **効力感**: 3/10

### Vision
1. **1年**: 転職して新しい環境で働く（重要度70）

### QuarterGoal
1. **ポートフォリオ完成** - 転職準備
   - SMART: GitHubに3つのプロジェクトを公開

### Task状況
- **今週のタスク数**: 8個
- **postpone多発**: 5個のタスクが3回以上postpone済み
- **作成からの経過**: 3週間前から放置
- **特徴**: なかなか手をつけられない大きなタスク

### 提案履歴
- **TASK_MICROSTEP**: 小さなステップに分けてみませんか？（VIEWED）

### テストポイント
- STUCK状態の検出精度
- postponeCountに基づく状態判定
- TASK_MICROSTEP提案の適切性
- マイクロステップ分解の効果

---

## Carol（NORMAL状態）

### プロフィール
- **表示名**: Carol（バランス良好）
- **状態**: NORMAL（信頼度85%）
- **ストレス**: 4/10
- **キャパシティ**: 7/10
- **モチベーション**: 8/10
- **効力感**: 8/10

### Vision
1. **1年**: フルマラソン完走（重要度75）
2. **3年**: リーダーポジションに昇進（重要度80）
3. **5年**: 家族との時間を大切にする（重要度95）

### QuarterGoal
1. **ハーフマラソン完走** - ランニング
   - SMART: 21.0975km完走、週3回トレーニング
2. **チームリーダースキル習得** - キャリア
   - OKR: マネジメント本3冊読破、メンター経験2名

### Task状況
- **今週のタスク数**: 6個（適量）
- **完了済み**: 2個（完了率33%）
- **進行中**: 2個
- **未着手**: 2個
- **先週**: 4個完了（完了率100%）
- **特徴**: バランスが取れている、着実に進行

### 提案履歴
- **MOTIVATION_REMIND**: 順調に進んでいますね！（ACCEPTED）

### テストポイント
- NORMAL状態の維持
- 適切なタスク数の判定
- ポジティブな提案（MOTIVATION_REMIND）の効果
- 完了率の高さが状態に反映されているか

---

## セットアップ手順

### 1. リッチシードデータ投入

```bash
cd /Users/apple/AI/01_dev/pace-project

# PostgreSQL起動（未起動の場合）
docker run -d \
  --name pace-postgres \
  -e POSTGRES_USER=pace \
  -e POSTGRES_PASSWORD=pace123 \
  -e POSTGRES_DB=pace_db \
  -p 5432:5432 \
  postgres:16

# マイグレーション実行（初回のみ）
npm run db:migrate -- --name init

# リッチシードデータ投入
npm run db:seed:rich
```

### 2. 3ユーザー状態確認

```bash
npm run test:3users
```

**期待される出力:**
```
=== 3人のテストユーザー状態確認 ===

========== Alice (OVERLOAD) ==========
ユーザー: Alice（タスク過多） (alice@pace.local)

【Vision】
  - 1年: 新規事業を立ち上げる (重要度: 90)
  - 3年: 持続可能なビジネスモデル確立 (重要度: 85)

【QuarterGoal】
  - MVP開発完了 (プロダクト開発, OKR)
  - マーケティング基盤構築 (集客, OKR)

【Task統計】
  - 総タスク数: 20
  - 今週のタスク数: 15
  - 完了済み: 0
  - 期限超過: 5
  - Postpone多発タスク: 0個

【最新StateSnapshot】
  - 状態: OVERLOAD
  - 信頼度: 75
  - 主要シグナル: ["overdue_count_high","weekly_task_count_very_high"]
  - 自己申告:
    * ストレス: 8/10
    * キャパシティ: 3/10
    * モチベーション: 6/10

【SuggestionEvent履歴】
  1. PLAN_REDUCE - VIEWED
     "タスクを減らしてみませんか？"

【パフォーマンス指標】
  - 今週の完了率: 0.0% (0/15)
  - 全体完了率: 0.0% (0/20)


========== Bob (STUCK) ==========
...

========== Carol (NORMAL) ==========
...

=== 比較サマリー ===

| ユーザー        | 状態     | 信頼度 | 今週 | 完了 | 超過 | 停滞 |
|----------------|----------|--------|------|------|------|------|
| Alice (OVERLOAD) | OVERLOAD |  75 |   15 |    0 |    5 |    0 |
| Bob (STUCK)      | STUCK    |  70 |    8 |    0 |    0 |    5 |
| Carol (NORMAL)   | NORMAL   |  85 |    6 |    6 |    0 |    0 |
```

---

## テストシナリオ

### シナリオ1: OVERLOAD状態の提案生成

```bash
# Aliceでログイン
# getSuggestionsAction を呼び出し
# → PLAN_REDUCE 提案が生成されることを確認

# 提案を受け入れた場合
# → 5個のタスクが来週に延期される
# → 今週のタスク数が10個に減る
# → 状態が OVERLOAD → NORMAL に改善
```

### シナリオ2: STUCK状態の提案生成

```bash
# Bobでログイン
# getSuggestionsAction を呼び出し
# → TASK_MICROSTEP 提案が生成されることを確認

# 提案を受け入れた場合
# → 停滞タスクが3つのマイクロステップに分解される
# → 各ステップが新しいタスクとして作成される
# → 元のタスクは削除またはアーカイブ
```

### シナリオ3: NORMAL状態の維持

```bash
# Carolでログイン
# getSuggestionsAction を呼び出し
# → MOTIVATION_REMIND 提案が生成される（任意）

# タスクを1つ完了
# → 完了率が上昇
# → NORMAL状態が維持される
# → 次回の提案はポジティブなもの
```

---

## Prisma Studioでの確認

```bash
npm run db:studio
```

ブラウザで http://localhost:5555 が開きます。

### 確認項目

1. **User テーブル**
   - Alice, Bob, Carol が存在
   - sessionVersion = 1

2. **VisionCard テーブル**
   - Alice: 2個（1年、3年）
   - Bob: 1個（1年）
   - Carol: 3個（1年、3年、5年）

3. **QuarterGoal テーブル**
   - Alice: 2個
   - Bob: 1個
   - Carol: 2個

4. **Task テーブル**
   - Alice: 20個（15個が今週）
   - Bob: 8個（5個がpostponeCount >= 3）
   - Carol: 10個（6個が今週、2個完了済み）

5. **StateSnapshot テーブル**
   - Alice: OVERLOAD, confidence 75
   - Bob: STUCK, confidence 70
   - Carol: NORMAL, confidence 85

6. **SuggestionEvent テーブル**
   - 各ユーザー1個ずつ

---

## 次のステップ

### 1. 状態遷移テスト

```bash
# Aliceのタスクを5個完了させる
# → OVERLOAD → NORMAL に遷移するか確認

# Bobのタスクを1つずつ完了させる
# → STUCK → NORMAL に遷移するか確認

# Carolに大量のタスクを追加
# → NORMAL → OVERLOAD に遷移するか確認
```

### 2. 提案生成テスト

```bash
npm run test:suggestions
```

### 3. UI実装（Phase 8）

各ユーザーでログインして、以下を実装:
- ダッシュボード（状態表示）
- タスク一覧（状態別フィルター）
- 提案カード（提案の表示・応答）
- Vision/Goal管理画面

---

## トラブルシューティング

### シードデータが投入できない

```bash
# 既存データをクリア
docker exec -it pace-postgres psql -U pace -d pace_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# マイグレーション再実行
npm run db:migrate -- --name init

# シード再実行
npm run db:seed:rich
```

### StateSnapshotが想定と異なる

シグナル抽出ロジックを確認:
- `domains/state/signals.ts`
- `domains/state/rules.ts`

デバッグ出力を追加:
```typescript
console.log('Extracted signals:', signals);
console.log('Calculated scores:', scores);
```

### 提案が生成されない

提案生成条件を確認:
- `domains/suggestion/payloads/`

各提案タイプの最小条件:
- PLAN_REDUCE: 今週のタスク >= 5個
- TASK_MICROSTEP: postponeCount >= 3
- PRIORITY_FOCUS: Goal数 >= 3個
- MOTIVATION_REMIND: Vision存在、低モチベーション

---

## まとめ

3ユーザーテストデータにより、以下が検証可能:

1. **状態推定精度**: OVERLOAD/STUCK/NORMALの正確な判定
2. **提案生成**: 状態に応じた適切な提案
3. **提案適用**: 提案受け入れ後のデータ変更
4. **状態遷移**: タスク完了による状態改善

これらのテストを通じて、Paceアプリの中核機能が正しく動作することを確認できます。
