import {
  After,
  Before,
  BeforeAll,
  AfterAll,
  setWorldConstructor,
  World,
} from "@cucumber/cucumber";
import type { IWorldOptions } from "@cucumber/cucumber";
import { chromium } from "playwright";
import type { Browser, Page } from "playwright";

const baseURL = process.env.BASE_URL ?? "http://localhost:3000";
let browser: Browser;

export class E2EWorld extends World {
  page!: Page;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(E2EWorld);

BeforeAll(async () => {
  browser = await chromium.launch({
    headless: process.env.HEADED !== "true",
  });
});

Before(async function (this: E2EWorld) {
  const context = await browser.newContext({ baseURL });
  this.page = await context.newPage();
});

After(async function (this: E2EWorld) {
  await this.page.context().close();
});

AfterAll(async () => {
  if (browser) {
    await browser.close();
  }
});
