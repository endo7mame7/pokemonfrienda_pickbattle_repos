interface Props {
  onBattle: () => void;
  onPickBook: () => void;
  pickCount: number;
}

/** タイトル（S-1）。バトルと ずかん とうろく の2つのモードを大きく並べる */
export function TitleScreen({ onBattle, onPickBook, pickCount }: Props) {
  return (
    <div className="screen">
      <div className="screen__body stack">
        <div style={{ fontSize: 56 }}>⚡🎲</div>
        <h1 className="title">ピックバトル</h1>

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
