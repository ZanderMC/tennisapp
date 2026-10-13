import { NextResponse } from "next/server";
import { auth } from "@/src//lib/auth";
import { prisma } from "@/src/lib/prisma";

type CreateBookingBody = {
	courtName?: string;
	selectedDate?: string;
	selectedSlots?: string[];
	total?: number;
};

const DEFAULT_SLOT_PRICE = 20;
const MAX_SERIALIZABLE_RETRIES = 3;

class BookingConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BookingConflictError";
	}
}

function isPrismaErrorWithCode(error: unknown, code: string): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: string }).code === code
	);
}

async function withSerializableRetries<T>(operation: () => Promise<T>): Promise<T> {
	for (let attempt = 0; attempt < MAX_SERIALIZABLE_RETRIES; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			const isLastAttempt = attempt === MAX_SERIALIZABLE_RETRIES - 1;
			if (!isPrismaErrorWithCode(error, "P2034") || isLastAttempt) {
				throw error;
			}
		}
	}

	throw new Error("No se pudo completar la reserva por concurrencia");
}

function getEndTime(startTime: string): string {
	const [hours, minutes] = startTime.split(":").map(Number);
	const totalMinutes = hours * 60 + minutes + 60;
	const endHours = Math.floor(totalMinutes / 60) % 24;
	const endMinutes = totalMinutes % 60;
	return `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
}

function parseDateKey(dateKey: string): { start: Date; end: Date; marker: Date } | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
	if (!match) {
		return null;
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);

	const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0));
	const marker = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));

	return { start, end, marker };
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url);
		const courtName = searchParams.get("courtName");
		const selectedDate = searchParams.get("selectedDate");

		if (!courtName || !selectedDate) {
			return NextResponse.json(
				{ message: "courtName y selectedDate son requeridos" },
				{ status: 400 }
			);
		}

		const parsed = parseDateKey(selectedDate);
		if (!parsed) {
			return NextResponse.json({ message: "Fecha invalida" }, { status: 400 });
		}
		const court = await prisma.court.findFirst({ where: { name: courtName } });

		if (!court) {
			return NextResponse.json({ bookedSlots: [] }, { status: 200 });
		}

		const schedules = await prisma.$queryRawUnsafe<Array<{ timeStart: string }>>(
			`
				SELECT DISTINCT s."timeStart"
				FROM "Schedule" s
				INNER JOIN "Booking" b ON b."scheduleId" = s."id"
				WHERE s."courtId" = $1
				  AND s."date" >= $2
				  AND s."date" < $3
				ORDER BY s."timeStart" ASC
			`,
			court.id,
			parsed.start,
			parsed.end,
		);

		return NextResponse.json(
			{ bookedSlots: schedules.map((schedule) => schedule.timeStart) },
			{ status: 200 }
		);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Error al obtener reservas";
		return NextResponse.json({ message }, { status: 500 });
	}
}

export async function POST(request: Request) {
	try {
		const session = await auth.api.getSession({ headers: request.headers });

		if (!session?.user?.id) {
			return NextResponse.json({ message: "No autenticado" }, { status: 401 });
		}

		const body = (await request.json()) as CreateBookingBody;
		const { courtName, selectedDate, selectedSlots,  total } = body;

		if (!courtName || !selectedDate || !selectedSlots?.length) {
			return NextResponse.json({ message: "Datos incompletos para reservar" }, { status: 400 });
		}

		const parsed = parseDateKey(selectedDate);
		if (!parsed) {
			return NextResponse.json({ message: "Fecha invalida" }, { status: 400 });
		}

		const uniqueSlots = Array.from(new Set(selectedSlots));

		const bookingResult = await withSerializableRetries(async () => {
			return prisma.$transaction(
				async (tx) => {
					const court =
						(await tx.court.findFirst({ where: { name: courtName } })) ??
						(await tx.court.create({ data: { name: courtName, price: DEFAULT_SLOT_PRICE } }));

					for (const slot of uniqueSlots) {
						const timeEnd = getEndTime(slot);

						let schedule = await tx.schedule.findFirst({
							where: {
								courtId: court.id,
								date: {
									gte: parsed.start,
									lt: parsed.end,
								},
								timeStart: slot,
							},
							orderBy: { id: "asc" },
						});

						if (!schedule) {
							try {
								schedule = await tx.schedule.create({
									data: {
										courtId: court.id,
										date: parsed.marker,
										timeStart: slot,
										timeEnd,
									},
								});
							} catch (error) {
								if (!isPrismaErrorWithCode(error, "P2002")) {
									throw error;
								}

								schedule = await tx.schedule.findFirst({
									where: {
										courtId: court.id,
										date: {
											gte: parsed.start,
											lt: parsed.end,
										},
										timeStart: slot,
									},
									orderBy: { id: "asc" },
								});
							}
						}

						if (!schedule) {
							throw new Error(`No se pudo crear el horario ${slot}`);
						}

						const taken = await tx.booking.findFirst({
							where: {
								schedule: {
									courtId: court.id,
									date: {
										gte: parsed.start,
										lt: parsed.end,
									},
									timeStart: slot,
								},
							},
							select: { id: true },
						});

						if (taken) {
							throw new BookingConflictError(`El horario ${slot} ya fue reservado`);
						}

						try {
							await tx.booking.create({
								data: {
									userId: session.user.id,
									scheduleId: schedule.id,
									amount: court.price,
								},
							});
						} catch (error) {
							if (isPrismaErrorWithCode(error, "P2002")) {
								throw new BookingConflictError(`El horario ${slot} ya fue reservado`);
							}

							throw error;
						}
					}

					return {
						courtName: court.name,
						courtPrice: court.price,
					};
				},
				{ isolationLevel: "Serializable" as never }
			);
		});

		return NextResponse.json(
			{
				message: "Reserva creada",
				data: {
					court: bookingResult.courtName,
					price: bookingResult.courtPrice,
					date: selectedDate,
					slots: uniqueSlots,
					total,
				},
			},
			{ status: 201 }
		);
	} catch (error) {
		if (error instanceof BookingConflictError) {
			return NextResponse.json({ message: error.message }, { status: 409 });
		}

		if (isPrismaErrorWithCode(error, "P2002")) {
			return NextResponse.json({ message: "Uno o más horarios ya fueron reservados" }, { status: 409 });
		}

		const message = error instanceof Error ? error.message : "Error al crear reserva";
		return NextResponse.json({ message }, { status: 500 });
	}
}
