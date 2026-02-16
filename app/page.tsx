import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Music, TrendingUp, Users, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <AppLayout>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Hero Section */}
        <section className="flex-1 flex items-center justify-center px-4 py-24">
          <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mx-auto">
              <Music className="w-8 h-8 text-primary" />
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text">
              Strava for Musicians
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Track practice sessions, capture practice moments, and stay accountable with a community of fellow musicians.
            </p>

            <div className="flex gap-3 justify-center pt-2">
              <Button size="lg" asChild>
                <Link href="/login">Get Started</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Why Virtuoso?</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 border-t border-border/50">
          <div className="max-w-5xl mx-auto px-4">
            <h2 className="text-2xl font-semibold text-center mb-12 tracking-tight">
              How It Works
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Zap className="w-5 h-5 text-primary" />}
                title="Track Practice"
                description="Log sessions with a stopwatch. Record your progress, notes, and maintain daily streaks. Visualize progress on your calendar."
              />
              <FeatureCard
                icon={<TrendingUp className="w-5 h-5 text-primary" />}
                title="Capture Moments"
                description="Capture those moments when you nail a difficult passage. Your last 30 seconds of playing are saved with the click of a button."
              />
              <FeatureCard
                icon={<Users className="w-5 h-5 text-primary" />}
                title="Social Feed"
                description="Share sessions, give kudos, and motivate each other with comments. See what your friends are practicing."
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
    <div className="bg-card p-6 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 group">
      <div className="w-10 h-10 bg-primary/8 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/12 transition-colors">
        {icon}
      </div>
      <h3 className="text-base font-semibold mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
