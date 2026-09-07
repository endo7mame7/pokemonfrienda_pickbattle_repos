interface Props {
  /** ずかんに登録された数まで。1たいしかいなければ 1vs1 だけ */
  maxSize: number;
  onSelect: (size: number) => void;
  onBack: () => void;
}

const SIZES = [
  { size: 1, label: '1たい1', hint: 'いちばん みじかい' },
  { size: 2, label: '2たい2', hint: 'ちょうど いい' },
  { size: 3, label: '3たい3', hint: 'たっぷり あそぶ' },
];

export function TeamSizeScreen({ maxSize, onSelect, onBack }: Props) {
  return (
    <div className="screen">
      <div className="screen__body">
        <h1 className="title">なんたい で たたかう？</h1>
        <div className="choice-list" style={{ flex: 1, justifyContent: 'center' }}>
          {SIZES.map(({ size, label, hint }) => (
            <button
              key={size}
              type="button"
              className="btn btn--big"
              disabled={size > maxSize}
              onClick={() => onSelect(size)}
            >
              {label}
              <span style={{ display: 'block', fontSize: 15, fontWeight: 500, opacity: 0.85 }}>
                {size > maxSize ? `ずかんに ${size}たい ひつよう` : hint}
              </span>
            </button>
          ))}
        </div>
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
