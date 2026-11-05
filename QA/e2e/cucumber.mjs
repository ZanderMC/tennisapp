const config = {
  paths: ["QA/e2e/features/**/*.feature"],
  import: ["QA/e2e/support/**/*.ts", "QA/e2e/steps/**/*.ts"],
  format: ["progress"],
  parallel: 1,
};

export default config;
