let optimisticLineId = 0;

const PENDING_PREFIX = '__h_pending_';

export function getOptimisticLineId() {
  return PENDING_PREFIX + optimisticLineId++;
}

export function isOptimisticLineId(lineId: string) {
  return lineId.startsWith(PENDING_PREFIX);
}

export function resetOptimisticLineId() {
  optimisticLineId = 0;
}
