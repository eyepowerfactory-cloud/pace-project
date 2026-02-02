// 認証機能テストスクリプト

import { signInAction, signUpAction, signOutAction, getCurrentUserAction } from './actions/auth';
import { adminForceLogoutUserAction } from './actions/admin';

async function testAuth() {
  console.log('=== Pace プロジェクト 認証テスト ===\n');

  try {
    // 1. ログインテスト
    console.log('1. ログイン試行（test@pace.local）...');
    const signInResult = await signInAction({
      email: 'test@pace.local',
      password: 'test123456',
    });

    if (signInResult.success && signInResult.user) {
      console.log('   ✓ ログイン成功');
      console.log(`     - ユーザーID: ${signInResult.user.id}`);
      console.log(`     - メール: ${signInResult.user.email}`);
      console.log(`     - 表示名: ${signInResult.user.displayName}`);
      console.log(`     - ロール: ${signInResult.user.role}`);
      console.log(`     - sessionVersion: ${signInResult.user.sessionVersion}`);
    } else {
      console.log('   ✗ ログイン失敗:', signInResult.error);
      process.exit(1);
    }
    console.log('');

    // 2. 現在のユーザー取得テスト
    console.log('2. 現在のユーザー取得...');
    try {
      const currentUser = await getCurrentUserAction();
      console.log('   ✓ ユーザー情報取得成功');
      console.log(`     - ID: ${currentUser.id}`);
      console.log(`     - メール: ${currentUser.email}`);
      console.log(`     - 表示名: ${currentUser.displayName}`);
    } catch (error) {
      console.log('   ⚠ ユーザー情報取得エラー（セッションがない場合は正常）');
      console.log(`     - ${error}`);
    }
    console.log('');

    // 3. サインアップテスト（新規ユーザー）
    console.log('3. 新規ユーザー登録...');
    const testEmail = `test_${Date.now()}@pace.local`;
    const signUpResult = await signUpAction({
      email: testEmail,
      password: 'test123456',
      displayName: 'テストユーザー新規',
    });

    if (signUpResult.success && signUpResult.user) {
      console.log('   ✓ サインアップ成功');
      console.log(`     - ユーザーID: ${signUpResult.user.id}`);
      console.log(`     - メール: ${signUpResult.user.email}`);
      console.log(`     - sessionVersion: ${signUpResult.user.sessionVersion}`);
    } else {
      console.log('   ✗ サインアップ失敗:', signUpResult.error);
    }
    console.log('');

    // 4. ログアウトテスト
    console.log('4. ログアウト...');
    const signOutResult = await signOutAction();
    if (signOutResult.success) {
      console.log('   ✓ ログアウト成功');
    } else {
      console.log('   ✗ ログアウト失敗');
    }
    console.log('');

    // 5. 強制ログアウトテスト（管理者機能）
    console.log('5. 強制ログアウトテスト...');
    console.log('   （このテストは管理者権限が必要です）');
    console.log('   ⚠ スキップ（手動テスト推奨）');
    console.log('');

    console.log('=== 認証テスト完了 ===\n');
    console.log('次のステップ:');
    console.log('  1. test-state.ts で状態計算テスト');
    console.log('  2. test-suggestions.ts で提案生成テスト');
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

testAuth();
