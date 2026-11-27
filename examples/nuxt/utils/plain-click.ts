/**
 * Runs a collection action for a plain click on a filter link instead of following the link, so the
 * change counts as a customer change and sends an update event. The link still works without
 * JavaScript, and a click with a modifier key or another button goes to the link as usual.
 */
export function onPlainClick(event: MouseEvent, action: () => void): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
    return;
  event.preventDefault();
  action();
}
