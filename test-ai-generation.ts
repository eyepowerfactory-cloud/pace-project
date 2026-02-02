// AI生成機能テスト

import { generateSuggestionCopy } from './services/ai/generator';

async function testAiGeneration() {
  console.log('=== AI生成機能テスト ===\n');

  // API Key チェック
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-api-key-here') {
    console.error('❌ ANTHROPIC_API_KEYが設定されていません');
    console.error('\n設定方法:');
    console.error('1. https://console.anthropic.com/settings/keys からAPIキーを取得');
    console.error('2. .env ファイルに以下を追加:');
    console.error('   ANTHROPIC_API_KEY="sk-ant-..."');
    console.error('\nFallback文言が使用されます。');
    console.log('');
  } else {
    console.log('✓ ANTHROPIC_API_KEY 設定済み\n');
  }

  // テストケース1: PLAN_REDUCE
  console.log('【テスト1】PLAN_REDUCE 提案生成...');
  try {
    const result1 = await generateSuggestionCopy('test-user-id', 'PLAN_REDUCE', {
      stateType: 'OVERLOAD',
      stateScore: 75,
      taskCount: 15,
      candidatesCount: 5,
      recommendedKeepCount: 10,
    });

    console.log('✓ 生成成功');
    console.log(`  タイトル: ${result1.title}`);
    console.log(`  メッセージ: ${result1.message}`);
    if (result1.options && result1.options.length > 0) {
      console.log(`  選択肢: ${result1.options.map(o => o.label).join(', ')}`);
    }
    console.log('');
  } catch (error: any) {
    console.error('✗ 生成失敗:', error.message);
    console.error('  Fallback文言が使用されます\n');
  }

  // テストケース2: TASK_MICROSTEP
  console.log('【テスト2】TASK_MICROSTEP 提案生成...');
  try {
    const result2 = await generateSuggestionCopy('test-user-id', 'TASK_MICROSTEP', {
      stateType: 'STUCK',
      stateScore: 70,
      taskTitle: 'レポート作成',
      postponeCount: 5,
    });

    console.log('✓ 生成成功');
    console.log(`  タイトル: ${result2.title}`);
    console.log(`  メッセージ: ${result2.message}`);
    console.log('');
  } catch (error: any) {
    console.error('✗ 生成失敗:', error.message);
    console.error('  Fallback文言が使用されます\n');
  }

  // テストケース3: MOTIVATION_REMIND
  console.log('【テスト3】MOTIVATION_REMIND 提案生成...');
  try {
    const result3 = await generateSuggestionCopy('test-user-id', 'MOTIVATION_REMIND', {
      stateType: 'LOW_MOTIVATION',
      stateScore: 60,
      goalTitle: 'プロジェクトマネージャーになる',
      whyNote: 'チームを率いて大きな成果を出したい',
    });

    console.log('✓ 生成成功');
    console.log(`  タイトル: ${result3.title}`);
    console.log(`  メッセージ: ${result3.message}`);
    console.log('');
  } catch (error: any) {
    console.error('✗ 生成失敗:', error.message);
    console.error('  Fallback文言が使用されます\n');
  }

  console.log('=== テスト完了 ===');
  console.log('\n注意:');
  console.log('- AI生成が失敗した場合、Fallback文言が自動的に使用されます');
  console.log('- PromptTemplateがデータベースに存在する必要があります');
  console.log('- 実際の提案生成では、AiGenerationLogに詳細が記録されます');
}

testAiGeneration()
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
