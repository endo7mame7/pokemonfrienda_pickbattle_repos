import { shapeForName, silhouetteColor } from '../ui/silhouette';
import type { PokemonType, SilhouetteShape } from '../domain';

interface Props {
  name: string;
  type: PokemonType;
  size: number;
  shape?: SilhouetteShape | undefined;
}

/**
 * 生きもののシルエット。実在のポケモンのイラストは著作権上つかえないので、
 * 「なんとなくそれっぽい かげ」だけを出す。
 * 形は名前から決まるので、同じポケモンなら いつも同じ かげ になる。
 */
export function Silhouette({ name, type, size, shape }: Props) {
  const color = silhouetteColor(type);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${name}の かげ`}
      style={{ display: 'block', color }}
    >
      <ellipse cx="50" cy="92" rx="30" ry="5" fill="currentColor" opacity="0.18" />
      <g fill="currentColor">{renderShape(shape ?? shapeForName(name))}</g>
    </svg>
  );
}

function renderShape(shape: SilhouetteShape) {
  switch (shape) {
    case 'まる':
      return (
        <>
          <polygon points="30,34 22,4 46,22" />
          <polygon points="70,34 78,4 54,22" />
          <ellipse cx="50" cy="58" rx="30" ry="28" />
          <polygon points="76,62 98,48 88,74" />
          <ellipse cx="36" cy="84" rx="11" ry="6" />
          <ellipse cx="64" cy="84" rx="11" ry="6" />
        </>
      );
    case 'よつあし':
      return (
        <>
          <ellipse cx="46" cy="52" rx="30" ry="17" />
          <circle cx="78" cy="38" r="14" />
          <polygon points="70,28 68,10 82,22" />
          <rect x="24" y="62" width="10" height="24" rx="5" />
          <rect x="40" y="62" width="10" height="24" rx="5" />
          <rect x="58" y="62" width="10" height="24" rx="5" />
          <rect x="70" y="62" width="10" height="24" rx="5" />
          <path d="M18 46 C4 40 4 24 14 20" stroke="currentColor" strokeWidth="7" fill="none" strokeLinecap="round" />
        </>
      );
    case 'にそく':
      return (
        <>
          <circle cx="50" cy="26" r="17" />
          <polygon points="36,18 30,2 48,12" />
          <ellipse cx="50" cy="58" rx="21" ry="23" />
          <rect x="16" y="46" width="11" height="24" rx="5.5" transform="rotate(18 21 58)" />
          <rect x="73" y="46" width="11" height="24" rx="5.5" transform="rotate(-18 79 58)" />
          <rect x="34" y="74" width="12" height="18" rx="6" />
          <rect x="54" y="74" width="12" height="18" rx="6" />
        </>
      );
    case 'つばさ':
      return (
        <>
          <polygon points="46,44 4,26 10,56 44,62" />
          <polygon points="54,44 96,26 90,56 56,62" />
          <ellipse cx="50" cy="56" rx="15" ry="22" />
          <circle cx="50" cy="28" r="13" />
          <polygon points="50,26 34,32 50,38" />
          <rect x="42" y="76" width="7" height="14" rx="3.5" />
          <rect x="53" y="76" width="7" height="14" rx="3.5" />
        </>
      );
    case 'へび':
      return (
        <>
          <path
            d="M22 86 C10 66 30 58 46 60 C62 62 74 54 66 40"
            stroke="currentColor"
            strokeWidth="17"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="66" cy="30" r="15" />
          <polygon points="54,22 46,6 64,16" />
          <polygon points="78,22 86,6 68,16" />
        </>
      );
    case 'さかな':
      return (
        <>
          <ellipse cx="52" cy="54" rx="30" ry="19" />
          <polygon points="24,54 4,36 6,74" />
          <polygon points="52,36 44,16 66,32" />
          <polygon points="60,72 54,88 74,74" />
          <circle cx="70" cy="48" r="4" fill="#fff" opacity="0.55" />
        </>
      );
    case 'むし':
      return (
        <>
          <path d="M36 26 L26 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <path d="M60 26 L70 8" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
          <circle cx="48" cy="30" r="14" />
          <ellipse cx="48" cy="58" rx="22" ry="24" />
          <path d="M28 46 L10 40 M28 60 L8 62 M68 46 L86 40 M68 60 L88 62"
            stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
        </>
      );
    case 'おばけ':
      return (
        <>
          <path d="M50 12 C74 12 80 34 80 52 L80 88 L68 76 L58 88 L48 76 L38 88 L28 76 L20 88 L20 52 C20 34 26 12 50 12 Z" />
          <circle cx="40" cy="44" r="6" fill="#fff" opacity="0.65" />
          <circle cx="61" cy="44" r="6" fill="#fff" opacity="0.65" />
        </>
      );
  }
}
