export default function About() {
  return (
    <div className="about-body">
      <h1 className="page-title">About AIR LENS</h1>
      <p>
        Most air-quality apps — Plume Labs, IQAir AirVisual, AQI Path — tell you the pollution
        level for a city or a single point on the map: one number for wherever you happen to be
        standing right now. That's useful for deciding whether to go outside at all, but it
        doesn't help with a much more common decision: when you're already going somewhere, which
        way should you go? AIR LENS is built around that second question, for Tamil Nadu
        specifically. Give it a starting point and a destination anywhere in the state — Chennai,
        Coimbatore, Madurai, or any city in between — and instead of one number it compares the
        actual routes between them on real roads with live traffic, pulling real-time PM2.5
        readings from CPCB's Tamil Nadu monitoring network along each path, and estimating how
        much pollution you'd breathe in on that specific trip. That's converted into a relatable
        "cigarette equivalent" so the difference between a cleaner route and a faster-but-dirtier
        one is immediate and concrete, not an abstract micrograms-per-cubic-meter figure. It's a
        smaller, more personal question than most air-quality tools try to answer — but it's the
        one you're actually facing every time you leave the house.
      </p>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Built by team ERROR_503.
      </p>
    </div>
  );
}
