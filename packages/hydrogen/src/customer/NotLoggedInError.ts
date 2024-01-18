export class NotLoggedInError extends Error {
  constructor(cause?: string) {
    const message = 'Customer is not Logged In' + (cause ? ': ' + cause : '');

    super(message);
    this.name = 'NotLoggedInError';
  }
}
