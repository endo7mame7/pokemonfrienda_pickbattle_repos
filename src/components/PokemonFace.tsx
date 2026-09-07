import { useObjectUrl } from '../ui/useObjectUrl';
import { Silhouette } from './Silhouette';
import type { PokemonType, SilhouetteShape } from '../domain';

interface Props {
  name: string;
  type: PokemonType;
  size: number;
  photo?: Blob | undefined;
  shape?: SilhouetteShape | undefined;
}

/**
 * ポケモンの見た目（docs/SPEC.md §3.9）。
 * 実物ピックの写真があれば写真を、なければ「かげ」を出す。
 */
export function PokemonFace({ name, type, size, photo, shape }: Props) {
  const url = useObjectUrl(photo);

  if (url) {
    return (
      <img
        className="face-photo"
        src={url}
        alt={name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    );
  }
  return <Silhouette name={name} type={type} shape={shape} size={size} />;
}
