// Rich seed data with 3 test users in different states
// ユーザーA: OVERLOAD状態（タスク過多）
// ユーザーB: STUCK状態（停滞）
// ユーザーC: NORMAL状態（バランス良好）

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding rich test data...\n');

  // パスワードハッシュ生成
  const passwordHash = await bcrypt.hash('test123456', 10);
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);

  // 管理者ユーザー作成
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

  // ==================== ユーザーA: OVERLOAD状態 ====================
  console.log('\n=== Creating User A (OVERLOAD) ===');

  const userA = await prisma.user.upsert({
    where: { email: 'alice@pace.local' },
    update: {},
    create: {
      email: 'alice@pace.local',
      passwordHash,
      displayName: 'Alice（タスク過多）',
      role: 'USER',
      status: 'ACTIVE',
      sessionVersion: 1,
    },
  });
  console.log('✓ User A created:', userA.email);

  // Vision作成
  const visionA1y = await prisma.visionCard.create({
    data: {
      userId: userA.id,
      horizon: 'ONE_YEAR',
      title: '新規事業を立ち上げる',
      description: '自分のサービスを作り、最初の100人のユーザーを獲得する',
      whyNote: '自分の手で価値を生み出し、誰かの役に立ちたい',
    },
  });

  const visionA3y = await prisma.visionCard.create({
    data: {
      userId: userA.id,
      horizon: 'THREE_YEARS',
      title: '持続可能なビジネスモデル確立',
      description: '安定した収益を生み出し、チームを5人に拡大する',
      whyNote: '長期的に価値を提供し続けたい',
    },
  });

  // QuarterGoal作成
  const goalA1 = await prisma.quarterGoal.create({
    data: {
      userId: userA.id,
      cadence: 'Q1',
      year: 2026,
      title: 'MVP開発完了',
      theme: 'プロダクト開発',
      framework: 'OKR',
      frameworkJson: {
        objective: 'ユーザーが使えるMVPを完成させる',
        keyResults: [
          { key: 'KR1', description: 'コア機能5つ実装', target: 5, current: 2 },
          { key: 'KR2', description: 'ベータユーザー20人獲得', target: 20, current: 3 },
        ],
      } as any,
      visionCardId: visionA1y.id,
    },
  });

  const goalA2 = await prisma.quarterGoal.create({
    data: {
      userId: userA.id,
      cadence: 'Q2',
      year: 2026,
      title: 'マーケティング基盤構築',
      theme: '集客',
      framework: 'OKR',
      frameworkJson: {
        objective: '認知度を高める',
        keyResults: [
          { key: 'KR1', description: 'SNSフォロワー500人', target: 500, current: 120 },
          { key: 'KR2', description: 'ブログ記事10本公開', target: 10, current: 2 },
        ],
      } as any,
    },
  });

  // WeeklyPlan作成（今週）
  const weekStartA = new Date();
  weekStartA.setDate(weekStartA.getDate() - weekStartA.getDay() + 1);
  weekStartA.setHours(0, 0, 0, 0);

  await prisma.weeklyPlan.create({
    data: {
      userId: userA.id,
      weekStart: weekStartA,
      theme: 'MVP開発とマーケティングを並行で進める',
    },
  });

  // Task大量作成（OVERLOAD状態）
  const tasksA = [];

  // 今週のタスク（15個、多すぎる）
  for (let i = 1; i <= 15; i++) {
    const daysAgo = Math.floor(Math.random() * 5);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - daysAgo); // 期限超過も含む

    tasksA.push({
      userId: userA.id,
      title: `開発タスク ${i}`,
      description: `MVP開発のタスク ${i}`,
      status: 'TODO',
      priority: Math.min(100, i * 7),
      effortMin: 60,
      dueDate,
      quarterGoalId: goalA1.id,
      plannedWeekStart: weekStartA,
    });
  }

  // 来週以降のタスク（5個）
  const nextWeekA = new Date(weekStartA);
  nextWeekA.setDate(nextWeekA.getDate() + 7);

  for (let i = 1; i <= 5; i++) {
    tasksA.push({
      userId: userA.id,
      title: `マーケティングタスク ${i}`,
      description: `SNS投稿やブログ記事執筆 ${i}`,
      status: 'TODO',
      priority: 50 + i * 5,
      effortMin: 45,
      quarterGoalId: goalA2.id,
      plannedWeekStart: nextWeekA,
    });
  }

  await prisma.task.createMany({ data: tasksA });
  console.log(`✓ Created ${tasksA.length} tasks (15 this week = OVERLOAD)`);

  // StateSnapshot作成（OVERLOAD状態）
  await prisma.stateSnapshot.create({
    data: {
      userId: userA.id,
      windowDays: 7,
      scoresJson: {
        OVERLOAD: { score: 75, signals: ['overdue_count_high', 'weekly_task_count_very_high'] },
        STUCK: { score: 20, signals: [] },
        NORMAL: { score: 5, signals: [] },
      } as any,
      primaryState: 'OVERLOAD',
      primaryConfidence: 75,
      topSignalsJson: ['overdue_count_high', 'weekly_task_count_very_high'] as any,
      selfReportJson: {
        stress: 8,
        motivation: 6,
      } as any,
    },
  });
  console.log('✓ StateSnapshot created (OVERLOAD, confidence: 75)');

  // SuggestionEvent作成
  const suggestionA = await prisma.suggestionEvent.create({
    data: {
      userId: userA.id,
      suggestionType: 'PLAN_REDUCE',
      stateType: 'OVERLOAD',
      stateScore: 75,
      context: 'HOME',
      titleText: 'タスクを減らしてみませんか？',
      messageText: '今週は15個のタスクがあります。いくつかを来週に回すことで、負荷を軽減できるかもしれません。',
      payloadJson: {
        targetWeekStart: weekStartA.toISOString(),
        candidates: tasksA.slice(0, 5).map((t, i) => ({
          taskId: `task_${i}`,
          reason: 'low_priority',
        })),
      } as any,
      response: 'DISMISSED',
    },
  });
  console.log('✓ SuggestionEvent created (PLAN_REDUCE, VIEWED)');

  // ==================== ユーザーB: STUCK状態 ====================
  console.log('\n=== Creating User B (STUCK) ===');

  const userB = await prisma.user.upsert({
    where: { email: 'bob@pace.local' },
    update: {},
    create: {
      email: 'bob@pace.local',
      passwordHash,
      displayName: 'Bob（停滞中）',
      role: 'USER',
      status: 'ACTIVE',
      sessionVersion: 1,
    },
  });
  console.log('✓ User B created:', userB.email);

  // Vision作成
  const visionB1y = await prisma.visionCard.create({
    data: {
      userId: userB.id,
      horizon: 'ONE_YEAR',
      title: '転職して新しい環境で働く',
      description: 'より成長できる環境に移り、スキルアップする',
      whyNote: '現状に満足せず、もっと成長したい',
    },
  });

  // QuarterGoal作成
  const goalB1 = await prisma.quarterGoal.create({
    data: {
      userId: userB.id,
      cadence: 'Q1',
      year: 2026,
      title: 'ポートフォリオ完成',
      theme: '転職準備',
      framework: 'SMART',
      frameworkJson: {
        specific: 'GitHubに3つのプロジェクトを公開',
        measurable: '各プロジェクトにREADMEとテストコード',
        achievable: '週末に作業時間を確保',
        relevant: '転職活動のアピール材料',
        timeBound: '3ヶ月以内',
      } as any,
      visionCardId: visionB1y.id,
    },
  });

  // WeeklyPlan作成
  const weekStartB = new Date();
  weekStartB.setDate(weekStartB.getDate() - weekStartB.getDay() + 1);
  weekStartB.setHours(0, 0, 0, 0);

  await prisma.weeklyPlan.create({
    data: {
      userId: userB.id,
      weekStart: weekStartB,
      theme: 'ポートフォリオ作成を進める',
    },
  });

  // Task作成（STUCK状態：postpone多発）
  const tasksB = [];

  // 何度もpostponeされたタスク（5個）
  for (let i = 1; i <= 5; i++) {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - 21); // 3週間前に作成

    tasksB.push({
      userId: userB.id,
      title: `停滞タスク ${i}`,
      description: `なかなか手をつけられないタスク ${i}`,
      status: 'TODO',
      priority: 60 + i * 5,
      effortMin: 90,
      postponeCount: 3 + i, // postpone回数多い
      quarterGoalId: goalB1.id,
      plannedWeekStart: weekStartB,
      createdAt,
    });
  }

  // 通常のタスク（3個）
  for (let i = 1; i <= 3; i++) {
    tasksB.push({
      userId: userB.id,
      title: `通常タスク ${i}`,
      description: `普通のタスク ${i}`,
      status: 'TODO',
      priority: 50,
      effortMin: 30,
      quarterGoalId: goalB1.id,
      plannedWeekStart: weekStartB,
    });
  }

  await prisma.task.createMany({ data: tasksB });
  console.log(`✓ Created ${tasksB.length} tasks (5 with high postponeCount = STUCK)`);

  // StateSnapshot作成（STUCK状態）
  await prisma.stateSnapshot.create({
    data: {
      userId: userB.id,
      windowDays: 7,
      scoresJson: {
        OVERLOAD: { score: 25, signals: [] },
        STUCK: { score: 70, signals: ['postpone_count_high', 'inactive_days_long'] },
        NORMAL: { score: 5, signals: [] },
      } as any,
      primaryState: 'STUCK',
      primaryConfidence: 70,
      topSignalsJson: ['postpone_count_high', 'inactive_days_long'] as any,
      selfReportJson: {
        stress: 6,
        motivation: 3,
        efficacy: 3,
      } as any,
    },
  });
  console.log('✓ StateSnapshot created (STUCK, confidence: 70)');

  // SuggestionEvent作成
  await prisma.suggestionEvent.create({
    data: {
      userId: userB.id,
      suggestionType: 'TASK_MICROSTEP',
      stateType: 'STUCK',
      stateScore: 70,
      context: 'HOME',
      titleText: '小さなステップに分けてみませんか？',
      messageText: 'このタスクを小さなステップに分けることで、始めやすくなる可能性があります。',
      payloadJson: {
        targetTaskId: 'stuck_task_1',
        microSteps: [
          { title: 'ステップ1: 環境構築', effortMin: 15 },
          { title: 'ステップ2: 基本実装', effortMin: 30 },
          { title: 'ステップ3: テスト作成', effortMin: 20 },
        ],
      } as any,
      response: 'DISMISSED',
    },
  });
  console.log('✓ SuggestionEvent created (TASK_MICROSTEP, VIEWED)');

  // ==================== ユーザーC: NORMAL状態 ====================
  console.log('\n=== Creating User C (NORMAL) ===');

  const userC = await prisma.user.upsert({
    where: { email: 'carol@pace.local' },
    update: {},
    create: {
      email: 'carol@pace.local',
      passwordHash,
      displayName: 'Carol（バランス良好）',
      role: 'USER',
      status: 'ACTIVE',
      sessionVersion: 1,
    },
  });
  console.log('✓ User C created:', userC.email);

  // Vision作成（バランス良く3つ）
  const visionC1y = await prisma.visionCard.create({
    data: {
      userId: userC.id,
      horizon: 'ONE_YEAR',
      title: 'フルマラソン完走',
      description: '初めてのフルマラソンで完走を目指す',
      whyNote: '健康的な生活習慣を確立したい',
    },
  });

  const visionC3y = await prisma.visionCard.create({
    data: {
      userId: userC.id,
      horizon: 'THREE_YEARS',
      title: 'リーダーポジションに昇進',
      description: 'チームをリードし、後輩の育成に貢献する',
      whyNote: '人を育てることで、より大きな価値を生み出したい',
    },
  });

  const visionC5y = await prisma.visionCard.create({
    data: {
      userId: userC.id,
      horizon: 'FIVE_YEARS',
      title: '家族との時間を大切にする',
      description: '仕事とプライベートのバランスを保ち、家族との思い出を作る',
      whyNote: '人生で最も大切なのは家族',
    },
  });

  // QuarterGoal作成（2つ）
  const goalC1 = await prisma.quarterGoal.create({
    data: {
      userId: userC.id,
      cadence: 'Q1',
      year: 2026,
      title: 'ハーフマラソン完走',
      theme: 'ランニング',
      framework: 'SMART',
      frameworkJson: {
        specific: 'ハーフマラソン大会に出場して完走',
        measurable: '21.0975km完走',
        achievable: '週3回のトレーニング',
        relevant: 'フルマラソンへのステップ',
        timeBound: '3月末の大会',
      } as any,
      visionCardId: visionC1y.id,
    },
  });

  const goalC2 = await prisma.quarterGoal.create({
    data: {
      userId: userC.id,
      cadence: 'Q2',
      year: 2026,
      title: 'チームリーダースキル習得',
      theme: 'キャリア',
      framework: 'OKR',
      frameworkJson: {
        objective: 'リーダーシップスキルを身につける',
        keyResults: [
          { key: 'KR1', description: 'マネジメント本3冊読破', target: 3, current: 1 },
          { key: 'KR2', description: 'メンター経験2名', target: 2, current: 1 },
        ],
      } as any,
      visionCardId: visionC3y.id,
    },
  });

  // WeeklyPlan作成
  const weekStartC = new Date();
  weekStartC.setDate(weekStartC.getDate() - weekStartC.getDay() + 1);
  weekStartC.setHours(0, 0, 0, 0);

  await prisma.weeklyPlan.create({
    data: {
      userId: userC.id,
      weekStart: weekStartC,
      theme: 'トレーニングと学習をバランスよく進める',
    },
  });

  // Task作成（NORMAL状態：バランス良い）
  const tasksC = [];

  // 今週のタスク（6個、適量）
  for (let i = 1; i <= 3; i++) {
    tasksC.push({
      userId: userC.id,
      title: `ランニング練習 ${i}`,
      description: `10kmランニング - 週${i}回目`,
      status: i === 1 ? 'DONE' : 'TODO',
      priority: 70,
      effortMin: 60,
      quarterGoalId: goalC1.id,
      plannedWeekStart: weekStartC,
    });
  }

  for (let i = 1; i <= 3; i++) {
    tasksC.push({
      userId: userC.id,
      title: `マネジメント学習 ${i}`,
      description: `本を読む・メモを取る`,
      status: i === 1 ? 'DONE' : 'IN_PROGRESS',
      priority: 60,
      effortMin: 30,
      quarterGoalId: goalC2.id,
      plannedWeekStart: weekStartC,
    });
  }

  // 完了済みタスク（先週）
  const lastWeekC = new Date(weekStartC);
  lastWeekC.setDate(lastWeekC.getDate() - 7);

  for (let i = 1; i <= 4; i++) {
    tasksC.push({
      userId: userC.id,
      title: `先週の完了タスク ${i}`,
      description: `完了済み`,
      status: 'DONE',
      priority: 50,
      effortMin: 30,
      quarterGoalId: i % 2 === 0 ? goalC1.id : goalC2.id,
      plannedWeekStart: lastWeekC,
    });
  }

  await prisma.task.createMany({ data: tasksC });
  console.log(`✓ Created ${tasksC.length} tasks (6 this week, 2 done = NORMAL)`);

  // StateSnapshot作成（NORMAL状態）
  await prisma.stateSnapshot.create({
    data: {
      userId: userC.id,
      windowDays: 7,
      scoresJson: {
        OVERLOAD: { score: 10, signals: [] },
        STUCK: { score: 5, signals: [] },
        NORMAL: { score: 85, signals: ['completion_rate_good', 'task_count_balanced'] },
      } as any,
      primaryState: 'OVERLOAD',
      primaryConfidence: 85,
      topSignalsJson: ['completion_rate_good', 'task_count_balanced'] as any,
      selfReportJson: {
        stress: 4,
        motivation: 8,
        efficacy: 8,
      } as any,
    },
  });
  console.log('✓ StateSnapshot created (NORMAL, confidence: 85)');

  // SuggestionEvent作成（MOTIVATION_REMIND）
  await prisma.suggestionEvent.create({
    data: {
      userId: userC.id,
      suggestionType: 'MOTIVATION_REMIND',
      stateType: 'LOW_MOTIVATION',
      stateScore: 85,
      context: 'HOME',
      titleText: '順調に進んでいますね！',
      messageText: 'あなたの「健康的な生活習慣を確立したい」という想いを思い出してみませんか？',
      payloadJson: {
        visionId: visionC1y.id,
        whyNote: visionC1y.whyNote,
      } as any,
      response: 'ACCEPTED',
    },
  });
  console.log('✓ SuggestionEvent created (MOTIVATION_REMIND, ACCEPTED)');

  // ==================== 共通データ ====================
  console.log('\n=== Creating shared data ===');

  // Prompt Template作成
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

  // Prompt Version作成
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

  // Experiment作成
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

  console.log('\n=== Seed completed successfully! ===\n');
  console.log('Test credentials:');
  console.log('  Admin:   admin@pace.local / admin123456');
  console.log('  User A:  alice@pace.local / test123456  (OVERLOAD: 15 tasks this week)');
  console.log('  User B:  bob@pace.local   / test123456  (STUCK: high postponeCount)');
  console.log('  User C:  carol@pace.local / test123456  (NORMAL: balanced, 2/6 done)');
  console.log('');
  console.log('Summary:');
  console.log('  - Alice: タスク過多（OVERLOAD状態）、15個の今週タスク、期限超過あり');
  console.log('  - Bob:   停滞中（STUCK状態）、5個のタスクが3回以上postpone済み');
  console.log('  - Carol: バランス良好（NORMAL状態）、6個の今週タスク、2個完了済み');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
