import { useEffect, useState } from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

type VenueImageProps = {
  uri: string;
  fallbackUri?: string;
  style: StyleProp<ImageStyle>;
};

const fallbackImage = require('../../assets/app-icon.png');

/** Tries a relevant venue image before falling back to the app mark. */
export function VenueImage({ uri, fallbackUri, style }: VenueImageProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  useEffect(() => { setSourceIndex(0); }, [uri, fallbackUri]);
  const sources = fallbackUri && fallbackUri !== uri ? [uri, fallbackUri] : [uri];
  const currentUri = sources[sourceIndex];
  const useAppFallback = !currentUri;

  return (
    <Image
      source={useAppFallback ? fallbackImage : { uri: currentUri }}
      style={style}
      resizeMode={useAppFallback ? 'contain' : 'cover'}
      onError={() => setSourceIndex(index => index + 1)}
    />
  );
}
