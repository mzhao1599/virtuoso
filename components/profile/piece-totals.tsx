import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PieceTotal } from "@/lib/stats/pieces";
import { formatHoursMinutes } from "@/lib/utils";

const SHOWN = 6;

/** Practice time per piece; bars are relative to the most practiced piece. */
export function PieceTotals({ pieces }: { pieces: PieceTotal[] }) {
  if (pieces.length === 0) return null;
  const max = pieces[0].seconds || 1;
  const shown = pieces.slice(0, SHOWN);
  const rest = pieces.slice(SHOWN);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg tracking-tight">Pieces</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total practice time by piece · {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
        </p>
      </CardHeader>
      <CardContent>
        <PieceList pieces={shown} max={max} />
        {rest.length > 0 && (
          <details className="group mt-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-primary hover:underline w-fit rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
              <span className="group-open:hidden">Show {rest.length} more</span>
              <span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <div className="mt-3">
              <PieceList pieces={rest} max={max} />
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}

function PieceList({ pieces, max }: { pieces: PieceTotal[]; max: number }) {
  return (
    <ol className="space-y-3">
      {pieces.map((piece) => (
        <li key={piece.name}>
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span className="font-medium truncate" title={piece.name}>
              {piece.name}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{formatHoursMinutes(piece.seconds)}</span>
              {" · "}
              {piece.sessions} {piece.sessions === 1 ? "session" : "sessions"}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary/70"
              style={{ width: `${Math.max(2, (piece.seconds / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
