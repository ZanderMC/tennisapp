import { prisma } from "@/src/lib/prisma";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

export async function PanelAdmin() {
  const bookings = await prisma.booking.findMany({
    include: {
      user: true,
      schedule: {
        include: {
          court: true,
        },
      },
    },
    orderBy: [
      {
        schedule: {
          date: "desc",
        },
      },
      {
        schedule: {
          timeStart: "asc",
        },
      },
    ],
  });

  return (
    <section className="w-full px-6 py-12">
      <table className="w-full max-w-6xl border-collapse overflow-hidden rounded-lg bg-white text-sm shadow-md">
        <thead className="bg-amber-900 text-white">
          <tr>
            <th className="p-4 text-left font-semibold">Fecha</th>
            <th className="p-4 text-left font-semibold">Usuario</th>
            <th className="p-4 text-left font-semibold">Email</th>
            <th className="p-4 text-left font-semibold">Cancha</th>
            <th className="p-4 text-left font-semibold">Hora</th>
            <th className="p-4 text-left font-semibold">Monto</th>
          </tr>
        </thead>

        <tbody>
          {bookings.length === 0 ? (
            <tr>
              <td className="p-4 text-center text-gray-500" colSpan={6}>
                Aun no hay reservaciones registradas.
              </td>
            </tr>
          ) : (
            bookings.map((booking) => (
              <tr className="transition hover:bg-blue-100" key={booking.id}>
                <td className="p-4">{formatDate(booking.schedule.date)}</td>
                <td className="p-4">{booking.user.name}</td>
                <td className="p-4">{booking.user.email}</td>
                <td className="p-4">{booking.schedule.court.name}</td>
                <td className="p-4">
                  {booking.schedule.timeStart} - {booking.schedule.timeEnd}
                </td>
                <td className="p-4">{formatCurrency(booking.amount)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
