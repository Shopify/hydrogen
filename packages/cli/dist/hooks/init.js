import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { outputNewline, outputDebug } from '@shopify/cli-kit/node/output';
import { cwd, resolvePath, joinPath } from '@shopify/cli-kit/node/path';
import { renderWarning } from '@shopify/cli-kit/node/ui';

const hook = async function(options) {
  if (!options.id?.startsWith("hydrogen:") || options.id === "hydrogen:init") {
    return;
  }
  let projectPath = cwd();
  const pathFlagRE = /^--path($|=)/;
  const pathFlagIndex = options.argv.findIndex((arg) => pathFlagRE.test(arg));
  if (pathFlagIndex !== -1) {
    const pathFlagValue = options.argv[pathFlagIndex]?.split("=")[1] ?? options.argv[pathFlagIndex + 1];
    if (pathFlagValue && !pathFlagValue.startsWith("--")) {
      projectPath = resolvePath(projectPath, pathFlagValue);
    }
  }
  if (!isHydrogenProject(projectPath)) {
    outputNewline();
    renderWarning({
      headline: `Looks like you're trying to run a Hydrogen command outside of a Hydrogen project.`,
      body: [
        "Run",
        { command: "shopify hydrogen init" },
        "to create a new Hydrogen project or use the",
        { command: "--path" },
        "flag to specify an existing Hydrogen project.\n\n",
        { subdued: projectPath }
      ],
      reference: [
        "Getting started: https://shopify.dev/docs/storefronts/headless/hydrogen",
        "CLI commands: https://shopify.dev/docs/api/shopify-cli/hydrogen"
      ]
    });
    process.exit(1);
  }
  if (commandNeedsVM(options.id, options.argv) && !process.execArgv.includes(EXPERIMENTAL_VM_MODULES_FLAG) && !(process.env.NODE_OPTIONS ?? "").includes(EXPERIMENTAL_VM_MODULES_FLAG)) {
    outputDebug(
      `Restarting CLI process with ${EXPERIMENTAL_VM_MODULES_FLAG} flag.`
    );
    const [command, ...args] = process.argv;
    args.unshift(EXPERIMENTAL_VM_MODULES_FLAG);
    const result = spawnSync(command, args, { stdio: "inherit" });
    process.exit(result.status ?? 1);
  }
};
const EXPERIMENTAL_VM_MODULES_FLAG = "--experimental-vm-modules";
function commandNeedsVM(id = "", argv = []) {
  return id === "hydrogen:debug:cpu" || ["hydrogen:dev", "hydrogen:preview"].includes(id) && argv.includes("--legacy-runtime");
}
function isHydrogenProject(projectPath) {
  try {
    const require2 = createRequire(import.meta.url);
    const { dependencies } = require2(joinPath(projectPath, "package.json"));
    return !!dependencies["@shopify/hydrogen"] || // Diff examples only have this package as a dependency
    !!dependencies["@shopify/cli-hydrogen"];
  } catch {
    return false;
  }
}
var init_default = hook;

export { init_default as default };
