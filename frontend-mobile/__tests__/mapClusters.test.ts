import type { Region } from 'react-native-maps';
import { clusterVenues } from '../src/utils/mapClusters';
import type { Venue } from '../src/types/venue';

const region: Region = { latitude: 40.75, longitude: -73.98, latitudeDelta: 0.09, longitudeDelta: 0.09 };
const venue = (id: string, lat?: number, lng?: number): Venue => ({
  id, name: id, type: 'Cafe', distance: '—', availability: 'Varies', rating: 4, price: 5, lat, lng,
});

describe('clusterVenues', () => {
  it('combines nearby venues into one marker at their centre', () => {
    const clusters = clusterVenues([venue('one', 40.7501, -73.9801), venue('two', 40.7502, -73.9802)], region);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].latitude).toBeCloseTo(40.75015, 8);
    expect(clusters[0].longitude).toBeCloseTo(-73.98015, 8);
    expect(clusters[0].venues.map(item => item.id)).toEqual(['one', 'two']);
  });

  it('keeps distant venues separate and ignores venues without coordinates', () => {
    const clusters = clusterVenues([venue('north', 40.78, -73.98), venue('south', 40.72, -73.98), venue('unknown')], region);
    expect(clusters).toHaveLength(2);
    expect(clusters.flatMap(cluster => cluster.venues).map(item => item.id)).toEqual(['north', 'south']);
  });
});
