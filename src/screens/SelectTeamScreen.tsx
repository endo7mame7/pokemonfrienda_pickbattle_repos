import { useState } from 'react';
import { Silhouette } from '../components/Silhouette';
import type { Pick, PlayerId } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';

interface Props {
  player: PlayerId;
  playerName: string;
  size: number;
  picks: Pick[];
  /** 「まえとおなじ」で呼び出す、前回の編成（Pick.id） */
  lastTeam?: string[] | undefined;
  onDecide: (team: Pick[]) => void;
  onBack: () => void;
}

export function SelectTeamScreen({
  player, playerName, size, picks, lastTeam, onDecide, onBack,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const byId = (id: string) => picks.find((pick) => pick.id === id);
  const megaCount = (ids: string[]) => ids.filter((id) => byId(id)?.canMegaEvolve).length;

  /**
   * メガシンカ できる子は チームに 1たい まで（docs/SPEC.md §3.2）。
   * ただし ずかん の中みによっては この きまり だと チームが組めないので、
   * 組めるときだけ ルールを かける。
   */
  const megaLimitActive = picks.filter((pick) => !pick.canMegaEvolve).length + 1 >= size;
  const megaFull = megaLimitActive && megaCount(selectedIds) >= 1;

  /** そのピックが いま えらべない理由。null なら えらべる */
  const blockedReason = (pick: Pick): string | null => {
    if (selectedIds.includes(pick.id)) return null; // えらんだものは いつでも はずせる
    if (megaFull && pick.canMegaEvolve) return 'メガシンカ は 1たい だけ';
    if (selectedIds.length >= size) return 'もう いっぱい';
    return null;
  };

  // 同じピックを2回選べないようにする（相手とは同じでもよい）
  const toggle = (pick: Pick) => {
    if (blockedReason(pick)) return;
    setSelectedIds((current) =>
      current.includes(pick.id)
        ? current.filter((x) => x !== pick.id)
        : [...current, pick.id],
    );
  };

  const done = selectedIds.length === size;

  // まえの編成が いまも ずかんに そろっていて、メガシンカ の きまり も まもれるときだけ出す
  const repeatable = (lastTeam ?? []).filter((id) => picks.some((pick) => pick.id === id));
  const canRepeat =
    repeatable.length === size && (!megaLimitActive || megaCount(repeatable) <= 1);

  return (
    <div className="screen">
      <div className="screen__body">
        <h1 className="title" style={{ color: `var(--${player})` }}>
          {playerName}の チーム
        </h1>
        <p className="subtitle">
          {size}たい えらんでね（あと {size - selectedIds.length}たい）
        </p>
        {megaLimitActive && (
          <p className="subtitle subtitle--rule">🌈 メガシンカ できる子は 1たい だけ</p>
        )}

        {canRepeat && selectedIds.length === 0 && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setSelectedIds(repeatable)}
          >
            🔁 まえと おなじ
          </button>
        )}

        <div className="pick-grid">
          {picks.map((pick) => {
            const order = selectedIds.indexOf(pick.id);
            const blocked = blockedReason(pick);
            const megaBlocked = blocked === 'メガシンカ は 1たい だけ';
            return (
              <button
                key={pick.id}
                type="button"
                className={[
                  'pick-item',
                  order >= 0 ? 'pick-item--selected' : '',
                  blocked ? 'pick-item--blocked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-disabled={blocked !== null}
                onClick={() => toggle(pick)}
              >
                <div className="pick-item__inner">
                  <Silhouette
          name={pick.name}
          type={pick.type}
          shape={pick.silhouette}
          size={50}
        />
                  <div className="card__name">{pick.name}</div>
                  <div className="card__type" style={{ background: TYPE_COLORS[pick.type] }}>
                    {pick.type}
                  </div>
                  <div className="card__hp-text">{pick.energy}</div>
                  {pick.canMegaEvolve && <div style={{ fontSize: 13 }}>🌈 メガシンカ</div>}
                  {megaBlocked && <div className="pick-item__note">1たい だけ</div>}
                  {order >= 0 && <div className="pick-item__order">{order + 1}</div>}
                </div>
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
