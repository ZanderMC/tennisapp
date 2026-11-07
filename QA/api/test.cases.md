# API test cases

These cases cover the main business flow: authentication, availability, booking,
order creation, payment access, payment processing, and Mercado Pago webhooks.

## Preconditions

- The application is running at `http://localhost:3000`.
- `DATABASE_URL` is configured and migrations are applied.
- Protected cases use an authenticated test user and preserve its session cookies.
- Payment cases use Mercado Pago TEST credentials only:
  `MP_ACCESS_TOKEN` and `NEXT_PUBLIC_MP_PUBLIC_KEY`.
- Use a date in the next seven days and an available slot for booking cases.

## Authentication

| ID | Endpoint | Case | Request | Expected result |
|---|---|---|---|---|
| AUTH-01 | `/api/auth/sign-up/email` | Creates a user with valid data | `POST` with unique `name`, `email`, and password of at least 8 characters | `200`; a session is created |
| AUTH-02 | `/api/auth/sign-up/email` | Rejects an existing email | Repeat `AUTH-01` with the same email | Non-success response; no duplicate user |
| AUTH-03 | `/api/auth/sign-in/email` | Logs in with valid credentials | `POST` with the test user's email and password | `200`; authenticated session cookie is returned |
| AUTH-04 | `/api/auth/sign-in/email` | Rejects invalid credentials | `POST` with an unknown email or wrong password | Non-success response; no authenticated session |

## Availability and bookings

| ID | Endpoint | Case | Request | Expected result |
|---|---|---|---|---|
| BOOK-01 | `/api/bookings` | Returns booked slots for a valid date | `GET` with `courtName=Court 1` and `selectedDate=YYYY-MM-DD` | `200`; response contains `bookedSlots` array |
| BOOK-02 | `/api/bookings` | Rejects missing availability parameters | `GET` without `courtName` or `selectedDate` | `400`; explains required parameters |
| BOOK-03 | `/api/bookings` | Rejects an invalid date | `GET` with a malformed date such as `2026-99-99` | `400`; invalid-date message |
| BOOK-04 | `/api/bookings` | Rejects an unauthenticated booking | `POST` without the session cookie | `401`; booking is not created |
| BOOK-05 | `/api/bookings` | Creates a booking | Authenticated `POST` with `courtName`, valid date, one available slot, and total | `201`; response says `Reserva creada` |
| BOOK-06 | `/api/bookings` | Prevents a duplicate booking | Repeat `BOOK-05` for the same court, date, and slot | `409`; slot is reported as already booked |
| BOOK-07 | `/api/bookings` | Rejects incomplete booking data | Authenticated `POST` without court, date, or slots | `400`; booking is not created |

## Checkout access and orders

| ID | Endpoint | Case | Request | Expected result |
|---|---|---|---|---|
| CHECKOUT-01 | `/api/checkout/access` | Grants temporary payment-page access | `POST` | `200`; `payment_page_access=1` cookie exists with a five-minute lifetime |
| ORDER-01 | `/api/checkout/orders` | Creates an order for an authenticated user | Authenticated `POST` with court, date, slots, and positive total | `200`; response contains `orderId`, amount, currency, and status |
| ORDER-02 | `/api/checkout/orders` | Rejects an unauthenticated order | Same request without session cookie | `401`; order is not created |
| ORDER-03 | `/api/checkout/orders` | Rejects invalid order data | Authenticated `POST` with missing slots or non-positive total | `400`; invalid-data message |
| ORDER-04 | `/api/checkout/orders/{orderId}` | Reads an existing order | `GET` with a valid order ID | `200`; order belongs to the expected reservation |
| ORDER-05 | `/api/checkout/orders/{orderId}` | Handles an unknown order | `GET` with a nonexistent order ID | `404`; `Orden no encontrada` |

## Payments

| ID | Endpoint | Case | Request | Expected result |
|---|---|---|---|---|
| PAY-01 | `/api/checkout/payment` | Rejects a malformed body | `POST` with invalid JSON or without `orderId`/`formData` | `400`; explains the missing payment data |
| PAY-02 | `/api/checkout/payment` | Rejects an unknown order | `POST` with a nonexistent `orderId` and valid-shaped `formData` | `404`; order-not-found message |
| PAY-03 | `/api/checkout/payment` | Rejects missing Mercado Pago credentials | Run without `MP_ACCESS_TOKEN` | `500`; configuration error is returned |
| PAY-04 | `/api/checkout/payment` | Detects mismatched credential modes | Use TEST public key with production access token, or vice versa | `500`; credential mismatch message |
| PAY-05 | `/api/checkout/payment` | Processes an approved TEST payment | Use a real order and Mercado Pago TEST card data | Success response; order becomes approved and reservation is persisted |
| PAY-06 | `/api/checkout/payment` | Handles a rejected TEST payment | Use Mercado Pago TEST data that returns a rejected status | Payment is not marked approved; error/status detail is returned |

## Mercado Pago webhook

| ID | Endpoint | Case | Request | Expected result |
|---|---|---|---|---|
| WEBHOOK-01 | `/api/checkout/webhook` | Verifies webhook availability | `GET` | `200`; `{ "ok": true }` |
| WEBHOOK-02 | `/api/checkout/webhook` | Ignores an unrelated notification | `POST` with valid JSON but no payment/order resource ID | `200`; `{ "ok": true }` |
| WEBHOOK-03 | `/api/checkout/webhook` | Rejects an invalid signature | Payment notification with an incorrect `x-signature` | `401`; invalid-signature message |
| WEBHOOK-04 | `/api/checkout/webhook` | Rejects missing webhook credentials | Run without `MP_ACCESS_TOKEN` | `500`; configuration error is returned |
| WEBHOOK-05 | `/api/checkout/webhook` | Processes a signed payment notification | Send a valid Mercado Pago TEST notification and matching signature | `200`; order/payment state is synchronized |

## Execution order

Run the cases in this order to avoid using stale data:

1. `AUTH-01` and `AUTH-03`
2. `BOOK-01`, `BOOK-05`, and `BOOK-06`
3. `CHECKOUT-01` and `ORDER-01`
4. `PAY-01` to `PAY-06`
5. `WEBHOOK-01` to `WEBHOOK-05`

The `/api/checkout/debug/{orderId}` and `/api/checkout/test-payment` endpoints
are diagnostic helpers. They should be tested separately and never used as
evidence that the production payment flow works.