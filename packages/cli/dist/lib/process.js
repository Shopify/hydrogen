import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
function supressNodeExperimentalWarnings() {
  const warningListener = process.listeners("warning")[0];
  if (warningListener) {
    process.removeAllListeners("warning");
    process.prependListener("warning", (warning) => {
      if (warning.name != "ExperimentalWarning") {
        warningListener(warning);
      }
    });
  }
}

export { execAsync, supressNodeExperimentalWarnings };
