import { shapeForName, silhouetteColor } from '../ui/silhouette';
import type { PokemonType, SilhouetteShape } from '../domain';

interface Props {
  name: string;
  type: PokemonType;
  size: number;
  shape?: SilhouetteShape | undefined;
  /** メガシンカ中は とがった オーラ と つの が付いて、つよそうに見える */
  mega?: boolean;
}

/**
 * 生きもののシルエット。実在のポケモンのイラストは著作権上つかえないので、
 * 「なんとなくそれっぽい かげ」だけを出す。
 * 形は名前から決まるので、同じポケモンなら いつも同じ かげ になる。
 */
export function Silhouette({ name, type, size, shape, mega = false }: Props) {
  const color = silhouetteColor(type);
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={mega ? `メガシンカした ${name}の かげ` : `${name}の かげ`}
      style={{ display: 'block', color }}
    >
      <ellipse cx="50" cy="92" rx="30" ry="5" fill="currentColor" opacity="0.18" />
      {mega && <g fill="currentColor">{renderMegaAura()}</g>}
      <g fill="currentColor" transform={mega ? 'translate(50 54) scale(0.88) translate(-50 -54)' : undefined}>
        {renderShape(shape ?? shapeForName(name))}
      </g>
      {mega && <g fill="currentColor">{renderMegaCrest()}</g>}
    </svg>
  );
}

/** どの かたち にも つけられる とがった オーラ */
function renderMegaAura() {
  return Array.from({ length: 14 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 14 - Math.PI / 2;
    const inner = 30;
    const outer = index % 2 === 0 ? 49 : 41;
    const spread = 0.1;
    const point = (a: number, radius: number) =>
      `${(50 + Math.cos(a) * radius).toFixed(1)},${(54 + Math.sin(a) * radius).toFixed(1)}`;
    const points = [
      point(angle - spread, inner),
      point(angle, outer),
      point(angle + spread, inner),
    ].join(' ');
    return <polygon key={index} points={points} opacity="0.5" />;
  });
}

/** あたまの うえ の とがった かんむり */
function renderMegaCrest() {
  return (
    <>
      <polygon points="34,20 40,2 46,18" />
      <polygon points="50,16 50,-2 56,14" />
      <polygon points="62,20 68,4 66,20" />
    </>
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
    case 'きょだい':
      return (
        <>
          <polygon points="34,18 30,2 46,12" />
          <polygon points="66,18 70,2 54,12" />
          <circle cx="50" cy="26" r="18" />
          <ellipse cx="50" cy="62" rx="33" ry="27" />
          <ellipse cx="20" cy="56" rx="9" ry="15" transform="rotate(18 20 56)" />
          <ellipse cx="80" cy="56" rx="9" ry="15" transform="rotate(-18 80 56)" />
          <ellipse cx="35" cy="87" rx="14" ry="7" />
          <ellipse cx="65" cy="87" rx="14" ry="7" />
        </>
      );
    case 'とげとげ':
      return (
        <>
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (Math.PI * 2 * i) / 12;
            const x = 50 + Math.cos(angle) * 26;
            const y = 56 + Math.sin(angle) * 26;
            const tipX = 50 + Math.cos(angle) * 42;
            const tipY = 56 + Math.sin(angle) * 42;
            const side = angle + Math.PI / 2;
            return (
              <polygon
                key={i}
                points={`${x + Math.cos(side) * 7},${y + Math.sin(side) * 7} ${tipX},${tipY} ${
                  x - Math.cos(side) * 7
                },${y - Math.sin(side) * 7}`}
              />
            );
          })}
          <circle cx="50" cy="56" r="27" />
        </>
      );
    case 'ドラゴン':
      return (
        <>
          <polygon points="40,44 6,20 14,58" />
          <polygon points="60,44 94,20 86,58" />
          <ellipse cx="50" cy="56" rx="19" ry="24" />
          <circle cx="50" cy="26" r="15" />
          <polygon points="38,18 32,2 48,12" />
          <polygon points="62,18 68,2 52,12" />
          <path d="M50 80 C50 94 30 92 24 84" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round" />
        </>
      );
    case 'いわ':
      return (
        <>
          <polygon points="24,16 46,6 64,14 58,30 34,32" />
          <polygon points="16,40 40,30 68,32 84,46 78,74 22,72" />
          <polygon points="8,52 20,44 22,66" />
          <polygon points="92,52 80,44 78,66" />
          <rect x="28" y="72" width="14" height="18" rx="5" />
          <rect x="58" y="72" width="14" height="18" rx="5" />
          <circle cx="40" cy="50" r="5" fill="#fff" opacity="0.45" />
          <circle cx="60" cy="50" r="5" fill="#fff" opacity="0.45" />
        </>
      );
    case 'しょくぶつ':
      return (
        <>
          <rect x="46" y="46" width="8" height="42" rx="4" />
          <ellipse cx="26" cy="58" rx="18" ry="9" transform="rotate(-20 26 58)" />
          <ellipse cx="74" cy="58" rx="18" ry="9" transform="rotate(20 74 58)" />
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (Math.PI * 2 * i) / 6;
            return (
              <ellipse
                key={i}
                cx={50 + Math.cos(angle) * 15}
                cy={30 + Math.sin(angle) * 15}
                rx="9"
                ry="9"
              />
            );
          })}
          <circle cx="50" cy="30" r="10" fill="#fff" opacity="0.55" />
        </>
      );
    case 'くらげ':
      return (
        <>
          <path d="M18 56 A32 32 0 0 1 82 56 Z" />
          <path
            d="M28 58 C26 72 34 74 30 88 M42 60 C40 74 48 78 44 90 M58 60 C60 74 52 78 56 90 M72 58 C74 72 66 74 70 88"
            stroke="currentColor"
            strokeWidth="6"
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case 'ロボット':
      return (
        <>
          <rect x="47" y="6" width="6" height="12" rx="3" />
          <circle cx="50" cy="6" r="5" />
          <rect x="30" y="18" width="40" height="30" rx="8" />
          <circle cx="40" cy="33" r="5" fill="#fff" opacity="0.6" />
          <circle cx="60" cy="33" r="5" fill="#fff" opacity="0.6" />
          <rect x="34" y="52" width="32" height="30" rx="6" />
          <rect x="16" y="54" width="12" height="24" rx="6" />
          <rect x="72" y="54" width="12" height="24" rx="6" />
          <rect x="36" y="84" width="12" height="10" rx="4" />
          <rect x="52" y="84" width="12" height="10" rx="4" />
        </>
      );
    case 'こうら':
      return (
        <>
          <circle cx="78" cy="46" r="13" />
          <path d="M14 68 A34 30 0 0 1 82 68 Z" />
          <ellipse cx="50" cy="68" rx="34" ry="7" />
          <rect x="22" y="70" width="11" height="18" rx="5" />
          <rect x="67" y="70" width="11" height="18" rx="5" />
          <circle cx="50" cy="52" r="9" fill="#fff" opacity="0.35" />
        </>
      );
  }
}
