import { useState } from 'react';
import { Silhouette } from '../components/Silhouette';
import type { Pick } from '../domain';
import type { PickSort } from '../db/pickRepository';
import { TYPE_COLORS } from '../ui/typeColors';

interface Props {
  picks: Pick[];
  sort: PickSort;
  onChangeSort: (sort: PickSort) => void;
  onAdd: () => void;
  onEdit: (pick: Pick) => void;
  onAddSamples: () => void;
  onBack: () => void;
}

const SORTS: Array<{ value: PickSort; label: string }> = [
  { value: 'useCount', label: 'よく つかう' },
  { value: 'name', label: 'なまえ' },
  { value: 'energy', label: 'つよさ' },
  { value: 'createdAt', label: 'とうろく' },
];

/** ずかん（S-2）。登録したピックの一覧 */
export function PickBookScreen({
  picks, sort, onChangeSort, onAdd, onEdit, onAddSamples, onBack,
}: Props) {
  const [showSamples, setShowSamples] = useState(false);

  return (
    <div className="screen">
      <div className="screen__body">
        <h1 className="title">ずかん</h1>
        <p className="subtitle">{picks.length}たい とうろくずみ</p>

        {picks.length > 0 && (
          <div className="chip-row">
            {SORTS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                className={value === sort ? 'chip chip--on' : 'chip'}
                onClick={() => onChangeSort(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {picks.length === 0 ? (
          <div className="stack">
            <div style={{ fontSize: 56 }}>📷</div>
            <p className="subtitle">
              まだ なにも とうろくされていません。
              <br />
              ピックの しゃしんを とって ふやしましょう。
            </p>
            {showSamples ? (
              <button type="button" className="btn btn--ghost" onClick={onAddSamples}>
                みほんの 12たいを いれる
              </button>
            ) : (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowSamples(true)}
              >
                とりあえず ためしたい
              </button>
            )}
          </div>
        ) : (
          <div className="pick-grid">
            {picks.map((pick) => (
              <button
                key={pick.id}
                type="button"
                className="pick-item"
                onClick={() => onEdit(pick)}
              >
                <div className="pick-item__inner">
                  <Silhouette
          name={pick.name}
          type={pick.type}
          shape={pick.silhouette}
          size={54}
        />
                  <div className="card__name">{pick.name}</div>
                  <div className="card__type" style={{ background: TYPE_COLORS[pick.type] }}>
                    {pick.type}
                  </div>
                  <div className="card__hp-text">{pick.energy}</div>
                  {pick.canMegaEvolve && <div style={{ fontSize: 13 }}>🌈 メガシンカ</div>}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            もどる
          </button>
          <button type="button" className="btn" onClick={onAdd}>
            ＋ とうろく
          </button>
        </div>
      </div>
    </div>
  );
}
