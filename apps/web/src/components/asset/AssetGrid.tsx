import { AssetCard } from './AssetCard';

export function AssetGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      <AssetCard name="Campaign hero.jpg" blurHash="LEHV6nWB2yk8pyo0adR*.7kCMdnj" status="ready" />
      <AssetCard name="Brand deck.pdf" status="processing" />
      <AssetCard name="Office shot.mp4" status="queued" />
    </div>
  );
}