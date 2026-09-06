interface Props {
  playerName: string;
  onContinue: () => void;
}

/** 端末を渡す合図。相手のチーム選択を覗き見しないためにも挟む（docs/SPEC.md §3.1） */
export function HandOffScreen({ playerName, onContinue }: Props) {
  return (
    <div className="overlay">
      <div style={{ fontSize: 64 }}>🤝</div>
      <div className="overlay__title">つぎは {playerName}の ばん！</div>
      <p>スマホを わたしてね</p>
      <button type="button" className="btn btn--big" onClick={onContinue}>
        じゅんび できた！
      </button>
    </div>
  );
}
