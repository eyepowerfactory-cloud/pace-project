// Seed data for development

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. 管理者ユーザー作成
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pace.local' },
    update: {},
    create: {
      email: 'admin@pace.local',
      passwordHash: adminPasswordHash,
      displayName: 'Admin User',
      role: 'ADMIN',
      status: 'ACTIVE',
      sessionVersion: 1,
    },
  });
  console.log('✓ Admin user created:', admin.email);

  // 2. テストユーザー作成
  const testPasswordHash = await bcrypt.hash('test123456', 10);
  const testUser = await prisma.user.upsert({
    where: { email: 'test@pace.local' },
    update: {},
    create: {
      email: 'test@pace.local',
      passwordHash: testPasswordHash,
      displayName: 'Test User',
      role: 'USER',
      status: 'ACTIVE',
      sessionVersion: 1,
    },
  });
  console.log('✓ Test user created:', testUser.email);

  // 3. Prompt Templates作成
  const suggestionCopyTemplate = await prisma.promptTemplate.upsert({
    where: { key: 'SUGGESTION_COPY' },
    update: {},
    create: {
      key: 'SUGGESTION_COPY',
      name: 'Suggestion Copy Generation',
      description: 'Generate user-facing suggestion titles and messages',
      category: 'SUGGESTION',
    },
  });
  console.log('✓ Prompt template created:', suggestionCopyTemplate.key);

  // 4. Prompt Version作成（デフォルト）
  const systemPrompt = `あなたはPaceアプリのAIアシスタントです。
ユーザーの自律性を尊重し、停滞からの再開を支援します。

**Paceトーン原則:**
- 命令形禁止（「〜すべき」「〜しなさい」は使用しない）
- 仮説提示（「〜かもしれません」「〜の可能性があります」）
- 許可形式（「〜してみませんか？」「〜することができます」）
- 罪悪感を煽らない（「サボ」「怠け」「ダメ」は禁止）
- ラベル貼り禁止（「あなたは〜だ」という断定は避ける）

ユーザーの状態と提案タイプに基づいて、適切なタイトルとメッセージを生成してください。`;

  const userPromptTemplate = `ユーザー状態: {{stateType}}
信頼度: {{stateScore}}
提案タイプ: {{suggestionType}}
コンテキスト: {{context}}

以下のJSON形式で提案文言を生成してください:
{
  "title": "短い提案タイトル（40文字以内）",
  "message": "詳細メッセージ（200文字以内）",
  "options": [
    {"key": "ACCEPT", "label": "受け入れるボタン", "description": "選択肢の説明（任意）"}
  ]
}`;

  const hash = require('crypto')
    .createHash('sha256')
    .update(systemPrompt + userPromptTemplate)
    .digest('hex');

  await prisma.promptVersion.upsert({
    where: { hash },
    update: {},
    create: {
      templateId: suggestionCopyTemplate.id,
      version: 1,
      variant: 'default',
      status: 'ACTIVE',
      systemText: systemPrompt,
      userText: userPromptTemplate,
      hash,
      createdBy: admin.id,
      activatedAt: new Date(),
    },
  });
  console.log('✓ Prompt version created (v1, default)');

  // 5. テスト用Experiment作成
  const experiment = await prisma.experiment.upsert({
    where: { key: 'suggestion_copy_test_2026_01' },
    update: {},
    create: {
      key: 'suggestion_copy_test_2026_01',
      name: 'Suggestion Copy A/B Test',
      description: 'Test different suggestion copy variants',
      status: 'DRAFT',
    },
  });

  await prisma.experimentVariant.createMany({
    data: [
      {
        experimentId: experiment.id,
        key: 'control',
        name: 'Control',
        weight: 50,
      },
      {
        experimentId: experiment.id,
        key: 'variant_a',
        name: 'Variant A (More empathetic)',
        weight: 50,
      },
    ],
    skipDuplicates: true,
  });
  console.log('✓ Experiment created:', experiment.key);

  console.log('\nSeed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Admin: admin@pace.local / admin123456');
  console.log('  User:  test@pace.local / test123456');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
