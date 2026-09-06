"""バトルバランス検証シミュレーター

docs/SPEC.md 「5. バランス検証」の数値を出すために使う。
現行ルール(v0.3):
  ダメージ = (出目の合計 x ばいりつ + ばつぐんボーナス) ÷ つかれ
    - ばつぐんボーナス: こうかばつぐんのとき加算（既定 +20）
    - つかれ: つかれた状態で攻撃するとダメージ半分（10の倍数に切り上げ）
              全力で攻撃するとつかれる / つかれた状態で攻撃すると元気に戻る
              / 休んだポケモンは元気に戻る
  メガシンカ: たいりょくが既定 1/3 以下になったら「する?」ときかれ、
              すると サイコロが2個になる。このシミュレーターは
              「できるときは必ずする」= いちばん上手に戦った場合を計算する

ルールや設定の既定値を変えたときは、このスクリプトを再実行して
プレイ時間が園児の集中力（目安10分以内）に収まるかを必ず確認すること。

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

# 既定の設定（docs/SPEC.md §4 の DEFAULT_SETTINGS に対応）
DEFAULT_BONUS = 20        # ばつぐんボーナス
# メガシンカ発動ライン。小数にすると 300 x (1/3) が 99.999... になり
# ちょうど 1/3 のときに発動しなくなるため、分数 (分子, 分母) で持つ
DEFAULT_MEGA = (1, 3)
DEFAULT_FATIGUE = True    # つかれルール

ENERGY_MIN, ENERGY_MAX = 150, 350
MEGA_RATE = 0.4           # メガシンカできるピックの割合の想定
SECONDS_PER_TURN = 20     # 実機での1ターンの所要時間の想定
TRIALS = 20000


def ceil_to_10(n):
    """10の倍数に切り上げる（端数は子どもに有利な側へ）。"""
    return -(-n // 10) * 10


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
            'tired': False,
        })
    return team


def battle(multiplier, size, bonus=DEFAULT_BONUS, mega=DEFAULT_MEGA,
           fatigue=DEFAULT_FATIGUE, strategy='rotate'):
    """1バトルを最後まで進めて、かかったターン数を返す。

    strategy: 'rotate' = つかれていないポケモンを優先して使う（上手な戦い方）
              'same'   = いつも同じポケモンで殴り続ける（素朴な戦い方）
    """
    teams = [_make_team(size), _make_team(size)]
    turns = 0
    side = 0
    while all(any(p['hp'] > 0 for p in t) for t in teams):
        turns += 1
        alive = [p for p in teams[side] if p['hp'] > 0]
        if strategy == 'rotate':
            fresh = [p for p in alive if not p['tired']]
            attacker = fresh[0] if fresh else alive[0]
        else:
            attacker = alive[0]
        target = next(p for p in teams[1 - side] if p['hp'] > 0)

        dice = [random.randint(1, 6)]
        if attacker['mega']:
            dice.append(random.randint(1, 6))
        damage = sum(dice) * multiplier
        if target['type'] in CHART[attacker['type']]:
            damage += bonus

        was_tired = fatigue and attacker['tired']
        if was_tired:
            damage = ceil_to_10(damage // 2)
        if fatigue:
            # 攻撃した子は「全力ならつかれる / つかれていたら回復」、
            # 休んだ子は回復する
            for p in teams[side]:
                p['tired'] = (not was_tired) if p is attacker else False

        target['hp'] = max(0, target['hp'] - damage)
        # ダメージ適用後に、受けた側のメガシンカを判定する（ひんしなら発動しない）
        if (mega is not None and target['can_mega'] and not target['mega']
                and target['hp'] > 0
                and target['hp'] * mega[1] <= target['max'] * mega[0]):
            target['mega'] = True

        side = 1 - side
        if turns > 3000:
            break
    return turns


def _stats(**kwargs):
    turns = [battle(**kwargs) for _ in range(TRIALS)]
    return statistics.mean(turns), max(turns)


def main():
    rate = sum(1 for a in TYPES for b in TYPES if b in CHART[a]) / len(TYPES) ** 2
    print(f"こうかばつぐん発生率: {rate:.1%}（ランダムなタイプ同士の場合）")
    print(f"既定の設定: ばつぐん +{DEFAULT_BONUS} / "
          f"メガシンカ {DEFAULT_MEGA[0]}/{DEFAULT_MEGA[1]} 以下 / "
          f"つかれ {'あり' if DEFAULT_FATIGUE else 'なし'}\n")

    print("■ ダメージばいりつ別の所要時間（既定の設定・交代して戦う場合）")
    for mult in (10, 20, 30):
        for size in (1, 2, 3):
            mean, worst = _stats(multiplier=mult, size=size)
            print(f"  x{mult:<3} {size}vs{size}: 平均{mean:5.1f}ターン (最大{worst:3d}) "
                  f"約{mean * SECONDS_PER_TURN / 60:4.1f}分")
        print()

    print("■ つかれルールの影響（ばいりつ x20）")
    print(f"  {'':6}{'つかれなし':>12}{'あり・交代':>12}{'あり・連打':>12}")
    for size in (1, 2, 3):
        off, _ = _stats(multiplier=20, size=size, fatigue=False)
        rot, _ = _stats(multiplier=20, size=size, fatigue=True, strategy='rotate')
        same, _ = _stats(multiplier=20, size=size, fatigue=True, strategy='same')
        print(f"  {size}vs{size}{'':2}{off:9.1f}ターン{rot:9.1f}ターン{same:9.1f}ターン")

    print("\n■ ばつぐんボーナスの相対的な重み")
    for mult in (10, 20, 30):
        avg = 3.5 * mult
        print(f"  x{mult}: 平均ダメージ{avg:.0f} に対して "
              f"+{DEFAULT_BONUS} は +{DEFAULT_BONUS / avg:.0%}")

    print("\n■ メガシンカ発動ライン別の所要時間（ばいりつ x20・3vs3）")
    for label, ratio in (('1/2', (1, 2)), ('1/3', (1, 3)), ('1/4', (1, 4)), ('つかわない', None)):
        mean, worst = _stats(multiplier=20, size=3, mega=ratio)
        print(f"  {label:<10}: 平均{mean:5.1f}ターン (最大{worst:3d}) "
              f"約{mean * SECONDS_PER_TURN / 60:4.1f}分")


if __name__ == '__main__':
    main()
