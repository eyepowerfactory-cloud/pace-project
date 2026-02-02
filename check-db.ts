import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('=== データベース状況確認 ===\n');

  try {
    // ユーザー数確認
    const userCount = await prisma.user.count();
    console.log(`ユーザー数: ${userCount}`);

    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { email: true, displayName: true, createdAt: true },
      });
      console.log('\n既存ユーザー:');
      users.forEach((u) => {
        console.log(`  - ${u.email} (${u.displayName}) - 作成日: ${u.createdAt.toISOString()}`);
      });
    }

    // QuarterGoal数確認
    const goalCount = await prisma.quarterGoal.count();
    console.log(`\nQuarterGoal数: ${goalCount}`);

    // テーブル一覧
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log('\n存在するテーブル:');
    tables.forEach((t) => {
      console.log(`  - ${t.table_name}`);
    });

  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
