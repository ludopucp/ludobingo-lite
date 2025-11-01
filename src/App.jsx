import { useEffect, useMemo, useState } from "react";
import BingoCard from "./components/BingoCard.jsx";
import { compactSeedToGlobal, seedToGrid } from "./lib/bingoEncoding.js";

const MIN_SEED = 1;
const MAX_SEED = 999;
const STORAGE_KEYS = {
  seeds: "ludoBingo.seeds",
  markedNumbers: "ludoBingo.markedNumbers",
};

function normalizeSeed(value) {
  const seed = Number.parseInt(value, 10);
  if (!Number.isInteger(seed)) return null;
  if (seed < MIN_SEED || seed > MAX_SEED) return null;
  return seed;
}

function parseSeedsInput(input) {
  const tokens = input.split(/[^0-9]+/);
  const seen = new Set();
  const seeds = [];
  for (const token of tokens) {
    if (!token) continue;
    const parsed = normalizeSeed(token);
    if (parsed === null) continue;
    if (seen.has(parsed)) continue;
    seen.add(parsed);
    seeds.push(parsed);
  }
  return seeds;
}

function loadSeeds() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.seeds);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => normalizeSeed(value))
      .filter((value) => value !== null);
  } catch {
    return [];
  }
}

function loadMarkedNumbers() {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const stored = window.localStorage.getItem(
      STORAGE_KEYS.markedNumbers,
    );
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return {};
    const result = {};
    for (const [seed, values] of Object.entries(parsed)) {
      if (!Array.isArray(values)) continue;
      const filtered = values
        .map((value) => Number(value))
        .filter(
          (value) =>
            Number.isInteger(value) && value >= 1 && value <= 60,
        );
      if (filtered.length > 0) {
        result[seed] = Array.from(new Set(filtered)).sort(
          (a, b) => a - b,
        );
      }
    }
    return result;
  } catch {
    return {};
  }
}

function pruneMarked(marked, allowedSeeds) {
  let changed = false;
  const next = {};
  for (const [seed, numbers] of Object.entries(marked)) {
    if (allowedSeeds.has(Number(seed))) {
      next[seed] = numbers;
    } else {
      changed = true;
    }
  }
  return changed ? next : marked;
}

function seedToCard(seed) {
  const globalSeed = compactSeedToGlobal(seed);
  const grid = seedToGrid(globalSeed);
  return {
    id: seed,
    seed,
    grid,
  };
}

export default function App() {
  const [seeds, setSeeds] = useState(loadSeeds);
  const [seedsInput, setSeedsInput] = useState(() =>
    loadSeeds()
      .map((seed) => seed.toString().padStart(3, "0"))
      .join(", "),
  );
  const [submitError, setSubmitError] = useState("");
  const [markedNumbersBySeed, setMarkedNumbersBySeed] = useState(
    loadMarkedNumbers,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEYS.seeds,
      JSON.stringify(seeds),
    );
  }, [seeds]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEYS.markedNumbers,
      JSON.stringify(markedNumbersBySeed),
    );
  }, [markedNumbersBySeed]);

  useEffect(() => {
    const allowedSeeds = new Set(seeds);
    setMarkedNumbersBySeed((previous) =>
      pruneMarked(previous, allowedSeeds),
    );
  }, [seeds]);

  const cards = useMemo(
    () => seeds.map((seed) => seedToCard(seed)),
    [seeds],
  );

  function handleSubmitSeeds(event) {
    event.preventDefault();
    const parsed = parseSeedsInput(seedsInput);
    if (parsed.length === 0) {
      setSubmitError(
        "Ingresa al menos una semilla válida entre 001 y 999.",
      );
      return;
    }
    setSeeds(parsed);
    setSeedsInput(
      parsed.map((seed) => seed.toString().padStart(3, "0")).join(", "),
    );
    setSubmitError("");
  }

  function handleToggleMarked(seed, value) {
    setMarkedNumbersBySeed((previous) => {
      const key = String(seed);
      const current = new Set(previous[key] ?? []);
      if (current.has(value)) {
        current.delete(value);
      } else {
        current.add(value);
      }

      const next = { ...previous };
      if (current.size === 0) {
        delete next[key];
      } else {
        next[key] = Array.from(current).sort((a, b) => a - b);
      }
      return next;
    });
  }

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>Ludo Bingo</h1>
          <p>
            Ingresa los números de tus cartillas (001-999) para jugar.
          </p>
        </div>
      </header>

      <section className="seeds-panel">
        <h2>Ingresa tus cartillas</h2>
        <p>
          Separa los números con espacios, comas o saltos de línea.
        </p>
        <form className="seeds-form" onSubmit={handleSubmitSeeds}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9 ,]*"
            placeholder="Ej: 007, 125, 348"
            value={seedsInput}
            onChange={(event) => setSeedsInput(event.target.value)}
          />
          <button type="submit">Ver bingos</button>
        </form>
        {submitError && <p className="form-error">{submitError}</p>}
      </section>

      <section className="cards-grid">
        {cards.length === 0 ? (
          <div className="cards-placeholder">
            <p>
              Ingresa semillas y presiona <strong>Ver bingos</strong> para
              visualizar tus cartillas.
            </p>
          </div>
        ) : (
          cards.map((card) => (
            <BingoCard
              key={card.id}
              card={card}
              title={`Cartilla #${card.seed.toString().padStart(3, "0")}`}
              markedNumbers={markedNumbersBySeed[card.seed] ?? []}
              onToggleNumber={(value) =>
                handleToggleMarked(card.seed, value)}
            />
          ))
        )}
      </section>
    </div>
  );
}
