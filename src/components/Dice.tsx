const PIPS = ['', '１', '２', '３', '４', '５', '６'];

interface Props {
  values: number[];
  rolling: boolean;
}

export function Dice({ values, rolling }: Props) {
  return (
    <div className="dice">
      {values.map((value, index) => (
        <div key={index} className={rolling ? 'die die--rolling' : 'die'}>
          {rolling ? '?' : (PIPS[value] ?? value)}
        </div>
      ))}
    </div>
  );
}
