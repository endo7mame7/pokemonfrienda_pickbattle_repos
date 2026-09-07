import { useRef, useState } from 'react';
import { Silhouette } from '../components/Silhouette';
import { POKEMON_TYPES, SILHOUETTE_SHAPES } from '../domain';
import type { Pick, PokemonType, SilhouetteShape } from '../domain';
import { fileToSquareJpeg } from '../image/photo';
import { TYPE_COLORS } from '../ui/typeColors';
import { useObjectUrl } from '../ui/useObjectUrl';
import type { PickInput } from '../db/pickRepository';

interface Props {
  /** 編集するピック。あたらしく登録するときは undefined */
  pick?: Pick | undefined;
  onSave: (input: PickInput) => void;
  onDelete?: (() => void) | undefined;
  onCancel: () => void;
}

const ENERGY_PRESETS = [150, 200, 250, 300, 350];

/** ピックとうろく（S-3）。写真をとって、カードに書かれた3つを入力する */
export function PickFormScreen({ pick, onSave, onDelete, onCancel }: Props) {
  const [name, setName] = useState(pick?.name ?? '');
  const [type, setType] = useState<PokemonType>(pick?.type ?? 'ノーマル');
  const [energy, setEnergy] = useState(pick?.energy ?? 200);
  const [canMegaEvolve, setCanMegaEvolve] = useState(pick?.canMegaEvolve ?? false);
  const [silhouette, setSilhouette] = useState<SilhouetteShape | undefined>(pick?.silhouette);
  const [photo, setPhoto] = useState<Blob | undefined>(pick?.photo);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fileInput = useRef<HTMLInputElement>(null);
  const photoUrl = useObjectUrl(photo);

  const choosePhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    try {
      setPhoto(await fileToSquareJpeg(file));
    } catch {
      setPhotoError('しゃしんを よみこめませんでした');
    }
  };

  const canSave = name.trim().length > 0 && energy > 0;

  return (
    <div className="screen">
      <div className="screen__body form">
        <h1 className="title">{pick ? 'ピックを なおす' : 'ピックを とうろく'}</h1>

        {/* しゃしん */}
        <div className="field">
          <div className="field__label">しゃしん</div>
          <div className="photo-row">
            <div className="photo-preview">
              {photoUrl ? (
                <img src={photoUrl} alt="とったしゃしん" />
              ) : (
                <Silhouette name={name || 'ポケモン'} type={type} shape={silhouette} size={92} />
              )}
            </div>
            <div className="photo-actions">
              {/* iPhone では「写真を撮る/フォトライブラリ/ファイル」が出る */}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  void choosePhoto(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <button
                type="button"
                className="btn"
                onClick={() => fileInput.current?.click()}
              >
                📷 しゃしんを とる
              </button>
              {photo && (
                <button type="button" className="btn btn--ghost" onClick={() => setPhoto(undefined)}>
                  しゃしんを けす
                </button>
              )}
              <p className="hint">とらなくても だいじょうぶ。あとから ふやせます</p>
            </div>
          </div>
          {photoError && <p className="hint hint--error">{photoError}</p>}
        </div>

        {/* なまえ */}
        <div className="field">
          <label className="field__label" htmlFor="pick-name">
            なまえ
          </label>
          <input
            id="pick-name"
            className="text-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ピカチュウ"
          />
        </div>

        {/* タイプ */}
        <div className="field">
          <div className="field__label">タイプ</div>
          <div className="type-grid">
            {POKEMON_TYPES.map((candidate) => (
              <button
                key={candidate}
                type="button"
                className={candidate === type ? 'type-chip type-chip--on' : 'type-chip'}
                style={{ background: TYPE_COLORS[candidate] }}
                onClick={() => setType(candidate)}
              >
                {candidate}
              </button>
            ))}
          </div>
        </div>

        {/* エネルギー値 */}
        <div className="field">
          <div className="field__label">エネルギー（たいりょく）</div>
          <div className="chip-row">
            {ENERGY_PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                className={value === energy ? 'chip chip--on' : 'chip'}
                onClick={() => setEnergy(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <input
            className="text-input"
            type="number"
            inputMode="numeric"
            step={10}
            min={10}
            value={energy}
            onChange={(event) => setEnergy(Number(event.target.value))}
          />
        </div>

        {/* メガシンカ */}
        <div className="field">
          <button
            type="button"
            className={canMegaEvolve ? 'toggle toggle--on' : 'toggle'}
            onClick={() => setCanMegaEvolve((current) => !current)}
          >
            {canMegaEvolve ? '🌈 メガシンカ できる' : 'メガシンカ できない'}
          </button>
        </div>

        {/* かげの形（写真がないときに使う） */}
        <div className="field">
          <div className="field__label">かげの かたち（しゃしんが ないとき）</div>
          <div className="shape-grid">
            {SILHOUETTE_SHAPES.map((shape) => (
              <button
                key={shape}
                type="button"
                className={shape === silhouette ? 'shape-chip shape-chip--on' : 'shape-chip'}
                onClick={() => setSilhouette(shape === silhouette ? undefined : shape)}
              >
                <Silhouette name={name || shape} type={type} shape={shape} size={40} />
                <span>{shape}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            やめる
          </button>
          <button
            type="button"
            className="btn"
            disabled={!canSave}
            onClick={() =>
              onSave({ name: name.trim(), type, energy, canMegaEvolve, silhouette, photo })
            }
          >
            ほぞん
          </button>
        </div>

        {onDelete && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => setConfirmDelete(true)}
          >
            この ピックを けす
          </button>
        )}
      </div>

      {confirmDelete && onDelete && (
        <div className="overlay">
          <div className="overlay__panel">
            <div className="overlay__title" style={{ fontSize: 22 }}>
              {pick?.name}を けしますか？
            </div>
            <p style={{ margin: 0 }}>けすと もとに もどせません</p>
            <button type="button" className="btn btn--danger" onClick={onDelete}>
              けす
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setConfirmDelete(false)}
            >
              やめる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
