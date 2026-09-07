interface Props {
  playerName: string;
  /** チームえらびのときだけ true。相手に見られないよう、ほんとうに端末を渡す */
  passPhone?: boolean;
  onContinue: () => void;
}

/**
 * 手番が変わる合図。
 * バトル中は対面で置いたまま遊ぶので「わたしてね」とは言わない（docs/SPEC.md §3.2）。
 * チームえらびのときだけ、覗き見をふせぐために端末を渡してもらう。
 */
export function HandOffScreen({ playerName, passPhone = false, onContinue }: Props) {
  return (
    <div className="overlay">
      <div style={{ fontSize: 64 }}>{passPhone ? '🤝' : '🔄'}</div>
      <div className="overlay__title">つぎは {playerName}の ばん！</div>
      {passPhone && <p>スマホを わたしてね</p>}
      <button type="button" className="btn btn--big" onClick={onContinue}>
        {passPhone ? 'じゅんび できた！' : 'こうげき する！'}
      </button>
    </div>
  );
}
