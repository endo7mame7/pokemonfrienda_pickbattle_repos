interface Props {
  onStart: () => void;
}

export function TitleScreen({ onStart }: Props) {
  return (
    <div className="screen">
      <div className="screen__body stack">
        <div style={{ fontSize: 64 }}>⚡🎲</div>
        <h1 className="title">ピックバトル</h1>
        <p className="subtitle">ピックを えらんで たたかおう！</p>
        <button type="button" className="btn btn--big" onClick={onStart}>
          バトルを はじめる
        </button>
      </div>
    </div>
  );
}
