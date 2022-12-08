import {addOxygen} from './steps/add-oxygen.js';
import {addConfig} from './steps/add-config.js';

export default function installHydrogen(
  file: any,
  {jscodeshift: j}: any,
  options: any,
) {
  const source = j(file.source);

  if (false) {
    return file.source;
  }

  addOxygen();
  addConfig();

  return source.toSource();
}
