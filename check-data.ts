import { prisma } from './lib/prisma';

async function checkData() {
  console.log('=== データ確認 ===\n');

  // 1. SuggestionEventのデータ確認
  console.log('1. SuggestionEvent:');
  const suggestions = await prisma.suggestionEvent.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(suggestions, null, 2));
  console.log('');

  // 2. VisionCardのデータ確認
  console.log('2. VisionCard:');
  const visions = await prisma.visionCard.findMany({
    take: 3,
  });
  console.log(JSON.stringify(visions, null, 2));
  console.log('');

  // 3. QuarterGoalのデータ確認
  console.log('3. QuarterGoal:');
  const goals = await prisma.quarterGoal.findMany({
    take: 3,
  });
  console.log(JSON.stringify(goals, null, 2));
  console.log('');

  await prisma.$disconnect();
}

checkData().catch(console.error);
