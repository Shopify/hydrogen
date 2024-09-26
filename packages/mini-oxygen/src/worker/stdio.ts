import type {Readable} from 'node:stream';
import assert from 'node:assert';
import {getFreshSourceMapSupport} from 'miniflare';

// --- Runtime logs handler ---
// The following code is an adapted version of this code:
// https://github.com/cloudflare/workers-sdk/blob/b098256e9ed315aa265d52ab10c208049c16a8ca/packages/wrangler/src/dev/miniflare.ts#L727

export function handleRuntimeStdio(stdout: Readable, stderr: Readable) {
  const classifiers = {
    // Is this chunk a big chonky barf from workerd that we want to hijack to cleanup/ignore?
    isBarf(chunk: string) {
      const containsLlvmSymbolizerWarning = chunk.includes(
        'Not symbolizing stack traces because $LLVM_SYMBOLIZER is not set',
      );
      const containsRecursiveIsolateLockWarning = chunk.includes(
        'took recursive isolate lock',
      );
      // Matches stack traces from workerd
      //  - on unix: groups of 9 hex digits separated by spaces
      //  - on windows: groups of 12 hex digits, or a single digit 0, separated by spaces
      const containsHexStack = /stack:( (0|[a-f\d]{4,})){3,}/.test(chunk);

      return (
        containsLlvmSymbolizerWarning ||
        containsRecursiveIsolateLockWarning ||
        containsHexStack
      );
    },
    // Is this chunk an Address In Use error?
    isAddressInUse(chunk: string) {
      return chunk.includes('Address already in use; toString() = ');
    },
    isWarning(chunk: string) {
      return /\.c\+\+:\d+: warning:/.test(chunk);
    },
    isCodeMovedWarning(chunk: string) {
      return /CODE_MOVED for unknown code block/.test(chunk);
    },
    isAccessViolation(chunk: string) {
      return chunk.includes('access violation;');
    },
  };

  stdout.on('data', (chunk: Buffer | string) => {
    chunk = chunk.toString().trim();

    if (classifiers.isBarf(chunk) || classifiers.isWarning(chunk)) {
      // Ignore unactionable logs. Ideally we'd write them
      // to a log file (eventually). In any case, running
      // this process in verbose mode will still print these
      // logs to the console.
    } else {
      console.log(getSourceMappedString(chunk));
    }
  });

  stderr.on('data', (chunk: Buffer | string) => {
    chunk = chunk.toString().trim();

    if (classifiers.isBarf(chunk) || classifiers.isWarning(chunk)) {
      // this is a big chonky barf from workerd that we want to hijack to cleanup/ignore

      if (classifiers.isAddressInUse(chunk)) {
        // This should never happen in practice because we set the port to 0 (i.e. random available port)
      } else if (classifiers.isAccessViolation(chunk)) {
        // Handle Access Violation errors on Windows, which may be caused by an outdated
        // version of the Windows OS or the Microsoft Visual C++ Redistributable.
        // See https://github.com/cloudflare/workers-sdk/issues/6170#issuecomment-2245209918
        let errorMessage =
          '[o2:runtime] There was an access violation in the runtime.';

        if (process.platform === 'win32') {
          errorMessage +=
            '\nOn Windows, this may be caused by an outdated Microsoft Visual C++ Redistributable library.\n' +
            'Check that you have the latest version installed.\n' +
            'See https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist.';
        }

        console.error(new Error(errorMessage, {cause: chunk}));
      } else {
        // Ignore unactionable logs. Ideally we'd write them
        // to a log file (eventually). In any case, running
        // this process in verbose mode will still print these
        // logs to the console.
      }
    } else if (classifiers.isCodeMovedWarning(chunk)) {
      // This should not happen when developing apps, only when developing the worker runtime itself
    } else {
      // Anything not explicitly handled above should be logged as an error (via stderr)
      console.error(getSourceMappedString(chunk));
    }
  });
}

// --- Source map support ---
// Note: Sourcemaps are not used in the Vite flavored runtime because it inlines sourcemaps already.
// This is only required when using MiniOxygen directly with a built worker as its input (and a sourcemap file).
// For example, this is used in tests, in Classic Remix projects, and when running any sort of "preview" mode
// with a prior build step.
//
// The following code is an adapted version of this code:
// https://github.com/cloudflare/workers-sdk/blob/b098256e9ed315aa265d52ab10c208049c16a8ca/packages/wrangler/src/sourcemap.ts

let sourceMappingPrepareStackTrace: typeof Error.prepareStackTrace;
function getSourceMappingPrepareStackTrace(): NonNullable<
  typeof Error.prepareStackTrace
> {
  // If we already have a source mapper, return it
  if (sourceMappingPrepareStackTrace !== undefined) {
    return sourceMappingPrepareStackTrace;
  }

  const support: typeof import('@cspotcode/source-map-support') =
    getFreshSourceMapSupport();

  const originalPrepareStackTrace = Error.prepareStackTrace;
  support.install({
    environment: 'node',
    // Don't add Node `uncaughtException` handler
    handleUncaughtExceptions: false,
    // Don't hook Node `require` function
    hookRequire: false,
    redirectConflictingLibrary: false,
    // Make sure we're using fresh copies of files each time we source map
    emptyCacheBetweenOperations: true,
  });

  sourceMappingPrepareStackTrace = Error.prepareStackTrace;
  assert(sourceMappingPrepareStackTrace !== undefined);
  Error.prepareStackTrace = originalPrepareStackTrace;

  return sourceMappingPrepareStackTrace;
}

const placeholderError = new Error();
function getSourceMappedString(value: string): string {
  const callSiteLines = Array.from(value.matchAll(CALL_SITE_REGEXP));
  const callSites = callSiteLines.map(lineMatchToCallSite);
  const prepareStack = getSourceMappingPrepareStackTrace();
  const sourceMappedStackTrace: string = prepareStack(
    placeholderError,
    callSites,
  );
  const sourceMappedCallSiteLines = sourceMappedStackTrace.split('\n').slice(1);

  for (let i = 0; i < callSiteLines.length; i++) {
    // If a file name is undefined, it's likely invalid, so just skip it
    if (callSites[i].getFileName() === undefined) {
      continue;
    }

    const callSiteLine = callSiteLines[i][0];
    const callSiteAtIndex = callSiteLine.indexOf('at');
    assert(callSiteAtIndex !== -1); // Matched against `CALL_SITE_REGEXP`
    const callSiteLineLeftPad = callSiteLine.substring(0, callSiteAtIndex);
    value = value.replace(
      callSiteLine,
      callSiteLineLeftPad + sourceMappedCallSiteLines[i].trimStart(),
    );
  }

  return value;
}

// Adapted from `node-stack-trace`:
/*!
 * Copyright (c) 2011 Felix Geisendörfer (felix@debuggable.com)
 *
 *  Permission is hereby granted, free of charge, to any person obtaining a copy
 *  of this software and associated documentation files (the "Software"), to deal
 *  in the Software without restriction, including without limitation the rights
 *  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *  copies of the Software, and to permit persons to whom the Software is
 *  furnished to do so, subject to the following conditions:
 *
 *  The above copyright notice and this permission notice shall be included in
 *  all copies or substantial portions of the Software.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 *  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 *  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 *  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 *  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 *  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 *  THE SOFTWARE.
 */

const CALL_SITE_REGEXP =
  /^(?:\s+(?:\x1B\[\d+m)?'?)? {2,4}at (?:(.+?)\s+\()?(?:(.+?):(\d+)(?::(\d+))?|([^)]+))\)?/gm;

function lineMatchToCallSite(lineMatch: RegExpMatchArray): CallSite {
  let object: string | null = null;
  let method: string | null = null;
  let functionName: string | null = null;
  let typeName: string | null = null;
  let methodName: string | null = null;
  const isNative = lineMatch[5] === 'native';

  if (lineMatch[1]) {
    functionName = lineMatch[1];
    let methodStart = functionName.lastIndexOf('.');
    if (functionName[methodStart - 1] == '.') {
      methodStart--;
    }
    if (methodStart > 0) {
      object = functionName.substring(0, methodStart);
      method = functionName.substring(methodStart + 1);
      const objectEnd = object.indexOf('.Module');
      if (objectEnd > 0) {
        functionName = functionName.substring(objectEnd + 1);
        object = object.substring(0, objectEnd);
      }
    }
  }

  if (method) {
    typeName = object;
    methodName = method;
  }

  if (method === '<anonymous>') {
    methodName = null;
    functionName = null;
  }

  return new CallSite({
    typeName,
    functionName,
    methodName,
    fileName: lineMatch[2] || null,
    lineNumber: parseInt(lineMatch[3]) || null,
    columnNumber: parseInt(lineMatch[4]) || null,
    native: isNative,
  });
}

interface CallSiteOptions {
  typeName: string | null;
  functionName: string | null;
  methodName: string | null;
  fileName: string | null;
  lineNumber: number | null;
  columnNumber: number | null;
  native: boolean;
}

// https://v8.dev/docs/stack-trace-api#customizing-stack-traces
// This class supports the subset of options implemented by `node-stack-trace`:
// https://github.com/felixge/node-stack-trace/blob/4c41a4526e74470179b3b6dd5d75191ca8c56c17/index.js
class CallSite implements NodeJS.CallSite {
  constructor(private readonly opts: CallSiteOptions) {}

  getThis(): unknown {
    return null;
  }
  getTypeName(): string | null {
    return this.opts.typeName;
  }
  getFunction(): Function | undefined {
    return undefined;
  }
  getFunctionName(): string | null {
    return this.opts.functionName;
  }
  getMethodName(): string | null {
    return this.opts.methodName;
  }
  getFileName(): string | undefined {
    return this.opts.fileName ?? undefined;
  }
  getScriptNameOrSourceURL(): string | null {
    return this.opts.fileName;
  }
  getLineNumber(): number | null {
    return this.opts.lineNumber;
  }
  getColumnNumber(): number | null {
    return this.opts.columnNumber;
  }
  getEvalOrigin(): string | undefined {
    return undefined;
  }
  isToplevel(): boolean {
    return false;
  }
  isEval(): boolean {
    return false;
  }
  isNative(): boolean {
    return this.opts.native;
  }
  isConstructor(): boolean {
    return false;
  }
  isAsync(): boolean {
    return false;
  }
  isPromiseAll(): boolean {
    return false;
  }
  isPromiseAny(): boolean {
    return false;
  }
  getPromiseIndex(): number | null {
    return null;
  }
}
