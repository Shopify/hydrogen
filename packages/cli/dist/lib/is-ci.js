function isCI() {
  const { env } = process;
  return env.CI === "false" ? false : !!(env.CI || env.CI_NAME || env.BUILD_NUMBER || env.TF_BUILD);
}

export { isCI };
