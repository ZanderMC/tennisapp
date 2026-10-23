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
    const courtName = "Court 1"

    const handleClearData = () => {
        setSelectedDate(getStartOfToday())
        setSelectedSlots([])
    }
          

    return(
        <section id="reservation" className="flex w-full flex-col items-start justify-center bg-foreground px-4 py-12 text-background sm:px-6 sm:py-16 lg:px-8">
             <div className="mt-4 flex w-full min-w-0 flex-col gap-8 bg-white p-4 sm:mt-8 sm:p-6 lg:flex-row lg:items-start lg:justify-center lg:gap-10 lg:p-10">
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
