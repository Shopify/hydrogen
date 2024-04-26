import { spawnSync } from 'child_process';
import { outputDebug } from '@shopify/cli-kit/node/output';

const EXPERIMENTAL_VM_MODULES_FLAG = "--experimental-vm-modules";
function commandNeedsVM(id = "", argv = []) {
  return id === "hydrogen:debug:cpu" || ["hydrogen:dev", "hydrogen:preview"].includes(id) && argv.includes("--legacy-runtime");
}
const hook = async function(options) {
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
var init_default = hook;

export { init_default as default };
