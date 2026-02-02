import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanDatabase() {
  console.log('=== データベースクリーンアップ ===\n');

  try {
    // 逆順で削除（外部キー制約を考慮）
    console.log('1. Task削除中...');
    await prisma.task.deleteMany({});

    console.log('2. SuggestionEvent削除中...');
    await prisma.suggestionEvent.deleteMany({});

    console.log('3. StateSnapshot削除中...');
    await prisma.stateSnapshot.deleteMany({});

    console.log('4. WeeklyPlan削除中...');
    await prisma.weeklyPlan.deleteMany({});

    console.log('5. DailyPlan削除中...');
    await prisma.dailyPlan.deleteMany({});

    console.log('6. QuarterGoal削除中...');
    await prisma.quarterGoal.deleteMany({});

    console.log('7. VisionCard削除中...');
    await prisma.visionCard.deleteMany({});

    console.log('8. ExperimentAssignment削除中...');
    await prisma.experimentAssignment.deleteMany({});

    console.log('9. ExperimentVariant削除中...');
    await prisma.experimentVariant.deleteMany({});

    console.log('10. Experiment削除中...');
    await prisma.experiment.deleteMany({});

    console.log('11. PromptVersion削除中...');
    await prisma.promptVersion.deleteMany({});

    console.log('12. PromptTemplate削除中...');
    await prisma.promptTemplate.deleteMany({});

    console.log('13. AiGenerationLog削除中...');
    await prisma.aiGenerationLog.deleteMany({});

    console.log('14. AdminAuditLog削除中...');
    await prisma.adminAuditLog.deleteMany({});

    console.log('15. User削除中...');
    await prisma.user.deleteMany({});

    console.log('\n✓ データベースクリーンアップ完了');
  } catch (error) {
    console.error('エラー:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanDatabase();
