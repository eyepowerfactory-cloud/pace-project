// 提案生成テストスクリプト

import { prisma } from './lib/prisma';
import { computeStateSnapshotAction } from './actions/state';
import {
  getSuggestionsAction,
  recordSuggestionResponseAction,
  applySuggestionAction,
} from './actions/suggestions';
import { createTaskAction } from './actions/tasks';
import { createVisionCardAction } from './actions/vision';

async function testSuggestions() {
  console.log('=== Pace プロジェクト 提案生成テスト ===\n');

  try {
    // テストユーザーIDを取得
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@pace.local' },
      select: { id: true, email: true },
    });

    if (!testUser) {
      console.error('テストユーザーが見つかりません。先にシードを実行してください。');
      process.exit(1);
    }

    console.log(`テストユーザー: ${testUser.email}\n`);

    // 1. OVERLOAD状態の作成
    console.log('1. OVERLOAD状態の作成（タスク15個）...');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const taskPromises = [];
    for (let i = 1; i <= 15; i++) {
      taskPromises.push(
        createTaskAction({
          title: `OVERLOAD テストタスク ${i}`,
          description: `提案生成テスト用タスク ${i}`,
          priority: i * 5,
          plannedWeekStart: weekStart,
          effortMin: 30,
        })
      );
    }

    await Promise.all(taskPromises);
    console.log('   ✓ 15個のタスクを作成');
    console.log('');

    // 2. StateSnapshot計算
    console.log('2. StateSnapshot計算...');
    const snapshot = await computeStateSnapshotAction({
      windowDays: 7,
      selfReport: {
        stress: 8,
        capacity: 4,
        motivation: 5,
      },
    });

    console.log('   ✓ StateSnapshot計算完了');
    console.log(`     - primaryState: ${snapshot.snapshot.primaryState}`);
    console.log(`     - primaryConfidence: ${snapshot.snapshot.primaryConfidence}`);
    console.log('');

    // 3. 提案生成（PLAN_REDUCE）
    console.log('3. 提案生成（PLAN_REDUCE期待）...');
    const suggestionsResult = await getSuggestionsAction({
      forceCompute: true,
      limit: 3,
      context: 'HOME',
    });

    if (suggestionsResult.success && suggestionsResult.suggestions) {
      console.log(`   ✓ 提案生成成功（${suggestionsResult.suggestions.length}件）`);
      suggestionsResult.suggestions.forEach((s, i) => {
        console.log(`     ${i + 1}. ${s.type}`);
        console.log(`        - タイトル: ${s.title}`);
        console.log(`        - メッセージ: ${s.message}`);
        console.log(`        - eventId: ${s.eventId}`);
      });
    } else {
      console.log('   ⚠ 提案生成なし（状態によっては正常）');
    }
    console.log('');

    // 4. 提案への応答（VIEWED）
    if (suggestionsResult.success && suggestionsResult.suggestions && suggestionsResult.suggestions.length > 0) {
      const firstSuggestion = suggestionsResult.suggestions[0];

      console.log('4. 提案への応答（VIEWED）...');
      const viewResponse = await recordSuggestionResponseAction(firstSuggestion.eventId, {
        response: 'VIEWED',
      });

      if (viewResponse.success) {
        console.log('   ✓ VIEWED応答記録成功');
      } else {
        console.log('   ✗ VIEWED応答記録失敗:', viewResponse.error);
      }
      console.log('');

      // 5. 提案の受け入れ（ACCEPTED）
      console.log('5. 提案の受け入れ（ACCEPTED）...');
      const acceptResponse = await recordSuggestionResponseAction(firstSuggestion.eventId, {
        response: 'ACCEPTED',
      });

      if (acceptResponse.success) {
        console.log('   ✓ ACCEPTED応答記録成功');
      } else {
        console.log('   ✗ ACCEPTED応答記録失敗:', acceptResponse.error);
      }
      console.log('');

      // 6. 提案の適用
      if (firstSuggestion.type === 'PLAN_REDUCE') {
        console.log('6. 提案の適用（PLAN_REDUCE）...');
        const applyResult = await applySuggestionAction(firstSuggestion.eventId, {
          selectedTaskIds: firstSuggestion.payload?.candidates?.slice(0, 3).map((c: any) => c.taskId),
        });

        if (applyResult.success) {
          console.log('   ✓ 提案適用成功');
          console.log('     - 3個のタスクを来週に延期');
        } else {
          console.log('   ✗ 提案適用失敗:', applyResult.error);
        }
        console.log('');
      }
    }

    // 7. Vision不足でVISION_CREATE_ASSIST提案をテスト
    console.log('7. VISION_CREATE_ASSIST提案テスト...');

    // 既存Visionを削除（テスト用）
    await prisma.visionCard.deleteMany({
      where: { userId: testUser.id },
    });
    console.log('   - 既存Visionを削除');

    // StateSnapshot再計算
    await computeStateSnapshotAction({
      windowDays: 7,
      selfReport: {
        clarity: 3,
        motivation: 4,
      },
    });

    // 提案生成
    const visionSuggestions = await getSuggestionsAction({
      forceCompute: true,
      limit: 3,
      context: 'HOME',
    });

    const visionAssist = visionSuggestions.suggestions?.find(
      (s) => s.type === 'VISION_CREATE_ASSIST'
    );

    if (visionAssist) {
      console.log('   ✓ VISION_CREATE_ASSIST提案生成成功');
      console.log(`     - タイトル: ${visionAssist.title}`);
      console.log(`     - メッセージ: ${visionAssist.message}`);
    } else {
      console.log('   ⚠ VISION_CREATE_ASSIST提案なし');
    }
    console.log('');

    // 8. 提案統計の確認
    console.log('8. 提案統計の確認...');
    const suggestionEvents = await prisma.suggestionEvent.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    console.log(`   ✓ 提案イベント数: ${suggestionEvents.length}`);

    const responseCounts = {
      VIEWED: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      DISMISSED: 0,
      null: 0,
    };

    suggestionEvents.forEach((e) => {
      const response = e.response || 'null';
      responseCounts[response as keyof typeof responseCounts]++;
    });

    console.log('     - 応答内訳:');
    console.log(`       VIEWED: ${responseCounts.VIEWED}`);
    console.log(`       ACCEPTED: ${responseCounts.ACCEPTED}`);
    console.log(`       REJECTED: ${responseCounts.REJECTED}`);
    console.log(`       DISMISSED: ${responseCounts.DISMISSED}`);
    console.log(`       未応答: ${responseCounts.null}`);
    console.log('');

    // 9. AI生成ログの確認（Phase 7機能）
    console.log('9. AI生成ログの確認...');
    const aiLogs = await prisma.aiGenerationLog.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (aiLogs.length > 0) {
      console.log(`   ✓ AI生成ログ数: ${aiLogs.length}`);
      aiLogs.forEach((log, i) => {
        console.log(`     ${i + 1}. ${log.type} (${log.modelName})`);
        console.log(`        - validationOk: ${log.validationOk}`);
        console.log(`        - repairUsed: ${log.repairUsed}`);
        console.log(`        - fallbackUsed: ${log.fallbackUsed}`);
        console.log(`        - latencyMs: ${log.latencyMs}`);
      });
    } else {
      console.log('   ⚠ AI生成ログなし（ANTHROPIC_API_KEYが設定されていない場合は正常）');
    }
    console.log('');

    console.log('=== 提案生成テスト完了 ===\n');
    console.log('確認事項:');
    console.log('  1. OVERLOAD状態でPLAN_REDUCE提案が生成される');
    console.log('  2. 提案への応答（VIEWED/ACCEPTED/REJECTED）が記録される');
    console.log('  3. 提案適用でタスクが実際に変更される');
    console.log('  4. Vision不足でVISION_CREATE_ASSIST提案が生成される');
    console.log('  5. AI生成ログが記録される（API設定時）');
    console.log('');
    console.log('次のステップ:');
    console.log('  - npm run db:studio でデータ確認');
    console.log('  - UI実装（Phase 8、オプション）');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSuggestions();
