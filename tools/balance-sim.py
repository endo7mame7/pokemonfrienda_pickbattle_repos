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
            # 攻撃した子は つかれる。休んだ子だけ 回復する。
            # 戦える子が1体だけなら 交代できないので つかれない
            if sum(1 for p in teams[side] if p['hp'] > 0) >= 2:
                for p in teams[side]:
                    p['tired'] = p is attacker
            else:
                for p in teams[side]:
                    p['tired'] = False

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


# ── タイミング方式（docs/SPEC.md §3.4）
MOVE_POWER = {'normal': 110, 'strong': 220}
SPEED_SCALE = {'fast': 1.4, 'normal': 1.0, 'slow': 0.7}
TIMING_MULT = {'perfect': 2.0, 'near': 1.0, 'miss': 0.5}
# はずした ときの ばいりつ。つよいわざ だけ 0（docs/SPEC.md §3.4）
MISS_MULT = {'normal': 0.5, 'strong': 0.0}
# 園児の うでまえ の想定（ぴったり / ちかい の確率）
# まんなかに どれくらい 寄せられるか（0 = でたらめ、1 = かならず まんなか）
SKILL = {'園児': 0.0, '大人': 0.45}


# ねらう はば の ばいすう（docs/SPEC.md §3.6・§3.7）
TIRED_ZONE = {'perfect': 0.5, 'gap_width': 1.4, 'near': 0.7}
MEGA_ZONE = {'perfect': 1.5, 'gap_width': 0.7, 'near': 1.2}
# gap_width は ぴったり の すぐ そとに おく「あいだの はずれ」の はば
BASE_ZONE = {'normal': {'perfect': 0.12, 'gap_width': 0.0, 'near': 0.32},
             'strong': {'perfect': 0.06, 'gap_width': 0.06, 'near': 0.26}}


def timing_result(move, tired, mega, skill):
    """ゲージを止めた結果。うでまえ は「まんなかを どれくらい ねらえるか」で表す。

    園児は ほぼ でたらめ に止めるので、成功率は ゾーンの ひろさ に比例する。
    うまい人ほど まんなか に寄るので、その ぶん を skill_bias で足す。
    """
    zone = BASE_ZONE[move]
    def scaled(key):
        return zone[key] * (TIRED_ZONE[key] if tired else 1) * (MEGA_ZONE[key] if mega else 1)
    perfect = scaled('perfect')
    gap = perfect + scaled('gap_width')     # ここまでが「あいだの はずれ」
    near = max(scaled('near'), gap)
    bias = skill  # 0 = でたらめ、大きいほど まんなかに寄る
    # まんなかからの ずれ。bias が大きいほど 0 に近くなる
    distance = abs(random.random() - 0.5) * (1 - bias)
    if distance <= perfect:
        return 'perfect'
    if distance <= gap:
        return 'miss'   # あいだの はずれ
    if distance <= near:
        return 'near'
    return 'miss'       # そとの はずれ


def timing_battle(size, speed='normal', skill=SKILL['園児'], strong_rate=0.45,
                  bonus=DEFAULT_BONUS, mega=DEFAULT_MEGA, fatigue=DEFAULT_FATIGUE,
                  strategy='rotate'):
    """タイミング方式で1バトルを進めて、かかったターン数を返す。"""
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

        move = 'strong' if random.random() < strong_rate else 'normal'
        was_tired = fatigue and attacker['tired']
        result = timing_result(move, was_tired, attacker['mega'], skill)

        mult = MISS_MULT[move] if result == 'miss' else TIMING_MULT[result]
        damage = MOVE_POWER[move] * SPEED_SCALE[speed] * mult
        if attacker['mega']:
            damage *= 1.5
        if damage > 0 and target['type'] in CHART[attacker['type']]:
            damage += bonus
        # つかれても ダメージは減らさない。ねらう はば が せまくなる ぶん で効く
        damage = ceil_to_10(int(damage))

        if fatigue:
            # 攻撃した子は つかれる。休んだ子だけ 回復する。
            # 戦える子が1体だけなら 交代できないので つかれない
            if sum(1 for p in teams[side] if p['hp'] > 0) >= 2:
                for p in teams[side]:
                    p['tired'] = p is attacker
            else:
                for p in teams[side]:
                    p['tired'] = False

        target['hp'] = max(0, target['hp'] - damage)
        if (mega is not None and target['can_mega'] and not target['mega']
                and target['hp'] > 0
                and target['hp'] * mega[1] <= target['max'] * mega[0]):
            target['mega'] = True

        side = 1 - side
        if turns > 3000:
            break
    return turns


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

    print("■ タイミング方式（既定）— わざ ふつう110 / つよい220（はずすと 0）")
    for label, skill in SKILL.items():
        for speed in ('fast', 'normal', 'slow'):
            row = f"  {label} {speed:<7}: "
            for size in (1, 2, 3):
                turns = [timing_battle(size, speed, skill) for _ in range(TRIALS)]
                mean = statistics.mean(turns)
                row += f"{size}vs{size} {mean:5.1f}ターン(約{mean * SECONDS_PER_TURN / 60:4.1f}分) "
            print(row)
        print()

    print("■ タイミング方式で、交代して戦うと どれだけ得か（園児・ふつう）")
    print(f"  {'':6}{'交代する':>12}{'同じ子を連打':>14}")
    for size in (1, 2, 3):
        rot = statistics.mean([timing_battle(size, strategy='rotate') for _ in range(TRIALS)])
        same = statistics.mean([timing_battle(size, strategy='same') for _ in range(TRIALS)])
        print(f"  {size}vs{size}{'':2}{rot:9.1f}ターン{same:11.1f}ターン")
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
