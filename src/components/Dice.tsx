const PIPS = ['', '１', '２', '３', '４', '５', '６'];

interface Props {
  values: number[];
  rolling: boolean;
  /** 結果を見せるときは じゃまにならない大きさにする */
  small?: boolean;
}

export function Dice({ values, rolling, small = false }: Props) {
  return (
    <div className="dice">
      {values.map((value, index) => (
        <div
          key={index}
          className={['die', rolling && 'die--rolling', small && 'die--small']
            .filter(Boolean)
            .join(' ')}
        >
          {rolling ? '?' : (PIPS[value] ?? value)}
        </div>
      ))}
    </div>
  );
}
