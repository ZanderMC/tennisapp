//import { BuyButton } from "./BuyButton";
type SummaryProps = {
    selectedDate: Date | null;
    selectedSlots: string[];
    courtName: string;
    slotPrice: number;
    onClear: () => void;
};



export function Summary({selectedDate,selectedSlots,courtName,slotPrice,onClear,}: SummaryProps) {

    const currentDate = (selectedDate ?? new Date()).toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const total = selectedSlots.length * slotPrice;


    
    return (
        <section className="mt-10 w-full max-w-125 rounded-xl border h-min   bg-green-950 p-5">
            <p className="text-sm uppercase tracking-wide text-foreground/80">Fecha de reserva</p>
            <p className="mt-1 text-lg font-semibold capitalize">{currentDate}</p>

            <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-foreground/30 text-left">
                            <th className="px-2 py-2">N°</th>
                            <th className="px-2 py-2">Cancha</th>
                            <th className="px-2 py-2">Horario</th>
                            <th className="px-2 py-2">Costo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedSlots.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-2 py-6 text-center text-background/70">
                                    Sin horarios seleccionados
                                </td>
                            </tr>
                        ) : (
                            selectedSlots.map((slot, index) => (
                                <tr key={slot} className="border-b border-foreground/15 last:border-b-0">
                                    <td className="px-2 py-3">{index + 1}</td>
                                    <td className="px-2 py-3">{courtName}</td>
                                    <td className="px-2 py-3">{slot}</td>
                                    <td className="px-2 py-3">${slotPrice.toFixed(2)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-background/30 pt-4">
                <span className="text-base font-medium">Total</span>
                <span className="text-lg font-bold">${total.toFixed(2)}</span>
            </div>

            <div className="mt-5 flex gap-3">
                <button
                    type="button"
                    onClick={onClear}
                    className="rounded-md border border-background/40 px-4 py-2 text-sm font-medium hover:bg-background/10 cursor-pointer"
                >
                    Limpiar datos
                </button>
                {/* <BuyButton
                    court={courtName}
                    selectedDate={selectedDate}
                    selectedSlots={selectedSlots}
                    total={total}
                /> */}
            </div>
        </section>
    );
}