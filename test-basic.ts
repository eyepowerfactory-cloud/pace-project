// 基本動作確認スクリプト

import { prisma } from './lib/prisma';

async function testBasic() {
  console.log('=== Pace プロジェクト 基本動作確認 ===\n');

  try {
    // 1. データベース接続確認
    console.log('1. データベース接続確認...');
    await prisma.$connect();
    console.log('   ✓ データベース接続成功\n');

    // 2. ユーザー数確認
    console.log('2. ユーザー数確認...');
    const userCount = await prisma.user.count();
    console.log(`   ✓ ユーザー数: ${userCount}\n`);

    // 3. テストユーザー確認
    console.log('3. テストユーザー確認...');
    const testUser = await prisma.user.findUnique({
      where: { email: 'test@pace.local' },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        sessionVersion: true,
      },
    });

    if (testUser) {
      console.log('   ✓ テストユーザー:', testUser);
    } else {
      console.log('   ⚠ テストユーザーが見つかりません（シード未実行？）');
    }
    console.log('');

    // 4. PromptTemplate確認
    console.log('4. PromptTemplate確認...');
    const promptTemplates = await prisma.promptTemplate.findMany({
      include: {
        versions: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
    });

    console.log(`   ✓ PromptTemplate数: ${promptTemplates.length}`);
    promptTemplates.forEach((t) => {
      console.log(`     - ${t.key}: ${t.versions.length}個のACTIVEバージョン`);
    });
    console.log('');

    // 5. Experiment確認
    console.log('5. Experiment確認...');
    const experiments = await prisma.experiment.findMany({
      include: {
        variants: true,
      },
    });

    console.log(`   ✓ Experiment数: ${experiments.length}`);
    experiments.forEach((e) => {
      console.log(
        `     - ${e.key} (${e.status}): ${e.variants.length}個のVariant`
      );
    });
    console.log('');

    // 6. スキーマ統計
    console.log('6. データベース統計...');
    const [
      visionCount,
      goalCount,
      taskCount,
      snapshotCount,
      suggestionCount,
    ] = await Promise.all([
      prisma.visionCard.count(),
      prisma.quarterGoal.count(),
      prisma.task.count(),
      prisma.stateSnapshot.count(),
      prisma.suggestionEvent.count(),
    ]);

    console.log(`   ✓ VisionCard: ${visionCount}`);
    console.log(`   ✓ QuarterGoal: ${goalCount}`);
    console.log(`   ✓ Task: ${taskCount}`);
    console.log(`   ✓ StateSnapshot: ${snapshotCount}`);
    console.log(`   ✓ SuggestionEvent: ${suggestionCount}`);
    console.log('');

    console.log('=== 基本動作確認完了 ===\n');
    console.log('次のステップ:');
    console.log('  1. npm run db:studio でデータを確認');
    console.log('  2. test-auth.ts で認証テスト');
    console.log('  3. test-suggestions.ts で提案生成テスト');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testBasic();
