// SPDX-License-Identifier: MIT
import { loadKernel } from '@metaharness/kernel';
import adapter from '@metaharness/host-claude-code';
const HARNESS_NAME = 'my-research-harness';
async function main(): Promise<number> {
  const kernel = await loadKernel();
  const info = kernel.kernelInfo();
  console.log(`${HARNESS_NAME} — research dossier harness`);
  console.log(`Kernel ${info.version} (${kernel.backend}), host: ${adapter.name}`);
  console.log('Use `' + HARNESS_NAME + ' dossier "<question>"` to start a research run.');
  return 0;
}
main().then(c => process.exit(c)).catch(err => { console.error(err); process.exit(1); });
