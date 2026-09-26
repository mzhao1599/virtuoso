import { Card, CardContent } from "@/components/ui/card";

/** Shown when the demo data has not been loaded into the database. */
export function DemoUnavailable() {
  return (
    <Card>
      <CardContent className="py-12 text-center space-y-2">
        <p className="font-medium">The demo data isn&apos;t loaded yet.</p>
        <p className="text-sm text-muted-foreground">
          Run <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">supabase/seed/demo.sql</code> in the
          Supabase SQL editor after the migrations.
        </p>
      </CardContent>
    </Card>
  );
}
