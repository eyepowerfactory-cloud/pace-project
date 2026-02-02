// バックエンドロジック直接テスト

import { prisma } from './lib/prisma';
import { computeStateSnapshot } from './domains/state/calculator';
import { generateSuggestions } from './domains/suggestion/generator';

async function testBackend() {
  console.log('=== Paceバックエンドロジックテスト ===\n');

  try {
    // テストユーザー取得
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['alice@pace.local', 'bob@pace.local', 'carol@pace.local'],
        },
      },
      select: { id: true, email: true, displayName: true },
    });

    if (users.length === 0) {
      console.error('テストユーザーが見つかりません。');
      console.error('先にシードを実行してください: npm run db:seed:rich');
      process.exit(1);
    }

    console.log(`✓ ${users.length}人のテストユーザーを取得\n`);

    for (const user of users) {
      console.log(`========== ${user.displayName} (${user.email}) ==========\n`);

      // 1. 状態計算テスト
      console.log('1. 状態計算テスト...');
      const snapshot = await computeStateSnapshot(user.id, 7);

      console.log('   ✓ StateSnapshot計算完了');
      console.log(`     - primaryState: ${snapshot.primaryState}`);
      console.log(`     - primaryConfidence: ${snapshot.primaryConfidence}`);
      console.log(`     - windowDays: ${snapshot.windowDays}`);

      if (snapshot.topSignalsJson && Array.isArray(snapshot.topSignalsJson)) {
        console.log(`     - topSignals: ${snapshot.topSignalsJson.join(', ')}`);
      }

      if (snapshot.selfReportJson) {
        console.log(`     - selfReport: ${JSON.stringify(snapshot.selfReportJson)}`);
      }
      console.log('');

      // 2. 提案生成テスト
      console.log('2. 提案生成テスト...');
      const suggestions = await generateSuggestions(user.id, snapshot, 3);

      console.log(`   ✓ ${suggestions.length}個の提案を生成`);
      suggestions.forEach((suggestion, idx) => {
        console.log(`   ${idx + 1}. ${suggestion.type}`);
        console.log(`      タイトル: ${suggestion.titleText || '(なし)'}`);
        if (suggestion.bodyText) {
          const body = suggestion.bodyText.length > 50
            ? suggestion.bodyText.substring(0, 50) + '...'
            : suggestion.bodyText;
          console.log(`      本文: ${body}`);
        } else {
          console.log(`      本文: (なし)`);
        }
        if (suggestion.options && suggestion.options.length > 0) {
          console.log(`      選択肢: ${suggestion.options.map(o => o.label).join(', ')}`);
        }
      });
      console.log('');

      // 3. タスク統計
      console.log('3. タスク統計...');
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);

      const [totalTasks, thisWeekTasks, doneTasks, overdueTasks, postponedTasks] =
        await Promise.all([
          prisma.task.count({ where: { userId: user.id } }),
          prisma.task.count({
            where: { userId: user.id, plannedWeekStart: weekStart },
          }),
          prisma.task.count({ where: { userId: user.id, status: 'DONE' } }),
          prisma.task.count({
            where: {
              userId: user.id,
              status: { not: 'DONE' },
              dueDate: { lt: new Date() },
            },
          }),
          prisma.task.count({
            where: { userId: user.id, postponeCount: { gte: 3 } },
          }),
        ]);

      console.log(`   - 総タスク数: ${totalTasks}`);
      console.log(`   - 今週のタスク: ${thisWeekTasks}`);
      console.log(`   - 完了済み: ${doneTasks}`);
      console.log(`   - 期限超過: ${overdueTasks}`);
      console.log(`   - 延期多発(≥3回): ${postponedTasks}`);
      console.log('');

      // 4. Vision/Goal確認
      console.log('4. Vision/Goal確認...');
      const [visionCount, goalCount] = await Promise.all([
        prisma.visionCard.count({ where: { userId: user.id } }),
        prisma.quarterGoal.count({ where: { userId: user.id } }),
      ]);

      console.log(`   - Vision: ${visionCount}個`);
      console.log(`   - QuarterGoal: ${goalCount}個`);
      console.log('\n');
    }

    // 5. 全体サマリー
    console.log('========== 全体サマリー ==========\n');

    const allSnapshots = await prisma.stateSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { displayName: true },
        },
      },
    });

    console.log('最新のStateSnapshot (上位10件):');
    allSnapshots.forEach((s, idx) => {
      console.log(
        `  ${idx + 1}. ${s.user.displayName}: ${s.primaryState} (${s.primaryConfidence}%) - ${s.createdAt.toLocaleString('ja-JP')}`
      );
    });
    console.log('');

    const suggestionEvents = await prisma.suggestionEvent.count();
    const acceptedSuggestions = await prisma.suggestionEvent.count({
      where: { response: 'ACCEPTED' },
    });
    const dismissedSuggestions = await prisma.suggestionEvent.count({
      where: { response: 'DISMISSED' },
    });

    console.log('提案統計:');
    console.log(`  - 総提案数: ${suggestionEvents}`);
    console.log(`  - 受け入れ: ${acceptedSuggestions}`);
    console.log(`  - 却下: ${dismissedSuggestions}`);
    console.log(`  - 未応答: ${suggestionEvents - acceptedSuggestions - dismissedSuggestions}`);
    console.log('');

    console.log('=== テスト完了 ===');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testBackend();
