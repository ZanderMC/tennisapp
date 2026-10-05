import { prisma } from "@/src/lib/prisma";
import { StatsChartsClient } from "./StatsChartsClient";

type ExistsRow = {
  exists: boolean;
};

type TotalRow = {
  total: number | null;
};

type HourCountRow = {
  hour: string;
  count: number;
};

type CourtTypeRow = {
  tipo: string;
  cantidad: number;
};

type DailyTrendRow = {
  day: Date;
  count: number;
};

type TrendPoint = {
  fecha: string;
  reservas: number;
};

async function hasColumn(tableName: string, columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<ExistsRow[]>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
      ) AS "exists"
    `,
    tableName,
    columnName
  );

  return Boolean(rows[0]?.exists);
}

function formatDayLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

async function getDailyTrend(days: number): Promise<TrendPoint[]> {
  const rows = await prisma.$queryRawUnsafe<DailyTrendRow[]>(
    `
      WITH calendar AS (
        SELECT generate_series(
          (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
          CURRENT_DATE::date,
          INTERVAL '1 day'
        )::date AS day
      ),
      booking_counts AS (
        SELECT s."date"::date AS day, COUNT(*)::int AS count
        FROM "Booking" b
        INNER JOIN "Schedule" s ON s."id" = b."scheduleId"
        WHERE s."date" >= (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')
          AND s."date" < (CURRENT_DATE + INTERVAL '1 day')
        GROUP BY 1
      )
      SELECT c.day AS day, COALESCE(bc.count, 0)::int AS count
      FROM calendar c
      LEFT JOIN booking_counts bc ON bc.day = c.day
      ORDER BY c.day ASC
    `,
    days
  );

  return rows.map((row) => ({
    fecha: formatDayLabel(new Date(row.day)),
    reservas: Number(row.count),
  }));
}

async function getDailyTrendWindow(pastDays: number, futureDays: number): Promise<TrendPoint[]> {
  const rows = await prisma.$queryRawUnsafe<DailyTrendRow[]>(
    `
      WITH calendar AS (
        SELECT generate_series(
          (CURRENT_DATE - $1::int * INTERVAL '1 day')::date,
          (CURRENT_DATE + $2::int * INTERVAL '1 day')::date,
          INTERVAL '1 day'
        )::date AS day
      ),
      booking_counts AS (
        SELECT s."date"::date AS day, COUNT(*)::int AS count
        FROM "Booking" b
        INNER JOIN "Schedule" s ON s."id" = b."scheduleId"
        WHERE s."date" >= (CURRENT_DATE - $1::int * INTERVAL '1 day')
          AND s."date" < (CURRENT_DATE + ($2::int + 1) * INTERVAL '1 day')
        GROUP BY 1
      )
      SELECT c.day AS day, COALESCE(bc.count, 0)::int AS count
      FROM calendar c
      LEFT JOIN booking_counts bc ON bc.day = c.day
      ORDER BY c.day ASC
    `,
    pastDays,
    futureDays
  );

  return rows.map((row) => ({
    fecha: formatDayLabel(new Date(row.day)),
    reservas: Number(row.count),
  }));
}

export async function StatsAdmin() {
  const [hasBookingAmount, hasCourtPrice, hasTimeStart, hasTimeStartLegacy] =
    await Promise.all([
      hasColumn("Booking", "amount"),
      hasColumn("Court", "price"),
      hasColumn("Schedule", "timeStart"),
      hasColumn("Schedule", "timestart"),
    ]);

  let totalRevenue = 0;

  if (hasBookingAmount) {
    const revenueRows = await prisma.$queryRawUnsafe<TotalRow[]>(
      `SELECT COALESCE(SUM(b."amount"), 0) AS total FROM "Booking" b`
    );
    totalRevenue = Number(revenueRows[0]?.total ?? 0);
  } else if (hasCourtPrice) {
    const revenueRows = await prisma.$queryRawUnsafe<TotalRow[]>(
      `
        SELECT COALESCE(SUM(c."price"), 0) AS total
        FROM "Booking" b
        INNER JOIN "Schedule" s ON s."id" = b."scheduleId"
        INNER JOIN "Court" c ON c."id" = s."courtId"
      `
    );
    totalRevenue = Number(revenueRows[0]?.total ?? 0);
  }

  const bookingCountRows = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
    `SELECT COUNT(*)::int AS count FROM "Booking"`
  );
  const totalBookings = Number(bookingCountRows[0]?.count ?? 0);

  const timeColumn = hasTimeStart ? "timeStart" : hasTimeStartLegacy ? "timestart" : null;

  let rawHourlyData: HourCountRow[] = [];
  if (timeColumn) {
    rawHourlyData = await prisma.$queryRawUnsafe<HourCountRow[]>(
      `
        SELECT split_part(s."${timeColumn}", ':', 1) AS hour, COUNT(*)::int AS count
        FROM "Booking" b
        INNER JOIN "Schedule" s ON s."id" = b."scheduleId"
        GROUP BY 1
      `
    );
  }

  const hourlyMap = new Map<number, number>();
  for (const row of rawHourlyData) {
    const hourNumber = Number(row.hour);
    if (!Number.isNaN(hourNumber)) {
      hourlyMap.set(hourNumber, Number(row.count));
    }
  }

  const hourlyData = Array.from({ length: 9 }, (_, index) => {
    const hourNumber = 9 + index;
    return {
      hourLabel: `${String(hourNumber).padStart(2, "0")}:00`,
      reservas: hourlyMap.get(hourNumber) ?? 0,
    };
  });

  const courtTypesRaw = await prisma.$queryRawUnsafe<CourtTypeRow[]>(
    `
      SELECT COALESCE(NULLIF(TRIM(c."surface"), ''), 'Sin tipo') AS tipo, COUNT(*)::int AS cantidad
      FROM "Booking" b
      INNER JOIN "Schedule" s ON s."id" = b."scheduleId"
      INNER JOIN "Court" c ON c."id" = s."courtId"
      GROUP BY 1
      ORDER BY 2 DESC
    `
  );

  const pieColors = ["#0ea5e9", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];
  const courtTypeData = courtTypesRaw.map((item, index) => ({
    ...item,
    fill: pieColors[index % pieColors.length],
  }));

  const pastDays = 84;
  const futureDays = 84;
  const weeklyTrendHistory = await getDailyTrendWindow(pastDays, futureDays);

  return (
    <section className="w-full px-6 py-12">
      <StatsChartsClient
        totalRevenue={totalRevenue}
        totalBookings={totalBookings}
        hourlyData={hourlyData}
        courtTypeData={courtTypeData}
        weeklyTrendHistory={weeklyTrendHistory}
        weeklyTodayIndex={pastDays}
      />
    </section>
  );
}
