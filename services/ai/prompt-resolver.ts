// PromptVersion解決

import { prisma } from '@/lib/prisma';
import { PromptKey, PromptVersion } from '@prisma/client';
import { getUserExperimentVariant } from '../experiments/assigner';

/**
 * PromptVersion解決
 *
 * 1. 実験割り当てチェック
 * 2. 実験のプロンプトオーバーライド確認
 * 3. オーバーライドがあればそれを使用
 * 4. なければデフォルト（ACTIVE）を使用
 *
 * @param promptKey プロンプトキー
 * @param userId ユーザーID
 * @returns 解決されたPromptVersion
 */
export async function resolvePromptVersion(
  promptKey: PromptKey,
  userId: string
): Promise<PromptVersion> {
  // 1. 実行中の実験を取得
  const runningExperiments = await prisma.experiment.findMany({
    where: { status: 'RUNNING' },
    include: {
      variants: true,
      assignments: {
        where: { userId },
      },
    },
  });

  // 2. このユーザーが割り当てられている実験をチェック
  for (const experiment of runningExperiments) {
    const assignment = experiment.assignments[0];
    if (!assignment) continue;

    // 3. Variantのプロンプトオーバーライドをチェック
    const variant = experiment.variants.find(
      (v) => v.key === assignment.variantKey
    );

    if (variant?.configJson) {
      const config = variant.configJson as any;
      const overrideVersionId =
        config?.promptVersionOverrides?.[promptKey];

      if (overrideVersionId) {
        // オーバーライドされたバージョンを取得
        const overrideVersion = await prisma.promptVersion.findUnique({
          where: { id: overrideVersionId },
        });

        if (overrideVersion) {
          return overrideVersion;
        }
      }
    }
  }

  // 4. デフォルト（ACTIVE）を使用
  const defaultVersion = await prisma.promptVersion.findFirst({
    where: {
      template: { key: promptKey },
      status: 'ACTIVE',
    },
    orderBy: { version: 'desc' },
  });

  if (!defaultVersion) {
    throw new Error(`No active PromptVersion found for key: ${promptKey}`);
  }

  return defaultVersion;
}

/**
 * プロンプトテンプレート変数置換
 *
 * @param template テンプレート文字列
 * @param variables 変数マップ
 * @returns 置換後の文字列
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  }

  return result;
}

/**
 * PromptVersionのハッシュ計算
 *
 * systemText + userText のSHA256
 *
 * @param systemText システムプロンプト
 * @param userText ユーザープロンプト
 * @returns SHA256ハッシュ
 */
export function calculatePromptHash(
  systemText: string,
  userText: string
): string {
  const crypto = require('crypto');
  const content = `${systemText}${userText}`;
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * PromptVersion作成
 *
 * @param templateKey プロンプトテンプレートキー
 * @param version バージョン番号
 * @param variant バリアント名
 * @param systemText システムプロンプト
 * @param userText ユーザープロンプト
 * @param createdBy 作成者ID
 * @returns 作成されたPromptVersion
 */
export async function createPromptVersion(params: {
  templateKey: PromptKey;
  version: number;
  variant?: string;
  systemText: string;
  userText: string;
  createdBy: string;
  notes?: string;
}): Promise<PromptVersion> {
  // テンプレート取得または作成
  const template = await prisma.promptTemplate.upsert({
    where: { key: params.templateKey },
    create: {
      key: params.templateKey,
      name: params.templateKey,
    },
    update: {},
  });

  // ハッシュ計算
  const hash = calculatePromptHash(params.systemText, params.userText);

  // PromptVersion作成
  const promptVersion = await prisma.promptVersion.create({
    data: {
      templateId: template.id,
      version: params.version,
      variant: params.variant || 'default',
      status: 'DRAFT',
      systemText: params.systemText,
      userText: params.userText,
      hash,
      notes: params.notes,
      createdBy: params.createdBy,
    },
  });

  return promptVersion;
}

/**
 * PromptVersionをアクティブ化
 *
 * 同じtemplate + variantの他のバージョンは自動的にARCHIVED
 *
 * @param promptVersionId PromptVersionのID
 */
export async function activatePromptVersion(
  promptVersionId: string
): Promise<void> {
  const promptVersion = await prisma.promptVersion.findUniqueOrThrow({
    where: { id: promptVersionId },
  });

  // トランザクションで実行
  await prisma.$transaction([
    // 同じtemplate + variantの他のバージョンをARCHIVE
    prisma.promptVersion.updateMany({
      where: {
        templateId: promptVersion.templateId,
        variant: promptVersion.variant,
        status: 'ACTIVE',
      },
      data: { status: 'ARCHIVED' },
    }),

    // このバージョンをACTIVE
    prisma.promptVersion.update({
      where: { id: promptVersionId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    }),
  ]);
}
