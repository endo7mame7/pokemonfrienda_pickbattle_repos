import { useRef } from 'react';

interface Props {
  onBattle: () => void;
  onPickBook: () => void;
  onSettings: () => void;
  pickCount: number;
}

/** 園児が あやまって設定を変えないよう、長押しで入る（UX要件 U-9） */
const LONG_PRESS_MS = 1500;

/** タイトル（S-1）。バトルと ずかん とうろく の2つのモードを大きく並べる */
export function TitleScreen({ onBattle, onPickBook, onSettings, pickCount }: Props) {
  const timer = useRef<number | null>(null);

  const startPress = () => {
    timer.current = window.setTimeout(onSettings, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <div className="screen">
      <div className="screen__body stack">
        <div style={{ fontSize: 56 }}>⚡🎲</div>
        <h1
          className="title"
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
        >
          ピックバトル
        </h1>
        <p className="hint">タイトルを ながおしすると せってい</p>

        <button type="button" className="btn btn--big mode" onClick={onBattle}>
          ⚔️ バトル
          <span className="mode__hint">
            {pickCount === 0 ? 'さきに ずかんに とうろくしてね' : 'ポケモンを えらんで たたかう'}
          </span>
        </button>

        <button type="button" className="btn btn--big mode mode--sub" onClick={onPickBook}>
          📷 ずかん とうろく
          <span className="mode__hint">
            {pickCount === 0 ? 'ピックの しゃしんを とろう' : `${pickCount}たい とうろくずみ`}
          </span>
        </button>
      </div>
    </div>
  );
}
