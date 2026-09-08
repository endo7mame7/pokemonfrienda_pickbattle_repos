import { SPEED_DICE_MULTIPLIER } from '../domain';
import type { AttackStyle, BattleSpeed, Settings } from '../domain';

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
}

const STYLES: Array<{ value: AttackStyle; label: string; hint: string }> = [
  { value: 'timing', label: '🎯 タイミング', hint: 'ゲージを まんなかで とめる。うでまえで きまる' },
  { value: 'dice', label: '🎲 サイコロ', hint: 'サイコロを ふる。うんで きまる' },
];

const SPEEDS: Array<{ value: BattleSpeed; label: string; hint: string }> = [
  { value: 'fast', label: 'さくさく', hint: 'みじかい' },
  { value: 'normal', label: 'ふつう', hint: 'おすすめ' },
  { value: 'slow', label: 'じっくり', hint: 'ながい' },
];

/** せってい（S-10）。保護者むけ */
export function SettingsScreen({ settings, onChange, onBack }: Props) {
  const update = (patch: Partial<Settings>) => onChange({ ...settings, ...patch });

  return (
    <div className="screen">
      <div className="screen__body form">
        <h1 className="title">せってい</h1>

        <div className="field">
          <div className="field__label">こうげきの やりかた</div>
          {STYLES.map(({ value, label, hint }) => (
            <button
              key={value}
              type="button"
              className={value === settings.attackStyle ? 'toggle toggle--on' : 'toggle'}
              onClick={() => update({ attackStyle: value })}
            >
              {label}
              <span className="move-btn__sub">{hint}</span>
            </button>
          ))}
        </div>

        <div className="field">
          <div className="field__label">バトルの ながさ</div>
          <div className="chip-row">
            {SPEEDS.map(({ value, label, hint }) => (
              <button
                key={value}
                type="button"
                className={value === settings.battleSpeed ? 'chip chip--on' : 'chip'}
                onClick={() =>
                  // サイコロ方式の ばいりつ も いっしょに そろえる
                  update({ battleSpeed: value, damageMultiplier: SPEED_DICE_MULTIPLIER[value] })
                }
              >
                {label}
                <span className="move-btn__sub">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <div className="field__label">つかれ ルール</div>
          <button
            type="button"
            className={settings.fatigueEnabled ? 'toggle toggle--on' : 'toggle'}
            onClick={() => update({ fatigueEnabled: !settings.fatigueEnabled })}
          >
            {settings.fatigueEnabled ? '💤 つかう' : 'つかわない'}
            <span className="move-btn__sub">
              おなじ子で つづけて こうげきすると はんぶんに なる
            </span>
          </button>
        </div>

        <div className="btn-row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onChange({ ...settings, attackStyle: 'timing', battleSpeed: 'normal', damageMultiplier: 20, fatigueEnabled: true })}
          >
            おすすめに もどす
          </button>
          <button type="button" className="btn" onClick={onBack}>
            とじる
          </button>
        </div>
      </div>
    </div>
  );
}
