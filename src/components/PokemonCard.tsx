import type { BattlePokemon } from '../domain';
import { TYPE_COLORS } from '../ui/typeColors';
import { Silhouette } from './Silhouette';

interface Props {
  pokemon: BattlePokemon;
  selectable: boolean;
  selected: boolean;
  dimmed: boolean;
  onSelect?: () => void;
}

function hpColor(ratio: number): string {
  if (ratio > 0.5) return 'var(--hp-good)';
  if (ratio > 0.25) return 'var(--hp-warn)';
  return 'var(--hp-bad)';
}

/** たいりょくは 数値・バー・色 の3つで伝える（UX要件 U-7） */
export function PokemonCard({ pokemon, selectable, selected, dimmed, onSelect }: Props) {
  const fainted = pokemon.hp <= 0;
  const ratio = pokemon.maxHp === 0 ? 0 : pokemon.hp / pokemon.maxHp;

  const classes = [
    'card',
    selectable && 'card--selectable',
    selected && 'card--selected',
    dimmed && 'card--dimmed',
    fainted && 'card--fainted',
    pokemon.tired && !fainted && 'card--tired',
    pokemon.megaEvolved && !fainted && 'card--mega',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      disabled={!selectable}
      onClick={onSelect}
      aria-label={`${pokemon.name} たいりょく ${pokemon.hp}`}
    >
      <div className="card__inner">
        <div className="card__marks">
          {fainted && '✕'}
          {!fainted && pokemon.megaEvolved && '🌈'}
          {!fainted && pokemon.tired && '💤'}
        </div>
        <Silhouette
          name={pokemon.name}
          type={pokemon.type}
          shape={pokemon.silhouette}
          size={40}
        />
        <div className="card__name">{pokemon.name}</div>
        <div className="card__type" style={{ background: TYPE_COLORS[pokemon.type] }}>
          {pokemon.type}
        </div>
        <div className="card__hp-bar">
          <div
            className="card__hp-fill"
            style={{ width: `${ratio * 100}%`, background: hpColor(ratio) }}
          />
        </div>
        <div className="card__hp-text">{pokemon.hp}</div>
      </div>
    </button>
  );
}
