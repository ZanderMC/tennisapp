'use client';

import { useEffect, useMemo, useState } from 'react';

const MAX_SELECTION = 3;

type CalendarProps = {
  selectedDate: Date | null;
  selectedSlots: string[];
  courtName: string;
  onSelectedDateChange: (date: Date) => void;
  onSelectedSlotsChange: React.Dispatch<React.SetStateAction<string[]>>;
};

export const Calendar = ({
  selectedDate,
  selectedSlots,
  courtName,
  onSelectedDateChange,
  onSelectedSlotsChange,
}: CalendarProps) => {
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const toDayKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`; // yyyy-mm-dd
  };

  useEffect(() => {
    if (!selectedDate) {
      setBookedSlots([]);
      return;
    }

    const currentDate = selectedDate;

    const controller = new AbortController();

    async function loadBookedSlots() {
      try {
        setIsLoadingSlots(true);
        const key = toDayKey(currentDate);
        const query = new URLSearchParams({
          courtName,
          selectedDate: key,
        });

        const response = await fetch(`/api/bookings?${query.toString()}`, {
          signal: controller.signal,
        });

        const data = (await response.json()) as { bookedSlots?: string[] };

        if (!response.ok) {
          setBookedSlots([]);
          return;
        }

        setBookedSlots(data.bookedSlots ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setBookedSlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    }

    loadBookedSlots();
    onSelectedSlotsChange([]);

    return () => {
      controller.abort();
    };
  }, [selectedDate, courtName, onSelectedSlotsChange]);

  const hours = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  const toggleSlot = (hour: string) => {
    if (isLoadingSlots) return;
    if (bookedSlots.includes(hour)) return;

    onSelectedSlotsChange((prev) => {
      if (prev.includes(hour)) {
        return prev.filter((h) => h !== hour);
      }

      if (prev.length >= MAX_SELECTION) return prev;

      return [...prev, hour];
    });
  };

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  }, []);

  return (
    <div className="mx-auto mt-10 flex w-full max-w-125 flex-col gap-6">
      <section>
        <h3 className="mb-3 text-lg font-bold text-green-950">Selecciona un día</h3>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => {
            const isSelected =
              selectedDate &&
              day.toDateString() === selectedDate.toDateString();

            return (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => onSelectedDateChange(day)}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors  cursor-pointer ${
                  isSelected
                    ? 'border-green-700 bg-green-700 text-white'
                    : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                {day.toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                })}
              </button>
            );
          })}
        </div>
      </section>

      {selectedDate ? (
        <section>
          <h4 className="mb-3 font-bold text-green-950">Horarios disponibles</h4>
          {/* {isLoadingSlots ? (
            <p className="mb-2 text-sm text-gray-500">Cargando disponibilidad...</p>
          ) : null} */}

          <div className="flex flex-col gap-2">
            {hours.map((hour) => {
              const isBooked = bookedSlots.includes(hour);
              const isSelected = selectedSlots.includes(hour);

              return (
                <button
                  key={hour}
                  type="button"
                  onClick={() => toggleSlot(hour)}
                  disabled={isBooked || isLoadingSlots}
                  className={`rounded-md border px-4 py-2 text-left text-sm font-medium transition-colors  cursor-pointer ${
                    isBooked
                      ? 'cursor-not-allowed border-red-400 bg-red-400 text-white'
                      : isLoadingSlots
                      ? 'cursor-wait border-gray-300 bg-gray-100 text-gray-500'
                      : isSelected
                      ? 'border-green-700 bg-green-700 text-white'
                      : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  {hour}
                </button>
              );
            })}
          </div>
        </section>
      ) : (
        <div className="p-10 text-center text-gray-500">
          Selecciona un día para ver horarios
        </div>
      )}
    </div>
  );
};