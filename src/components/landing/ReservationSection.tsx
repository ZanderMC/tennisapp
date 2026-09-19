'use client'
import { useState } from "react"
import { Calendar } from "../ui/Calendar"
import { Summary } from "../ui/Summary"


export function ReservationSection() {
    const getStartOfToday = () => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }

    const [selectedDate, setSelectedDate] = useState<Date | null>(() => getStartOfToday())
    const [selectedSlots, setSelectedSlots] = useState<string[]>([])

    const slotPrice = 20
    const courtName = "Cancha 1"

    const handleClearData = () => {
                setSelectedDate(getStartOfToday())
        setSelectedSlots([])
    }
          

    return(
        <section id="rsec" className="flex flex-col bg-foreground text-background w-full h-auto items-start justify-center py-20 px-8">
            {/* <Carousel/> */}
             <div className="flex w-full mt-10 gap-10 justify-center p-20 bg-white">
                <Calendar
                    selectedDate={selectedDate}
                    selectedSlots={selectedSlots}
                    courtName={courtName}
                    onSelectedDateChange={setSelectedDate}
                    onSelectedSlotsChange={setSelectedSlots}
                />
               <Summary
                    selectedDate={selectedDate}
                    selectedSlots={selectedSlots}
                    courtName={courtName}
                    slotPrice={slotPrice}
                    onClear={handleClearData}
               />
             </div>
      
     
        </section>
    )
}
