const GRID_SIZE = 4;
const NUMBERS_PER_COLUMN = 15;
const COMB_PER_COLUMN_NUMBER = 1365; // C(15,4)
const COMB_PER_COLUMN_BIGINT = BigInt(COMB_PER_COLUMN_NUMBER);
const TOTAL_CARDS = COMB_PER_COLUMN_BIGINT ** BigInt(GRID_SIZE);

const COMPACT_MIN = 1n;
const COMPACT_MAX = 999n;
const COMPACT_SIZE = COMPACT_MAX - COMPACT_MIN + 1n;

const MIX_MULTIPLIER = 2654435761n;
const MIX_INCREMENT = 1013904223n;

const COMPACT_MULTIPLIER = 611n;
const COMPACT_INCREMENT = 479n;
const COMPACT_STEP = TOTAL_CARDS / COMPACT_SIZE;

const COLUMN_BASES = Array.from(
  { length: GRID_SIZE },
  (_, index) => index * NUMBERS_PER_COLUMN + 1,
);

const chooseCache = new Map();

function modComb(value) {
  const result = value % COMB_PER_COLUMN_NUMBER;
  return result >= 0 ? result : result + COMB_PER_COLUMN_NUMBER;
}

function choose(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  const key = `${n}-${k}`;
  if (chooseCache.has(key)) {
    return chooseCache.get(key);
  }
  const effectiveK = Math.min(k, n - k);
  let result = 1;
  for (let i = 1; i <= effectiveK; i += 1) {
    result = (result * (n - effectiveK + i)) / i;
  }
  const rounded = Math.round(result);
  chooseCache.set(key, rounded);
  return rounded;
}

function unrankCombination(rank, n = NUMBERS_PER_COLUMN, k = GRID_SIZE) {
  let remaining = rank;
  let start = 0;
  const combination = [];

  for (let itemsLeft = k; itemsLeft > 0; itemsLeft -= 1) {
    for (let candidate = start; candidate <= n - itemsLeft; candidate += 1) {
      const count = choose(n - candidate - 1, itemsLeft - 1);
      if (remaining < count) {
        combination.push(candidate);
        start = candidate + 1;
        break;
      }
      remaining -= count;
    }
  }

  return combination;
}

function mixColumnRanks([r0, r1, r2, r3]) {
  return [
    modComb(r0),
    modComb(r1 + 2 * r0),
    modComb(r2 + 3 * r1 + 5 * r0),
    modComb(r3 + 7 * r2 + 11 * r1 + 13 * r0),
  ];
}

export function normalizeSeed(value) {
  const bigValue = BigInt(value);
  const modulo = bigValue % TOTAL_CARDS;
  return modulo >= 0n ? modulo : modulo + TOTAL_CARDS;
}

export function compactSeedToGlobal(input) {
  const value = BigInt(input);
  if (value < COMPACT_MIN || value > COMPACT_MAX) {
    throw new Error(
      `La semilla debe estar entre ${COMPACT_MIN.toString()} y ${COMPACT_MAX.toString()}.`,
    );
  }
  const zeroBased = value - COMPACT_MIN;
  const permuted =
    (zeroBased * COMPACT_MULTIPLIER + COMPACT_INCREMENT) % COMPACT_SIZE;
  const scaled = permuted * COMPACT_STEP;
  return scaled;
}

function scrambleSeed(normalizedSeed) {
  return (normalizedSeed * MIX_MULTIPLIER + MIX_INCREMENT) % TOTAL_CARDS;
}

export function seedToGrid(seed) {
  const normalized = normalizeSeed(seed);
  const scrambled = scrambleSeed(normalized);
  let residual = Number(scrambled);
  const columnRanks = Array.from({ length: GRID_SIZE }, () => {
    const rank = residual % COMB_PER_COLUMN_NUMBER;
    residual = Math.floor(residual / COMB_PER_COLUMN_NUMBER);
    return rank;
  });

  const mixedRanks = mixColumnRanks(columnRanks);

  const columns = mixedRanks.map((rank, col) =>
    unrankCombination(rank).map((offset) => COLUMN_BASES[col] + offset),
  );

  return Array.from({ length: GRID_SIZE }, (_, row) =>
    columns.map((colValues) => colValues[row]),
  );
}

