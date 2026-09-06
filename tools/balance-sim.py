"""バトルバランス検証シミュレーター

docs/SPEC.md 「3.4 ダメージ計算」のダメージばいりつを決めるために使用した。
現行ルール(v0.2):
  ダメージ = 出目の合計 x ばいりつ + (こうかばつぐんなら +20)
  メガシンカ = たいりょくが 1/3 以下になったら発動し、サイコロが2個になる

1バトルが何ターンで終わるかを試行して平均・95パーセンタイル・最大を出す。
ルールを変更したときは、このスクリプトを再実行してプレイ時間が
園児の集中力（目安10分以内）に収まるかを必ず確認すること。

    python3 tools/balance-sim.py
"""
import random
import statistics

# docs/SPEC.md 「3.5 タイプ相性」と同じ内容
CHART = {
    'ノーマル': [],
    'ほのお': ['くさ', 'こおり', 'むし', 'はがね'],
    'みず': ['ほのお', 'じめん', 'いわ'],
    'でんき': ['みず', 'ひこう'],
    'くさ': ['みず', 'じめん', 'いわ'],
    'こおり': ['くさ', 'じめん', 'ひこう', 'ドラゴン'],
    'かくとう': ['ノーマル', 'こおり', 'いわ', 'あく', 'はがね'],
    'どく': ['くさ', 'フェアリー'],
    'じめん': ['ほのお', 'でんき', 'どく', 'いわ', 'はがね'],
    'ひこう': ['くさ', 'かくとう', 'むし'],
    'エスパー': ['かくとう', 'どく'],
    'むし': ['くさ', 'エスパー', 'あく'],
    'いわ': ['ほのお', 'こおり', 'ひこう', 'むし'],
    'ゴースト': ['エスパー', 'ゴースト'],
    'ドラゴン': ['ドラゴン'],
    'あく': ['エスパー', 'ゴースト'],
    'はがね': ['こおり', 'いわ', 'フェアリー'],
    'フェアリー': ['かくとう', 'ドラゴン', 'あく'],
}
TYPES = list(CHART)

SUPER_EFFECTIVE_BONUS = 20   # こうかばつぐんの追加ダメージ
MEGA_THRESHOLD = 1 / 3       # メガシンカ発動ライン（たいりょく比）
ENERGY_MIN, ENERGY_MAX = 150, 350
MEGA_RATE = 0.4              # メガシンカできるピックの割合の想定
SECONDS_PER_TURN = 20        # 実機での1ターンの所要時間の想定
TRIALS = 20000


def _make_team(size):
    team = []
    for _ in range(size):
        hp = random.randrange(ENERGY_MIN, ENERGY_MAX + 1, 10)
        team.append({
            'hp': hp,
            'max': hp,
            'type': random.choice(TYPES),
            'can_mega': random.random() < MEGA_RATE,
            'mega': False,
        })
    return team


def battle(multiplier, size):
    """1バトルを最後まで進めて、かかったターン数を返す。"""
    teams = [_make_team(size), _make_team(size)]
    turns = 0
    side = 0
    while all(any(p['hp'] > 0 for p in t) for t in teams):
        turns += 1
        attacker = next(p for p in teams[side] if p['hp'] > 0)
        target = next(p for p in teams[1 - side] if p['hp'] > 0)

        dice = [random.randint(1, 6)]
        if attacker['mega']:
            dice.append(random.randint(1, 6))
        damage = sum(dice) * multiplier
        if target['type'] in CHART[attacker['type']]:
            damage += SUPER_EFFECTIVE_BONUS

        target['hp'] = max(0, target['hp'] - damage)
        # ダメージ適用後に、受けた側のメガシンカを判定する（ひんしなら発動しない）
        if (target['can_mega'] and not target['mega']
                and 0 < target['hp'] <= target['max'] * MEGA_THRESHOLD):
            target['mega'] = True

        side = 1 - side
    return turns


def main():
    rate = sum(1 for a in TYPES for b in TYPES if b in CHART[a]) / len(TYPES) ** 2
    print(f"ルール: ダメージ = 出目 x ばいりつ + {SUPER_EFFECTIVE_BONUS}(ばつぐん時)"
          f" / メガシンカ = たいりょく {MEGA_THRESHOLD:.0%} 以下")
    print(f"こうかばつぐん発生率: {rate:.1%}（ランダムなタイプ同士の場合）\n")

    for multiplier in (10, 20, 30):
        for size in (1, 2, 3):
            turns = [battle(multiplier, size) for _ in range(TRIALS)]
            mean = statistics.mean(turns)
            p95 = sorted(turns)[int(len(turns) * 0.95)]
            minutes = mean * SECONDS_PER_TURN / 60
            print(f"x{multiplier:<3} {size}vs{size}: 平均{mean:5.1f}ターン "
                  f"(95%tile {p95:3d}, 最大{max(turns):3d}) 約{minutes:4.1f}分")
        print()

    print("ばつぐんボーナスの相対的な重み:")
    for multiplier in (10, 20, 30):
        avg = 3.5 * multiplier
        print(f"  x{multiplier}: 平均ダメージ{avg:.0f} に対して "
              f"+{SUPER_EFFECTIVE_BONUS} は +{SUPER_EFFECTIVE_BONUS / avg:.0%}")


if __name__ == '__main__':
    main()
