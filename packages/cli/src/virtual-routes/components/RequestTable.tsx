import {
  buildRequestData,
  type ServerEvent,
  type ServerEvents,
} from './RequestWaterfall.jsx';

export function RequestTable({serverEvents}: {serverEvents: ServerEvents}) {
  const items = buildRequestData<ServerEvent>({
    serverEvents,
    buildMainRequest: (
      mainRequest: ServerEvent,
      timing: Record<string, number>,
    ) => {
      console.log({mainRequest, timing});
      return mainRequest;
    },
    buildSubRequest: (
      subRequest: ServerEvent,
      timing: Record<string, number>,
    ) => {
      console.log({subRequest, timing});
      return subRequest;
    },
  });

  return null;
}
