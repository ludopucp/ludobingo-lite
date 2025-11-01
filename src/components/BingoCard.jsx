import { useMemo } from "react";

const HEADERS = ["L", "U", "D", "O"];

export default function BingoCard({
  card,
  title,
  markedNumbers,
  onToggleNumber,
}) {
  const markedSet = useMemo(
    () => new Set(markedNumbers),
    [markedNumbers],
  );

  return (
    <article className="bingo-card">
      <header className="bingo-card__header">
        <span className="bingo-card__title">{title}</span>
      </header>

      <div className="bingo-grid">
        {HEADERS.map((header) => (
          <div key={header} className="bingo-cell bingo-cell--header">
            {header}
          </div>
        ))}

        {card.grid.map((row, rowIndex) =>
          row.map((value, columnIndex) => (
            <button
              key={`${card.id}-${rowIndex}-${columnIndex}`}
              type="button"
              className={[
                "bingo-cell",
                "bingo-cell--number",
                markedSet.has(value) ? "bingo-cell--marked" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onToggleNumber(value)}
              aria-pressed={markedSet.has(value)}
            >
              {value}
            </button>
          )),
        )}
      </div>
    </article>
  );
}
