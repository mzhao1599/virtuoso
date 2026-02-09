import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Music, TrendingUp, Users, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Hero Section */}
        <section className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-block">
              <Music className="w-20 h-20 text-primary mx-auto mb-4" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              Strava for Musicians
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
              Track your practice, build consistency, and compete with fellow musicians.
            </p>

            <div className="flex gap-4 justify-center pt-4">
              <Button size="lg" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-muted/30">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              Why Virtuoso?
            </h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Zap className="w-8 h-8 text-primary" />}
                title="Track Practice"
                description="Log sessions with a simple stopwatch. Record what you played, how long, and your progress."
              />
              <FeatureCard
                icon={<TrendingUp className="w-8 h-8 text-primary" />}
                title="Build Streaks"
                description="Stay consistent with daily practice streaks. Visualize your progress with a heat map calendar."
              />
              <FeatureCard
                icon={<Users className="w-8 h-8 text-primary" />}
                title="Social Feed"
                description="Share your sessions, give kudos, and motivate each other. See what your friends are practicing."
              />
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-card p-6 rounded-xl border shadow-sm">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
