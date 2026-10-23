import { BenefitsSection } from "../components/landing/BenefitsSection";
import { CtaSection } from "../components/landing/CtaSection";
import { HeroSection } from "../components/landing/HeroSection";
import { ReservationSection } from "../components/landing/ReservationSection";
import { Header } from "../components/ui/Header";


export default function Home() {
  return   (
  <div id="top" className="bg-[#F3EDE4]">
    <Header/>
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
      <HeroSection />
      <BenefitsSection/>
      <ReservationSection />
      <CtaSection />
    </main>
    
  </div>
  )
}

 