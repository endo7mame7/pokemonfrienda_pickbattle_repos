import { useCallback, useState } from 'react';
import { SAMPLE_PICKS } from './data/samplePicks';
import { DEFAULT_SETTINGS } from './domain';
import type { BattleState, Pick, PlayerId } from './domain';
import { BattleScreen } from './screens/BattleScreen';
import { CoinTossScreen } from './screens/CoinTossScreen';
import { HandOffScreen } from './screens/HandOffScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SelectTeamScreen } from './screens/SelectTeamScreen';
import { TeamSizeScreen } from './screens/TeamSizeScreen';
import { TitleScreen } from './screens/TitleScreen';

/** 色と名前でどちらのプレイヤーかを見分ける（文字が読めなくても分かるように） */
const PLAYER_NAMES: Record<PlayerId, string> = { p1: 'あか', p2: 'あお' };

type Flow =
  | { name: 'title' }
  | { name: 'teamSize' }
  | { name: 'selectP1'; size: number }
  | { name: 'handOffToP2'; size: number; p1: Pick[] }
  | { name: 'selectP2'; size: number; p1: Pick[] }
  | { name: 'coinToss'; p1: Pick[]; p2: Pick[] }
  | { name: 'battle'; p1: Pick[]; p2: Pick[]; firstPlayer: PlayerId }
  | { name: 'result'; state: BattleState; p1: Pick[]; p2: Pick[] };

export function App() {
  const [flow, setFlow] = useState<Flow>({ name: 'title' });
  // P2 でずかん（IndexedDB）に置き換える
  const picks = SAMPLE_PICKS;
  const settings = DEFAULT_SETTINGS;

  const finishBattle = useCallback((state: BattleState) => {
    setFlow((current) =>
      current.name === 'battle'
        ? { name: 'result', state, p1: current.p1, p2: current.p2 }
        : current,
    );
  }, []);

  switch (flow.name) {
    case 'title':
      return <TitleScreen onStart={() => setFlow({ name: 'teamSize' })} />;

    case 'teamSize':
      return (
        <TeamSizeScreen
          onSelect={(size) => setFlow({ name: 'selectP1', size })}
          onBack={() => setFlow({ name: 'title' })}
        />
      );

    case 'selectP1':
      return (
        <SelectTeamScreen
          player="p1"
          playerName={PLAYER_NAMES.p1}
          size={flow.size}
          picks={picks}
          onDecide={(p1) => setFlow({ name: 'handOffToP2', size: flow.size, p1 })}
          onBack={() => setFlow({ name: 'teamSize' })}
        />
      );

    case 'handOffToP2':
      return (
        <HandOffScreen
          playerName={PLAYER_NAMES.p2}
          onContinue={() => setFlow({ name: 'selectP2', size: flow.size, p1: flow.p1 })}
        />
      );

    case 'selectP2':
      return (
        <SelectTeamScreen
          player="p2"
          playerName={PLAYER_NAMES.p2}
          size={flow.size}
          picks={picks}
          onDecide={(p2) => setFlow({ name: 'coinToss', p1: flow.p1, p2 })}
          onBack={() => setFlow({ name: 'selectP1', size: flow.size })}
        />
      );

    case 'coinToss':
      return (
        <CoinTossScreen
          p1Name={PLAYER_NAMES.p1}
          p2Name={PLAYER_NAMES.p2}
          onDecided={(firstPlayer) =>
            setFlow({ name: 'battle', p1: flow.p1, p2: flow.p2, firstPlayer })
          }
        />
      );

    case 'battle':
      return (
        <BattleScreen
          p1={flow.p1}
          p2={flow.p2}
          firstPlayer={flow.firstPlayer}
          settings={settings}
          playerNames={PLAYER_NAMES}
          onFinish={finishBattle}
        />
      );

    case 'result':
      return (
        <ResultScreen
          state={flow.state}
          playerNames={PLAYER_NAMES}
          // 同じチームのまま、コイントスからやり直す
          onRematch={() => setFlow({ name: 'coinToss', p1: flow.p1, p2: flow.p2 })}
          onBackToTitle={() => setFlow({ name: 'title' })}
        />
      );
  }
}
