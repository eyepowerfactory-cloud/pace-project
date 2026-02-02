// 3人のテストユーザーの状態確認と提案生成テスト

import { prisma } from './lib/prisma';

async function test3Users() {
  console.log('=== 3人のテストユーザー状態確認 ===\n');

  const users = [
    { email: 'alice@pace.local', name: 'Alice (OVERLOAD)' },
    { email: 'bob@pace.local', name: 'Bob (STUCK)' },
    { email: 'carol@pace.local', name: 'Carol (NORMAL)' },
  ];

  for (const userInfo of users) {
    console.log(`\n========== ${userInfo.name} ==========`);

    const user = await prisma.user.findUnique({
      where: { email: userInfo.email },
      select: { id: true, email: true, displayName: true },
    });

    if (!user) {
      console.log(`⚠ ユーザーが見つかりません: ${userInfo.email}`);
      console.log('   先に seed-rich.ts を実行してください: npm run db:seed:rich');
      continue;
    }

    console.log(`ユーザー: ${user.displayName} (${user.email})\n`);

    // 1. Vision確認
    console.log('【Vision】');
    const visions = await prisma.visionCard.findMany({
      where: { userId: user.id },
      orderBy: { horizon: 'asc' },
      select: {
        horizon: true,
        title: true,
      },
    });

    if (visions.length > 0) {
      visions.forEach((v) => {
        const horizonLabel =
          v.horizon === 'ONE_YEAR'
            ? '1年'
            : v.horizon === 'THREE_YEARS'
            ? '3年'
            : '5年';
        console.log(`  - ${horizonLabel}: ${v.title}`);
      });
    } else {
      console.log('  なし');
    }

    // 2. QuarterGoal確認
    console.log('\n【QuarterGoal】');
    const goals = await prisma.quarterGoal.findMany({
      where: { userId: user.id },
      select: {
        title: true,
        theme: true,
        framework: true,
      },
    });

    if (goals.length > 0) {
      goals.forEach((g) => {
        console.log(`  - ${g.title} (${g.theme}, ${g.framework})`);
      });
    } else {
      console.log('  なし');
    }

    // 3. Task統計
    console.log('\n【Task統計】');

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    weekStart.setHours(0, 0, 0, 0);

    const [totalCount, thisWeekCount, doneCount, overdueCount] = await Promise.all([
      prisma.task.count({ where: { userId: user.id } }),
      prisma.task.count({
        where: { userId: user.id, plannedWeekStart: weekStart },
      }),
      prisma.task.count({
        where: { userId: user.id, status: 'DONE' },
      }),
      prisma.task.count({
        where: {
          userId: user.id,
          status: { not: 'DONE' },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    console.log(`  - 総タスク数: ${totalCount}`);
    console.log(`  - 今週のタスク数: ${thisWeekCount}`);
    console.log(`  - 完了済み: ${doneCount}`);
    console.log(`  - 期限超過: ${overdueCount}`);

    // postponeCount高いタスク
    const highPostpone = await prisma.task.findMany({
      where: {
        userId: user.id,
        postponeCount: { gte: 3 },
      },
      select: {
        title: true,
        postponeCount: true,
      },
    });

    if (highPostpone.length > 0) {
      console.log(`  - Postpone多発タスク: ${highPostpone.length}個`);
      highPostpone.forEach((t) => {
        console.log(`    * ${t.title} (${t.postponeCount}回)`);
      });
    }

    // 4. 最新StateSnapshot
    console.log('\n【最新StateSnapshot】');
    const latestSnapshot = await prisma.stateSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        primaryState: true,
        primaryConfidence: true,
        topSignalsJson: true,
        selfReportJson: true,
        createdAt: true,
      },
    });

    if (latestSnapshot) {
      console.log(`  - 状態: ${latestSnapshot.primaryState}`);
      console.log(`  - 信頼度: ${latestSnapshot.primaryConfidence}`);
      console.log(`  - 主要シグナル: ${JSON.stringify(latestSnapshot.topSignalsJson)}`);

      if (latestSnapshot.selfReportJson) {
        const selfReport = latestSnapshot.selfReportJson as any;
        console.log('  - 自己申告:');
        if (selfReport.stress !== undefined)
          console.log(`    * ストレス: ${selfReport.stress}/10`);
        if (selfReport.capacity !== undefined)
          console.log(`    * キャパシティ: ${selfReport.capacity}/10`);
        if (selfReport.motivation !== undefined)
          console.log(`    * モチベーション: ${selfReport.motivation}/10`);
        if (selfReport.efficacy !== undefined)
          console.log(`    * 効力感: ${selfReport.efficacy}/10`);
      }

      console.log(`  - 作成日時: ${latestSnapshot.createdAt.toISOString()}`);
    } else {
      console.log('  なし');
    }

    // 5. SuggestionEvent履歴
    console.log('\n【SuggestionEvent履歴】');
    const suggestions = await prisma.suggestionEvent.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        suggestionType: true,
        titleText: true,
        response: true,
        createdAt: true,
      },
    });

    if (suggestions.length > 0) {
      suggestions.forEach((s, i) => {
        const responseLabel = s.response || '未応答';
        console.log(
          `  ${i + 1}. ${s.suggestionType} - ${responseLabel} (${s.createdAt.toISOString()})`
        );
        console.log(`     "${s.titleText}"`);
      });
    } else {
      console.log('  なし');
    }

    // 6. 完了率計算
    console.log('\n【パフォーマンス指標】');
    if (thisWeekCount > 0) {
      const thisWeekDone = await prisma.task.count({
        where: {
          userId: user.id,
          plannedWeekStart: weekStart,
          status: 'DONE',
        },
      });
      const completionRate = ((thisWeekDone / thisWeekCount) * 100).toFixed(1);
      console.log(`  - 今週の完了率: ${completionRate}% (${thisWeekDone}/${thisWeekCount})`);
    }

    if (totalCount > 0) {
      const overallCompletionRate = ((doneCount / totalCount) * 100).toFixed(1);
      console.log(`  - 全体完了率: ${overallCompletionRate}% (${doneCount}/${totalCount})`);
    }
  }

  console.log('\n\n=== 比較サマリー ===\n');

  const summary = await Promise.all(
    users.map(async (userInfo) => {
      const user = await prisma.user.findUnique({
        where: { email: userInfo.email },
        select: { id: true },
      });

      if (!user) return null;

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);

      const [thisWeekCount, doneCount, overdueCount, highPostponeCount] =
        await Promise.all([
          prisma.task.count({
            where: { userId: user.id, plannedWeekStart: weekStart },
          }),
          prisma.task.count({
            where: { userId: user.id, status: 'DONE' },
          }),
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

      const snapshot = await prisma.stateSnapshot.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        select: {
          primaryState: true,
          primaryConfidence: true,
        },
      });

      return {
        name: userInfo.name,
        state: snapshot?.primaryState || 'N/A',
        confidence: snapshot?.primaryConfidence || 0,
        thisWeekCount,
        doneCount,
        overdueCount,
        highPostponeCount,
      };
    })
  );

  console.log('| ユーザー | 状態 | 信頼度 | 今週 | 完了 | 超過 | 停滞 |');
  console.log('|---------|------|--------|------|------|------|------|');

  summary.forEach((s) => {
    if (s) {
      console.log(
        `| ${s.name.padEnd(15)} | ${s.state.padEnd(8)} | ${s.confidence
          .toString()
          .padStart(3)} | ${s.thisWeekCount.toString().padStart(4)} | ${s.doneCount
          .toString()
          .padStart(4)} | ${s.overdueCount.toString().padStart(4)} | ${s.highPostponeCount
          .toString()
          .padStart(4)} |`
      );
    }
  });

  console.log('\n凡例:');
  console.log('  今週: 今週計画されたタスク数');
  console.log('  完了: 全期間で完了したタスク数');
  console.log('  超過: 期限超過のタスク数');
  console.log('  停滞: postponeCount >= 3 のタスク数');

  console.log('\n\n=== テスト完了 ===');
  console.log('\n推奨される次のステップ:');
  console.log('  1. npm run db:studio でデータを視覚的に確認');
  console.log('  2. 各ユーザーでログインして提案を確認');
  console.log('  3. test-suggestions.ts で提案生成をテスト');
}

test3Users()
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
