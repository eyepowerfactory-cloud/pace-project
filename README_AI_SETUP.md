# Pace - AI生成機能セットアップガイド

## 🚀 クイックスタート

### 1. Anthropic API Keyの取得と設定

#### APIキー取得
1. https://console.anthropic.com/settings/keys にアクセス
2. 「Create Key」ボタンをクリック
3. キー名を入力（例: "pace-development"）
4. APIキーをコピー（`sk-ant-api03-...`で始まる文字列）

#### 環境変数に設定
`.env` ファイルを編集：

```bash
# Anthropic Claude API Key
ANTHROPIC_API_KEY="sk-ant-api03-YOUR-KEY-HERE"
```

### 2. 動作確認

#### AI生成機能のテスト
```bash
npm run test:ai
```

成功すると、以下のような出力が表示されます：
```
=== AI生成機能テスト ===

✓ ANTHROPIC_API_KEY 設定済み

【テスト1】PLAN_REDUCE 提案生成...
✓ 生成成功
  タイトル: タスクを整理してみませんか？
  メッセージ: 今週のタスクが多いようです...
```

#### バックエンド統合テスト
```bash
npm run test:backend
```

提案生成時に、AIが生成したタイトルとメッセージが表示されることを確認：
```
2. 提案生成テスト...
   ✓ 1個の提案を生成
   1. PLAN_REDUCE
      タイトル: タスクを整理してみませんか？
      本文: 今週のタスクが多いようです。いくつかを来週に...
```

### 3. UIでの確認

1. 開発サーバーを起動（まだの場合）:
   ```bash
   npm run dev
   ```

2. ブラウザで http://localhost:3001 を開く

3. テストユーザーでログイン:
   - Alice（OVERLOAD状態）
   - Bob（STUCK状態）
   - Carol（バランス良好）

4. ダッシュボードで提案を確認

5. 「更新」ボタンをクリックして新しい提案を生成
   - AI生成されたタイトルとメッセージが表示されます

---

## 🔍 トラブルシューティング

### APIキーが設定されていない
**エラー**: `ANTHROPIC_API_KEY is not set`

**解決方法**:
1. `.env` ファイルを開く
2. `ANTHROPIC_API_KEY="your-api-key-here"` を実際のキーに置き換え
3. 開発サーバーを再起動: `npm run dev`

### Fallback文言が表示される
**症状**: 提案のタイトルが常に「タスクを整理してみませんか？」（固定文言）

**原因**:
- APIキーが無効
- APIレート制限に達している
- ネットワークエラー

**確認方法**:
```bash
npm run test:ai
```

エラーメッセージを確認し、APIキーの有効性をチェック。

### プロンプトテンプレートがない
**エラー**: `No active PromptVersion found for key: SUGGESTION_COPY`

**解決方法**:
```bash
# シードデータを再投入
npm run db:seed:rich
```

---

## 📊 AI生成の仕組み

### フロー

1. **ユーザーが「更新」ボタンをクリック**
   ↓
2. **状態計算**: ユーザーのタスク状況から状態を推定（OVERLOAD, STUCKなど）
   ↓
3. **提案生成**: 状態に応じた提案タイプを選択（PLAN_REDUCEなど）
   ↓
4. **AI生成**: Claude APIにリクエスト
   - PromptTemplateから最新のACTIVEバージョンを取得
   - コンテキスト変数を置換（タスク数、状態スコア等）
   - Claude APIで文言生成
   ↓
5. **トーン検証**: Paceトーン原則に違反していないかチェック
   - 命令形禁止（「〜すべき」等）
   - 罪悪感を煽らない（「サボ」「怠け」等禁止）
   ↓
6. **Repair（必要時）**: トーン違反があれば修正を依頼
   ↓
7. **Fallback（失敗時）**: 修正に失敗したら固定文言を使用
   ↓
8. **ログ記録**: AiGenerationLogに記録
   - API呼び出し時間
   - 入出力データ
   - トーン違反の有無
   - Repair/Fallback使用フラグ
   ↓
9. **UIに表示**: 生成された提案をダッシュボードに表示

---

## 🎯 確認ポイント

### ✅ AI生成が正常に動作している
- [ ] APIキーが設定されている
- [ ] `npm run test:ai` が成功する
- [ ] UIで「更新」すると新しい文言が生成される
- [ ] 文言がPaceトーン原則に従っている（命令形なし、許可形式）

### ✅ Fallbackが正常に動作している
- [ ] APIキーを無効にしても提案が表示される
- [ ] Fallback文言は固定で「〜してみませんか？」形式

### ✅ ログが記録されている
Prisma Studioでデータを確認:
```bash
npm run db:studio
```

`AiGenerationLog` テーブルを開き、以下を確認：
- `validationOk`: true/false
- `repairUsed`: Repair機能を使ったか
- `fallbackUsed`: Fallback文言を使ったか
- `violationsJson`: トーン違反の詳細
- `latencyMs`: API呼び出し時間

---

## 💰 コスト管理

### Claude API使用料金
- Model: claude-sonnet-4-5-20250929
- 入力: $3 / 1M tokens
- 出力: $15 / 1M tokens

### 推定コスト（開発環境）
- 提案1件生成: 約0.001〜0.002 USD
- 1日100回生成: 約0.10〜0.20 USD
- 月間3000回: 約3〜6 USD

### コスト削減のヒント
1. **開発中はFallbackを活用**: APIキーなしでも動作確認可能
2. **プロンプトを最適化**: 不要な情報を削減
3. **キャッシングの活用**: 同じコンテキストでは結果を再利用

---

## 📝 次のステップ

AI生成機能が正常に動作したら、Phase 7（UI完全実装）に進みましょう：

1. Vision管理画面
2. QuarterGoal管理画面
3. Task管理画面
4. Weekly/DailyPlan画面

これらの実装により、ユーザーがブラウザですべての機能を使用できるようになります。

---

**参考ドキュメント**:
- [PHASE6_COMPLETE.md](./PHASE6_COMPLETE.md) - Phase 6実装完了レポート
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
