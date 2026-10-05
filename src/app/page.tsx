import { ReservationSection } from "../components/landing/ReservationSection";
import { Header } from "../components/ui/Header";
import TestAuthPage from "../test-auth/page";


export default function Home() {
  return   (
  <>
  <Header/>
  <ReservationSection />
  <TestAuthPage/>
  </>
  )
}
