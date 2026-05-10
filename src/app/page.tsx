import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { ChainLogoBanner } from "@/components/landing/ChainLogoBanner";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <>
      <LandingNav />
      <main>
        <Hero />
        <section id="chains">
          <ChainLogoBanner />
        </section>
        <section id="features">
          <FeatureGrid />
        </section>
        <CTASection />
      </main>
      <LandingFooter />
    </>
  );
}
