// We are using `--experimental-vm-modules`, which logs multiple warnings
// in the console. Here we hide them since they are not actionable.

const [warningListener] = process.listeners('warning');

if (warningListener) {
  process.removeAllListeners('warning');

  process.prependListener('warning', (warning) => {
    if (warning.name !== 'ExperimentalWarning') {
      warningListener(warning);
    }
  });
}
