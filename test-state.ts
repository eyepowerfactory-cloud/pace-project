// 状態計算テストスクリプト

import { prisma } from './lib/prisma';
import { computeStateSnapshot, getLatestStateSnapshot } from './domains/state/calculator';

async function testState() {
  console.log('=== Pace プロジェクト 状態計算テスト ===\n');

  try {
    // テストユーザーIDを取得（aliceを使用）
    const testUser = await prisma.user.findUnique({
      where: { email: 'alice@pace.local' },
      select: { id: true, email: true },
    });

    if (!testUser) {
      console.error('テストユーザーが見つかりません。先にシードを実行してください: npm run db:seed:rich');
      process.exit(1);
    }

    console.log(`テストユーザー: ${testUser.email}\n`);

    // 1. 初期状態計算（タスクなし）
    console.log('1. 初期状態計算（タスクなし）...');
    const initialSnapshot = await computeStateSnapshotAction({
      windowDays: 7,
    });

    console.log('   ✓ StateSnapshot計算完了');
    console.log(`     - primaryState: ${initialSnapshot.snapshot.primaryState}`);
    console.log(`     - primaryConfidence: ${initialSnapshot.snapshot.primaryConfidence}`);
    console.log(`     - windowDays: ${initialSnapshot.snapshot.windowDays}`);
    console.log('');

    // 2. タスクを大量に作成（OVERLOAD状態をシミュレート）
    console.log('2. タスク大量作成（OVERLOAD状態シミュレート）...');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const taskPromises = [];
    for (let i = 1; i <= 15; i++) {
      taskPromises.push(
        createTaskAction({
          title: `テストタスク ${i}`,
          description: `OVERLOAD状態テスト用タスク ${i}`,
          priority: i * 5,
          plannedWeekStart: weekStart,
          effortMin: 30,
        })
      );
    }

    await Promise.all(taskPromises);
    console.log('   ✓ 15個のタスクを作成');
    console.log('');

    // 3. OVERLOAD状態の計算
    console.log('3. OVERLOAD状態の計算...');
    const overloadSnapshot = await computeStateSnapshotAction({
      windowDays: 7,
      selfReport: {
        stress: 8,
        capacity: 4,
        motivation: 5,
      },
    });

    console.log('   ✓ StateSnapshot計算完了');
    console.log(`     - primaryState: ${overloadSnapshot.snapshot.primaryState}`);
    console.log(`     - primaryConfidence: ${overloadSnapshot.snapshot.primaryConfidence}`);
    console.log(`     - topSignals: ${JSON.stringify(overloadSnapshot.snapshot.topSignals)}`);
    console.log('');

    // 4. postpone操作でSTUCK状態をシミュレート
    console.log('4. Postpone操作でSTUCK状態シミュレート...');
    const tasks = await prisma.task.findMany({
      where: {
        userId: testUser.id,
        status: 'NOT_STARTED',
      },
      take: 5,
    });

    for (const task of tasks) {
      await postponeTaskAction(task.id);
    }
    console.log(`   ✓ ${tasks.length}個のタスクをpostpone`);
    console.log('');

    // 5. STUCK状態の計算
    console.log('5. STUCK状態の計算...');
    const stuckSnapshot = await computeStateSnapshotAction({
      windowDays: 7,
      selfReport: {
        stress: 6,
        capacity: 5,
        motivation: 3,
        efficacy: 3,
      },
    });

    console.log('   ✓ StateSnapshot計算完了');
    console.log(`     - primaryState: ${stuckSnapshot.snapshot.primaryState}`);
    console.log(`     - primaryConfidence: ${stuckSnapshot.snapshot.primaryConfidence}`);
    console.log(`     - topSignals: ${JSON.stringify(stuckSnapshot.snapshot.topSignals)}`);
    console.log('');

    // 6. タスクを完了してNORMAL状態に戻す
    console.log('6. タスク完了でNORMAL状態に戻す...');
    const incompleteTasks = await prisma.task.findMany({
      where: {
        userId: testUser.id,
        status: { not: 'DONE' },
      },
      take: 10,
    });

    for (const task of incompleteTasks) {
      await completeTaskAction(task.id, {
        actualEffortMin: 25,
      });
    }
    console.log(`   ✓ ${incompleteTasks.length}個のタスクを完了`);
    console.log('');

    // 7. NORMAL状態の計算
    console.log('7. NORMAL状態の計算...');
    const normalSnapshot = await computeStateSnapshotAction({
      windowDays: 7,
      selfReport: {
        stress: 4,
        capacity: 7,
        motivation: 7,
        efficacy: 7,
      },
    });

    console.log('   ✓ StateSnapshot計算完了');
    console.log(`     - primaryState: ${normalSnapshot.snapshot.primaryState}`);
    console.log(`     - primaryConfidence: ${normalSnapshot.snapshot.primaryConfidence}`);
    console.log('');

    // 8. 最新状態の取得
    console.log('8. 最新状態の取得...');
    const latestResult = await getLatestStateSnapshotAction();

    if (latestResult.success && latestResult.snapshot) {
      console.log('   ✓ 最新状態取得成功');
      console.log(`     - primaryState: ${latestResult.snapshot.primaryState}`);
      console.log(`     - primaryConfidence: ${latestResult.snapshot.primaryConfidence}`);
      console.log(`     - createdAt: ${latestResult.snapshot.createdAt}`);
    } else {
      console.log('   ✗ 最新状態取得失敗');
    }
    console.log('');

    // 9. StateSnapshot履歴の確認
    console.log('9. StateSnapshot履歴の確認...');
    const snapshots = await prisma.stateSnapshot.findMany({
      where: { userId: testUser.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log(`   ✓ StateSnapshot数: ${snapshots.length}`);
    snapshots.forEach((s, i) => {
      console.log(
        `     ${i + 1}. ${s.primaryState} (confidence: ${s.primaryConfidence}) - ${s.createdAt.toISOString()}`
      );
    });
    console.log('');

    console.log('=== 状態計算テスト完了 ===\n');
    console.log('確認事項:');
    console.log('  1. タスク大量作成時に OVERLOAD 状態が検出される');
    console.log('  2. Postpone多発時に STUCK 状態が検出される');
    console.log('  3. タスク完了後に NORMAL 状態に戻る');
    console.log('  4. 自己申告（selfReport）がスコアに反映される');
    console.log('');
    console.log('次のステップ:');
    console.log('  - test-suggestions.ts で提案生成テスト');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testState();
