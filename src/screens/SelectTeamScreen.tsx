import { useState } from 'react';
import type { Pick, PlayerId } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';

interface Props {
  player: PlayerId;
  playerName: string;
  size: number;
  picks: Pick[];
  onDecide: (team: Pick[]) => void;
  onBack: () => void;
}

export function SelectTeamScreen({ player, playerName, size, picks, onDecide, onBack }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 同じピックを2回選べないようにする（相手とは同じでもよい）
  const toggle = (id: string) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((x) => x !== id);
      if (current.length >= size) return current;
      return [...current, id];
    });
  };

  const done = selectedIds.length === size;

  return (
    <div className="screen">
      <div className="screen__body">
        <h1 className="title" style={{ color: `var(--${player})` }}>
          {playerName}の チーム
        </h1>
        <p className="subtitle">
          {size}たい えらんでね（あと {size - selectedIds.length}たい）
        </p>

        <div className="pick-grid">
          {picks.map((pick) => {
            const order = selectedIds.indexOf(pick.id);
            return (
              <button
                key={pick.id}
                type="button"
                className={order >= 0 ? 'pick-item pick-item--selected' : 'pick-item'}
                onClick={() => toggle(pick.id)}
              >
                <div className="card__name">{pick.name}</div>
                <div className="card__type" style={{ background: TYPE_COLORS[pick.type] }}>
                  {pick.type}
                </div>
                <div className="card__hp-text">{pick.energy}</div>
                {pick.canMegaEvolve && <div style={{ fontSize: 13 }}>🌈 メガシンカ</div>}
                {order >= 0 && <div className="pick-item__order">{order + 1}</div>}
              </button>
            );
          })}
        </div>

        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            もどる
          </button>
          <button
            type="button"
            className="btn"
            disabled={!done}
            onClick={() => onDecide(selectedIds.map((id) => picks.find((p) => p.id === id)!))}
          >
            けってい
          </button>
        </div>
      </div>
    </div>
  );
}
