"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/src/components/shadcn/chart";

type HourlyPoint = {
  hourLabel: string;
  reservas: number;
};

type StatsChartsClientProps = {
  totalRevenue: number;
  totalBookings: number;
  hourlyData: HourlyPoint[];
  courtTypeData: Array<{
    tipo: string;
    cantidad: number;
    fill: string;
  }>;
  weeklyTrendHistory: Array<{ fecha: string; reservas: number }>;
  weeklyTodayIndex: number;
};

const totalRevenueConfig = {
  monto: {
    label: "Monto total",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

const hourlyConfig = {
  reservas: {
    label: "Reservas",
    color: "#0ea5e9",
  },
} satisfies ChartConfig;

const pieConfig = {
  cantidad: {
    label: "Cantidad",
    color: "#0ea5e9",
  },
} satisfies ChartConfig;

const trendConfig = {
  reservas: {
    label: "Reservas",
    color: "#f97316",
  },
} satisfies ChartConfig;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
  }).format(amount);
}

export function StatsChartsClient({
  totalRevenue,
  totalBookings,
  hourlyData,
  courtTypeData,
  weeklyTrendHistory,
  weeklyTodayIndex,
}: StatsChartsClientProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const minWeekOffset = -Math.floor(weeklyTodayIndex / 7);
  const maxWeekOffset = Math.max(
    0,
    Math.floor((weeklyTrendHistory.length - 7 - weeklyTodayIndex) / 7)
  );

  const activeTrendData = useMemo(() => {
    const start = weeklyTodayIndex + weekOffset * 7;
    const safeStart = Math.min(Math.max(start, 0), Math.max(0, weeklyTrendHistory.length - 7));
    return weeklyTrendHistory.slice(safeStart, safeStart + 7);
  }, [weeklyTrendHistory, weekOffset, weeklyTodayIndex]);

  return (
    <div className="grid w-full gap-6 md:grid-cols-2">
      <article className="rounded-xl bg-white p-5 shadow-md">
        <h3 className="text-lg font-semibold text-amber-900">Monto total</h3>
        <p className="mt-1 text-sm text-gray-500">
          Suma de todos los precios de las reservaciones
        </p>
        <p className="mt-3 text-3xl font-bold text-amber-700">
          {formatCurrency(totalRevenue)}
        </p>

        <div className="mt-4">
          <ChartContainer className="h-50 w-full" config={totalRevenueConfig}>
            <BarChart accessibilityLayer data={[{ label: "Total", monto: totalRevenue }]}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="monto" fill="var(--color-monto)" radius={8} />
            </BarChart>
          </ChartContainer>
        </div>
      </article>

      <article className="rounded-xl bg-white p-5 shadow-md">
        <h3 className="text-lg font-semibold text-amber-900">Reservaciones por hora</h3>
        <p className="mt-1 text-sm text-gray-500">Rango horario de 09:00 a 17:00</p>
        <p className="mt-3 text-sm font-medium text-gray-700">
          Total de reservas: {totalBookings}
        </p>

        <div className="mt-4">
          <ChartContainer className="h-60 w-full" config={hourlyConfig}>
            <BarChart accessibilityLayer data={hourlyData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="hourLabel"
                tickLine={false}
                axisLine={false}
                interval={0}
                tickMargin={8}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [value, "Cantidad"]}
                    labelFormatter={(label) => `Hora ${label}`}
                  />
                }
              />
              <Bar dataKey="reservas" fill="var(--color-reservas)" radius={6} />
            </BarChart>
          </ChartContainer>
        </div>
      </article>

      <article className="rounded-xl bg-white p-5 shadow-md">
        <h3 className="text-lg font-semibold text-amber-900">Tipo de cancha mas usado</h3>
        <p className="mt-1 text-sm text-gray-500">Distribucion de reservaciones por tipo</p>

        <div className="mt-4">
          <ChartContainer className="h-60 w-full" config={pieConfig}>
            <PieChart>
              <Pie
                data={courtTypeData}
                dataKey="cantidad"
                nameKey="tipo"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {courtTypeData.map((entry) => (
                  <Cell key={entry.tipo} fill={entry.fill} />
                ))}
              </Pie>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [value, "Reservas"]}
                    labelFormatter={(label) => `Tipo: ${label}`}
                  />
                }
              />
            </PieChart>
          </ChartContainer>
        </div>
      </article>

      <article className="rounded-xl bg-white p-5 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-amber-900">Reservas por fecha</h3>
            <p className="mt-1 text-sm text-gray-500">Vista semanal con historial de semanas pasadas</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              className="rounded-md border border-amber-300 px-3 py-1 font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={weekOffset <= minWeekOffset}
              onClick={() => setWeekOffset((current) => Math.max(minWeekOffset, current - 1))}
              type="button"
            >
              Semana anterior
            </button>
            <button
              className="rounded-md border border-amber-300 px-3 py-1 font-medium text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={weekOffset >= maxWeekOffset}
              onClick={() => setWeekOffset((current) => Math.min(maxWeekOffset, current + 1))}
              type="button"
            >
              Semana posterior
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          {weekOffset === 0
            ? "Mostrando semana actual"
            : weekOffset < 0
            ? `Mostrando hace ${Math.abs(weekOffset)} semana(s)`
            : `Mostrando en ${weekOffset} semana(s)`}
        </p>

        <div className="mt-4">
          <ChartContainer className="h-60 w-full" config={trendConfig}>
            <LineChart accessibilityLayer data={activeTrendData}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="fecha" tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [value, "Reservas"]}
                    labelFormatter={(label) => `Fecha ${label}`}
                  />
                }
              />
              <Line
                dataKey="reservas"
                dot={false}
                stroke="var(--color-reservas)"
                strokeWidth={2.5}
                type="monotone"
              />
            </LineChart>
          </ChartContainer>
        </div>
      </article>
    </div>
  );
}
