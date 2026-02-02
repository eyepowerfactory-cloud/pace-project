// Paceトーン検証

/**
 * Paceトーン原則:
 * - 命令形禁止（「〜すべき」「〜しなさい」は使用しない）
 * - 仮説提示（「〜かもしれません」「〜の可能性があります」）
 * - 許可形式（「〜してみませんか？」「〜することができます」）
 * - 罪悪感を煽らない（「サボ」「怠け」「ダメ」は禁止）
 * - ラベル貼り禁止（「あなたは〜だ」という断定は避ける）
 */

// 禁止語リスト
const FORBIDDEN_WORDS = [
  // 命令形
  'すべき',
  'しなさい',
  'しなければならない',
  'する必要がある',
  '必ず',
  '絶対',

  // 罪悪感を煽る
  'サボ',
  'サボっ',
  '怠け',
  '怠っ',
  'ダメ',
  '駄目',
  '失敗',
  '失敗した',

  // 強制
  '今すぐ',
  'すぐに',
  '直ちに',
];

// 禁止パターン
const FORBIDDEN_PATTERNS = [
  // 断定ラベル: 「あなたは〜だ」
  /あなたは.{0,20}(だ|です|ですね)/,

  // 決めつけ: 「〜に違いない」
  /に違いない/,
  /に決まって/,

  // 強制命令: 「〜しましょう」（文末）
  /今すぐ.{0,10}しましょう$/,
  /すぐに.{0,10}しましょう$/,
];

/**
 * トーン違反チェック
 */
export interface ToneViolation {
  type: 'FORBIDDEN_WORD' | 'FORBIDDEN_PATTERN';
  value: string;
  position?: number;
}

export function checkToneViolations(copy: {
  title: string;
  message: string;
}): ToneViolation[] {
  const violations: ToneViolation[] = [];
  const text = `${copy.title} ${copy.message}`;

  // 禁止語チェック
  for (const word of FORBIDDEN_WORDS) {
    const index = text.indexOf(word);
    if (index !== -1) {
      violations.push({
        type: 'FORBIDDEN_WORD',
        value: word,
        position: index,
      });
    }
  }

  // 禁止パターンチェック
  for (const pattern of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({
        type: 'FORBIDDEN_PATTERN',
        value: pattern.source,
        position: match.index,
      });
    }
  }

  return violations;
}

/**
 * トーン違反があるかチェック
 */
export function hasToneViolations(copy: {
  title: string;
  message: string;
}): boolean {
  return checkToneViolations(copy).length > 0;
}

/**
 * トーン違反の説明文生成
 */
export function formatViolations(violations: ToneViolation[]): string {
  if (violations.length === 0) {
    return 'トーン違反はありません';
  }

  const lines = violations.map((v) => {
    if (v.type === 'FORBIDDEN_WORD') {
      return `- 禁止語「${v.value}」が含まれています`;
    } else {
      return `- 禁止パターン「${v.value}」に該当します`;
    }
  });

  return lines.join('\n');
}

/**
 * Repair用のシステムプロンプト生成
 */
export function generateRepairSystemPrompt(
  violations: ToneViolation[]
): string {
  const violationText = formatViolations(violations);

  return `以下のトーン違反を修正してください：

${violationText}

Paceトーン原則：
- 命令形禁止（「〜すべき」「〜しなさい」は使用しない）
- 仮説提示（「〜かもしれません」「〜の可能性があります」）
- 許可形式（「〜してみませんか？」「〜することができます」）
- 罪悪感を煽らない（「サボ」「怠け」「ダメ」は禁止）
- ラベル貼り禁止（「あなたは〜だ」という断定は避ける）

修正後のJSONを出力してください。`;
}
