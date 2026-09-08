# ポケモンフレンダ ピックバトル

ポケモンフレンダの「ピック」に書かれた **ポケモン名 / タイプ / エネルギー値** だけを使って遊ぶ、
幼稚園児でも自分で遊べるデジタル・ポケモンバトルアプリ。

**親の iPhone 1台**を子どもと交代で使って遊ぶ。App Store は使わず、
Safari の「ホーム画面に追加」で全画面アプリとして動く Web アプリ（PWA）。

- 1vs1 〜 3vs3 のチームバトル
- エネルギー値がそのまま「たいりょく」。0 になったらひんし
- コイントスで先攻を決め、わざをえらんでゲージをまんなかで止める。ぴったりで2倍
- 攻撃はこうげきする子から相手へ飛ぶ演出。タイプごとに見た目が変わり、ダメージが大きいほど はでになる
- 対面で遊べるよう、チームの位置は手番が変わっても入れかわらない
- こうかばつぐんで +20、たいりょくが 1/3 以下になると **メガシンカ するか選べる**（サイコロが2個に）
- 全力で攻撃すると「つかれる」。次のターンは半減するので、交代して戦うと有利
- ばつぐんの加算値・メガシンカのタイミング・つかれルールは設定で変更できる
- 手もとの実物ピックを撮って登録できる。写真がないポケモンは「かげ（シルエット）」で表示する
- 登録したピックはデータベース（IndexedDB）に保存され、次回からは選ぶだけ

## ドキュメント

| ファイル | 内容 |
| --- | --- |
| [docs/SPEC.md](docs/SPEC.md) | 仕様書 v0.8（ゲームルール・設定・バランス検証・UX要件・画面・データモデル・iPhone/PWA対応・データベース・開発フェーズ） |
| [tools/balance-sim.py](tools/balance-sim.py) | バトル時間のバランス検証シミュレーター |

ルールや設定の既定値を変えたら、シミュレーターでプレイ時間を再確認する。

```
python3 tools/balance-sim.py
```

## iPhone で遊ぶには

### 1. GitHub Pages に置く（おすすめ・URL がずっと使える）

1. GitHub のリポジトリで **Settings → Pages → Source** を `GitHub Actions` にする
2. **Actions** タブ → `Deploy to GitHub Pages` → **Run workflow** で配信したいブランチを選んで実行
3. 数分後、`https://<ユーザー名>.github.io/pokemonfrienda_pickbattle_repos/` で開けるようになる

iPhone の Safari でその URL を開き、**共有ボタン → 「ホーム画面に追加」**。
アイコンから全画面で起動する。App Store も Apple Developer Program も不要。

> 以後、`main` に push するたび自動で更新される。

### 2. 手元の PC ですぐ試す（同じ Wi-Fi の iPhone から見る）

```
npm install
npm run dev -- --host
```

表示される `http://192.168.x.x:5173/` を iPhone の Safari で開く。
PC を起動している間だけ遊べる。

## 開発

```
npm install
npm run dev       # 開発サーバー
npm test          # ユニットテスト（93件）
npm run typecheck
npm run build
```

### ブラウザでの確認

iPhone SE（375×667）の画面で実際に動かして確かめる。

```
npm run build
npm run preview &               # http://localhost:4173
TEAM_SIZE=3 npm run smoke       # バトルを最後まで自動プレイ
npm run check:pickbook          # 写真つきの登録と、開き直しても残ること
npm run check:timing            # タイミング方式のバトルを通しで確認
npm run preview:effects <出力先> # 攻撃エフェクトの見た目を撮る
```

環境によっては `CHROMIUM_PATH=/path/to/chrome` を付ける。

## 開発状況

- 仕様策定（v0.8）… 完了
- **P0: ルールの土台**（タイプ相性・ダメージ計算・つかれ・メガシンカ・バトル進行 + テスト49件）… 完了
- **P1: 遊べる最小版**（タイトル → 人数 → チーム → コイントス → バトル → けっか。ずかんは仮データ）… 完了
- **P2: ずかんデータベース**（IndexedDB・写真登録・モードえらび・まえとおなじ）… 完了
- P3: PWA 化（オフライン対応・ホーム画面追加の案内）… これから
