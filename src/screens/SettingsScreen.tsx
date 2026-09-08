import { SPEED_DICE_MULTIPLIER } from '../domain';
import type { AttackStyle, BattleSpeed, MegaThreshold, Settings, SuperEffectiveBonus } from '../domain';

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

const MEGA: Array<{ value: MegaThreshold; label: string }> = [
  { value: 'half', label: 'はんぶん' },
  { value: 'third', label: '1/3' },
  { value: 'quarter', label: '1/4' },
  { value: 'off', label: 'つかわない' },
];

const BONUSES: SuperEffectiveBonus[] = [0, 10, 20, 40, 60];

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
          <div className="field__label">メガシンカ する たいりょく</div>
          <div className="chip-row">
            {MEGA.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={value === settings.megaThreshold ? 'chip chip--on' : 'chip'}
                onClick={() => update({ megaThreshold: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="hint">
            はやめに するほど よく発動する。いまの ちからだと 1/3 では
            半分くらいしか 出ない
          </p>
        </div>

        <div className="field">
          <div className="field__label">ばつぐんの ボーナス</div>
          <div className="chip-row">
            {BONUSES.map((value) => (
              <button
                key={value}
                type="button"
                className={value === settings.superEffectiveBonus ? 'chip chip--on' : 'chip'}
                onClick={() => update({ superEffectiveBonus: value })}
              >
                +{value}
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
              おなじ子で つづけて こうげきすると ねらいにくく なる
            </span>
          </button>
        </div>

        <div className="btn-row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onChange({
                ...settings,
                attackStyle: 'timing',
                battleSpeed: 'normal',
                damageMultiplier: 20,
                megaThreshold: 'third',
                superEffectiveBonus: 20,
                fatigueEnabled: true,
              })}
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
