import { expect } from "@playwright/test";
import { Given, Then, When } from "@cucumber/cucumber";
import type { E2EWorld } from "../support/hooks";

function uniqueCredentials() {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    name: "E2E Tennis User",
    email: `e2e-${suffix}@example.com`,
    password: "TennisE2E123!",
  };
}

async function registerUser(world: E2EWorld) {
  const credentials = uniqueCredentials();
  await world.page.getByLabel("Nombre").fill(credentials.name);
  await world.page.getByLabel("Email").fill(credentials.email);
  await world.page.getByLabel("Contrasena").fill(credentials.password);
  await world.page.getByRole("button", { name: "Registrarse" }).click();
  await expect(world.page.getByRole("dialog")).toBeHidden();
}

async function selectFirstAvailableSlot(world: E2EWorld) {
  const slot = world.page
    .locator('button:not([disabled])')
    .filter({ hasText: /^\d{2}:\d{2}$/ })
    .first();
  await expect(slot).toBeVisible();
  await slot.click();
}

Given("que visito la página principal", async function (this: E2EWorld) {
  await this.page.goto("/");
  await expect(this.page.getByRole("button", { name: "Register" })).toBeVisible();
});

When("abro el formulario de registro", async function (this: E2EWorld) {
  await this.page.getByRole("button", { name: "Register" }).click();
  await expect(this.page.getByRole("dialog", { name: "Crea una cuenta" })).toBeVisible();
});

When("completo un registro válido", async function (this: E2EWorld) {
  await registerUser(this);
});

When("selecciono el primer horario disponible", async function (this: E2EWorld) {
  await selectFirstAvailableSlot(this);
  await expect(this.page.getByText("$20.00", { exact: true }).first()).toBeVisible();
});

When("intento comprar la reserva", async function (this: E2EWorld) {
  await this.page.getByRole("button", { name: "Comprar" }).click();
});

When("completo el registro solicitado", async function (this: E2EWorld) {
  await expect(this.page.getByRole("dialog", { name: "Crea una cuenta" })).toBeVisible();
  await registerUser(this);
});

When("vuelvo a seleccionar un horario y comprar", async function (this: E2EWorld) {
  await this.page.reload();
  await selectFirstAvailableSlot(this);
  await this.page.getByRole("button", { name: "Comprar" }).click();
  await this.page.waitForURL(/\/paymentPage\?/);
});

When("abro el formulario de login", async function (this: E2EWorld) {
  await this.page.getByRole("button", { name: "Login" }).click();
  await expect(this.page.getByRole("dialog", { name: "Inicia sesion" })).toBeVisible();
});

When("envío credenciales inválidas", async function (this: E2EWorld) {
  await this.page.getByLabel("Email").fill("invalid-e2e@example.com");
  await this.page.getByLabel("Contrasena").fill("InvalidE2E123!");
  await this.page.getByRole("button", { name: "Iniciar sesion" }).click();
});

Then("el registro se completa correctamente", async function (this: E2EWorld) {
  await expect(this.page.getByRole("dialog")).toBeHidden();
});

Then("se muestra un error de autenticación", async function (this: E2EWorld) {
  await expect(this.page.getByRole("alert")).toBeVisible();
});

Then("se abre el checkout de la reserva", async function (this: E2EWorld) {
  await expect(this.page).toHaveURL(/\/paymentPage\?/);
  await expect(this.page.getByText("Tu reserva", { exact: true })).toBeVisible();
  await expect(this.page.getByText("Court 1", { exact: true })).toBeVisible();
});
