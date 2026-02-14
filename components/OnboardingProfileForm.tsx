'use client';

import { useState } from 'react';
import { updateProfileAction } from '@/actions/auth';

interface OnboardingProfileFormProps {
  onComplete: () => void;
}

export default function OnboardingProfileForm({ onComplete }: OnboardingProfileFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // フォームデータ
  const [formData, setFormData] = useState({
    ageRange: '',
    occupation: '',
    familyStructure: '',
    hobbies: '',
    currentChallenges: '',
    coreValues: '',
    idealState: '',
  });

  const totalSteps = 7;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      await updateProfileAction(formData);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'プロフィールの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">👋</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                まずは、あなたのことを教えてください
              </h3>
              <p className="text-gray-600 text-lg">
                よろしければ、あなたの年齢層を教えていただけますか？
              </p>
            </div>
            <div className="space-y-3">
              {['10代', '20代', '30代', '40代', '50代', '60代以上'].map((age) => (
                <button
                  key={age}
                  onClick={() => {
                    updateField('ageRange', age);
                    handleNext();
                  }}
                  className={`w-full p-4 rounded-xl border-2 transition-all hover:border-indigo-400 hover:bg-indigo-50 ${
                    formData.ageRange === age
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="text-lg font-medium">{age}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">💼</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                お仕事について
              </h3>
              <p className="text-gray-600 text-lg">
                どんなお仕事をされていますか？<br />
                <span className="text-sm">（学生の方は「学生」とご入力ください）</span>
              </p>
            </div>
            <div className="space-y-4">
              <textarea
                value={formData.occupation}
                onChange={(e) => updateField('occupation', e.target.value)}
                placeholder="例: Webデザイナー、営業職、学生など"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none min-h-[100px] text-lg"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                家族構成について
              </h3>
              <p className="text-gray-600 text-lg">
                差し支えなければ、ご家族のことを教えていただけますか？
              </p>
            </div>
            <div className="space-y-4">
              <textarea
                value={formData.familyStructure}
                onChange={(e) => updateField('familyStructure', e.target.value)}
                placeholder="例: 一人暮らし、配偶者と二人暮らし、子供2人など"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none min-h-[100px] text-lg"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                趣味や興味について
              </h3>
              <p className="text-gray-600 text-lg">
                普段どんなことに興味を持っていますか？<br />
                <span className="text-sm">趣味や好きなことを教えてください</span>
              </p>
            </div>
            <div className="space-y-4">
              <textarea
                value={formData.hobbies}
                onChange={(e) => updateField('hobbies', e.target.value)}
                placeholder="例: 読書、ランニング、料理、音楽鑑賞など"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none min-h-[100px] text-lg"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🤔</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                現在の課題について
              </h3>
              <p className="text-gray-600 text-lg">
                今、何か気になっていることや悩んでいることはありますか？
              </p>
            </div>
            <div className="space-y-4">
              <textarea
                value={formData.currentChallenges}
                onChange={(e) => updateField('currentChallenges', e.target.value)}
                placeholder="例: 時間管理がうまくいかない、やりたいことが多すぎるなど"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none min-h-[120px] text-lg"
              />
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">💎</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                大切にしている価値観
              </h3>
              <p className="text-gray-600 text-lg">
                あなたが人生で大切にしていることは何ですか？
              </p>
            </div>
            <div className="space-y-4">
              <textarea
                value={formData.coreValues}
                onChange={(e) => updateField('coreValues', e.target.value)}
                placeholder="例: 家族との時間、自己成長、健康、誠実さなど"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none min-h-[120px] text-lg"
              />
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">✨</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                理想の姿
              </h3>
              <p className="text-gray-600 text-lg">
                最後に、あなたはどんな自分になりたいですか？
              </p>
            </div>
            <div className="space-y-4">
              <textarea
                value={formData.idealState}
                onChange={(e) => updateField('idealState', e.target.value)}
                placeholder="例: もっと落ち着いて行動できる自分、充実した毎日を送れる自分など"
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-indigo-400 focus:outline-none min-h-[120px] text-lg"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass-card rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto animate-fade-in">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700">
          {error}
        </div>
      )}

      {/* プログレスバー */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            {step} / {totalSteps}
          </span>
          <span className="text-sm font-medium text-indigo-600">
            {Math.round((step / totalSteps) * 100)}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>

      {renderStep()}

      {/* ナビゲーションボタン */}
      <div className="flex gap-3 mt-8">
        {step > 1 && (
          <button
            onClick={handleBack}
            disabled={loading}
            className="btn-secondary flex-1 disabled:opacity-50"
          >
            <span>← 戻る</span>
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={loading}
          className="btn-gradient flex-1 disabled:opacity-50"
        >
          <span>{step === totalSteps ? (loading ? '保存中...' : '完了する ✓') : '次へ →'}</span>
        </button>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        あなたのペースで、答えたいことだけお答えください
      </p>
    </div>
  );
}
