import { useCallback, useEffect, useState } from 'react';
import { SAMPLE_PICKS } from './data/samplePicks';
import {
  applyInput,
  createPick,
  incrementUseCount,
  listPicks,
  removePick,
  savePick,
} from './db/pickRepository';
import type { PickInput, PickSort } from './db/pickRepository';
import { loadLastTeams, saveLastTeams } from './db/keyValueRepository';
import type { LastTeams } from './db/keyValueRepository';
import { DEFAULT_SETTINGS } from './domain';
import type { BattleState, Pick, PlayerId } from './domain';
import { BattleScreen } from './screens/BattleScreen';
import { CoinTossScreen } from './screens/CoinTossScreen';
import { HandOffScreen } from './screens/HandOffScreen';
import { PickBookScreen } from './screens/PickBookScreen';
import { PickFormScreen } from './screens/PickFormScreen';
import { ResultScreen } from './screens/ResultScreen';
import { SelectTeamScreen } from './screens/SelectTeamScreen';
import { TeamSizeScreen } from './screens/TeamSizeScreen';
import { TitleScreen } from './screens/TitleScreen';

/** 色と名前でどちらのプレイヤーかを見分ける（文字が読めなくても分かるように） */
const PLAYER_NAMES: Record<PlayerId, string> = { p1: 'あか', p2: 'あお' };

type Flow =
  | { name: 'title' }
  | { name: 'pickBook' }
  | { name: 'pickForm'; pick?: Pick }
  | { name: 'teamSize' }
  | { name: 'selectP1'; size: number }
  | { name: 'handOffToP2'; size: number; p1: Pick[] }
  | { name: 'selectP2'; size: number; p1: Pick[] }
  | { name: 'coinToss'; p1: Pick[]; p2: Pick[] }
  | { name: 'battle'; p1: Pick[]; p2: Pick[]; firstPlayer: PlayerId }
  | { name: 'result'; state: BattleState; p1: Pick[]; p2: Pick[] };

export function App() {
  const [flow, setFlow] = useState<Flow>({ name: 'title' });
  const [picks, setPicks] = useState<Pick[]>([]);
  const [sort, setSort] = useState<PickSort>('useCount');
  const [lastTeams, setLastTeams] = useState<LastTeams>({});
  const [loaded, setLoaded] = useState(false);
  const settings = DEFAULT_SETTINGS;

  const reload = useCallback(async (nextSort: PickSort) => {
    setPicks(await listPicks(nextSort));
  }, []);

  useEffect(() => {
    void (async () => {
      await reload(sort);
      setLastTeams(await loadLastTeams());
      setLoaded(true);
    })();
  }, [reload, sort]);

  const finishBattle = useCallback((state: BattleState) => {
    setFlow((current) =>
      current.name === 'battle'
        ? { name: 'result', state, p1: current.p1, p2: current.p2 }
        : current,
    );
  }, []);

  /** バトルを始めるときに、使用回数と「まえとおなじ」をおぼえる */
  const rememberTeams = useCallback(
    async (p1: Pick[], p2: Pick[]) => {
      const next: LastTeams = { p1: p1.map((p) => p.id), p2: p2.map((p) => p.id) };
      setLastTeams(next);
      await saveLastTeams(next);
      await incrementUseCount([...next.p1!, ...next.p2!]);
      await reload(sort);
    },
    [reload, sort],
  );

  const savePickInput = useCallback(
    async (input: PickInput, existing?: Pick) => {
      await savePick(existing ? applyInput(existing, input) : createPick(input));
      await reload(sort);
      setFlow({ name: 'pickBook' });
    },
    [reload, sort],
  );

  if (!loaded) {
    return (
      <div className="screen">
        <div className="screen__body stack">
          <div style={{ fontSize: 48 }}>🎲</div>
        </div>
      </div>
    );
  }

  switch (flow.name) {
    case 'title':
      return (
        <TitleScreen
          pickCount={picks.length}
          onBattle={() =>
            setFlow(picks.length === 0 ? { name: 'pickBook' } : { name: 'teamSize' })
          }
          onPickBook={() => setFlow({ name: 'pickBook' })}
        />
      );

    case 'pickBook':
      return (
        <PickBookScreen
          picks={picks}
          sort={sort}
          onChangeSort={setSort}
          onAdd={() => setFlow({ name: 'pickForm' })}
          onEdit={(pick) => setFlow({ name: 'pickForm', pick })}
          onAddSamples={() => {
            void (async () => {
              for (const sample of SAMPLE_PICKS) await savePick(sample);
              await reload(sort);
            })();
          }}
          onBack={() => setFlow({ name: 'title' })}
        />
      );

    case 'pickForm':
      return (
        <PickFormScreen
          pick={flow.pick}
          onSave={(input) => void savePickInput(input, flow.pick)}
          onDelete={
            flow.pick
              ? () => {
                  void (async () => {
                    await removePick(flow.pick!.id);
                    await reload(sort);
                    setFlow({ name: 'pickBook' });
                  })();
                }
              : undefined
          }
          onCancel={() => setFlow({ name: 'pickBook' })}
        />
      );

    case 'teamSize':
      return (
        <TeamSizeScreen
          maxSize={Math.min(3, picks.length)}
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
          lastTeam={lastTeams.p1}
          onDecide={(p1) => setFlow({ name: 'handOffToP2', size: flow.size, p1 })}
          onBack={() => setFlow({ name: 'teamSize' })}
        />
      );

    case 'handOffToP2':
      return (
        <HandOffScreen
          playerName={PLAYER_NAMES.p2}
          passPhone
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
          lastTeam={lastTeams.p2}
          onDecide={(p2) => {
            void rememberTeams(flow.p1, p2);
            setFlow({ name: 'coinToss', p1: flow.p1, p2 });
          }}
          onBack={() => setFlow({ name: 'selectP1', size: flow.size })}
        />
      );

    case 'coinToss':
      return (
        <CoinTossScreen
          playerNames={PLAYER_NAMES}
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
          onRematch={() => setFlow({ name: 'coinToss', p1: flow.p1, p2: flow.p2 })}
          onBackToTitle={() => setFlow({ name: 'title' })}
        />
      );
  }
}
