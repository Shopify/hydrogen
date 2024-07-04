import { readFile } from '@shopify/cli-kit/node/fs';
import { Session } from 'node:inspector';
import { handleMiniOxygenImportFail } from './mini-oxygen/common.js';
import { importLocal } from './import-utils.js';

async function createCpuStartupProfiler(root) {
  const { createMiniOxygen } = await importLocal(
    "@shopify/mini-oxygen/node",
    root
  ).catch(handleMiniOxygenImportFail);
  const miniOxygen = createMiniOxygen({
    script: "export default {}",
    modules: true,
    log: () => {
    }
  });
  return {
    async run(scriptPath, sourceEntrypoint) {
      const [script] = await Promise.all([
        readFile(scriptPath),
        miniOxygen.ready()
      ]);
      const stopProfiler = await startProfiler();
      await miniOxygen.reload({ script });
      const rawProfile = await stopProfiler();
      return enhanceProfileNodes(
        rawProfile,
        scriptPath + ".map",
        sourceEntrypoint
      );
    },
    async close() {
      await miniOxygen.dispose();
    }
  };
}
function startProfiler() {
  const session = new Session();
  session.connect();
  return new Promise((resolveStart) => {
    session.post("Profiler.enable", () => {
      session.post("Profiler.start", () => {
        resolveStart(() => {
          return new Promise((resolveStop, rejectStop) => {
            session.post("Profiler.stop", (err, { profile }) => {
              session.disconnect();
              if (err) {
                return rejectStop(err);
              }
              resolveStop(profile);
            });
          });
        });
      });
    });
  });
}
async function enhanceProfileNodes(profile, sourceMapPath, sourceEntrypoint) {
  const { SourceMapConsumer } = await import('source-map');
  const sourceMap = JSON.parse(await readFile(sourceMapPath));
  const smc = await new SourceMapConsumer(sourceMap, "file://" + sourceMapPath);
  const scriptDescendants = /* @__PURE__ */ new Set();
  let totalScriptTimeMicrosec = 0;
  const totalTimeMicrosec = profile.endTime - profile.startTime;
  const timePerSample = profile.samples?.length ? totalTimeMicrosec / profile.samples.length : 0;
  for (const node of profile.nodes) {
    if (node.callFrame.url === "<script>" || scriptDescendants.has(node.id)) {
      scriptDescendants.add(node.id);
      node.children?.forEach((id) => scriptDescendants.add(id));
    }
    if (scriptDescendants.has(node.id)) {
      augmentNode(node, smc);
      if (node.callFrame.url === "<script>" && !node.callFrame.functionName && !node.callFrame.lineNumber && !node.callFrame.columnNumber) {
        node.callFrame.url = sourceEntrypoint ?? "";
        node.callFrame.functionName = "(top-level app code)";
      }
      totalScriptTimeMicrosec += Math.round((node.hitCount ?? 0) * timePerSample * 1e3) / 1e3;
    } else {
      silenceNode(node);
    }
  }
  smc.destroy();
  return {
    profile,
    totalTimeMs: totalTimeMicrosec / 1e3,
    totalScriptTimeMs: totalScriptTimeMicrosec / 1e3
  };
}
function augmentNode(node, smc) {
  const originalPosition = smc.originalPositionFor({
    line: node.callFrame.lineNumber + 1,
    column: node.callFrame.columnNumber + 1
  });
  node.callFrame.url = originalPosition.source || node.callFrame.url;
  node.callFrame.functionName = originalPosition.name || node.callFrame.functionName;
  node.callFrame.lineNumber = originalPosition.line ? originalPosition.line - 1 : node.callFrame.lineNumber;
  node.callFrame.columnNumber = originalPosition.column ?? node.callFrame.columnNumber;
}
function silenceNode(node) {
  Object.assign(node, {
    children: [],
    callFrame: {
      functionName: "(profiler)",
      scriptId: "0",
      url: "",
      lineNumber: -1,
      columnNumber: -1
    }
  });
}

export { createCpuStartupProfiler };
