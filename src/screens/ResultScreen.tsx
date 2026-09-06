import { mvpOf, OPPONENT_OF } from '../domain';
import type { BattleState, PlayerId } from '../domain';

interface Props {
  state: BattleState;
  playerNames: Record<PlayerId, string>;
  onRematch: () => void;
  onBackToTitle: () => void;
}

export function ResultScreen({ state, playerNames, onRematch, onBackToTitle }: Props) {
  const winner = state.winner!;
  const loser = OPPONENT_OF[winner];
  // 負けた側にも必ず「がんばったで賞」を出す（docs/SPEC.md §3.8）
  const loserMvp = mvpOf(state.teams[loser]);

  return (
    <div className="screen">
      <div className="screen__body stack">
        <div style={{ fontSize: 64 }}>🏆</div>
        <h1 className="title" style={{ color: `var(--${winner})` }}>
          {playerNames[winner]}の かち！
        </h1>
        <p className="subtitle">{state.turnCount}ターンの しょうぶ でした</p>

        {loserMvp && (
          <div className="result-mvp">
            <div style={{ fontSize: 32 }}>🎖️</div>
            <div style={{ fontWeight: 800 }}>{loserMvp.name}は さいごまで がんばった！</div>
            <div className="subtitle">あたえた ダメージ {loserMvp.damageDealt}</div>
          </div>
        )}

        <button type="button" className="btn btn--big" onClick={onRematch}>
          もういっかい
        </button>
        <button type="button" className="btn btn--ghost" onClick={onBackToTitle}>
          さいしょから
        </button>
      </div>
    </div>
  );
}
