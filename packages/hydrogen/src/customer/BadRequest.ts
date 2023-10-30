export class BadRequest extends Response {
  constructor(message?: string, helpMessage?: string) {
    // A lot of things can go wrong when configuring the customer account api
    // oauth flow. In dev mode, log a helper message.
    if (helpMessage && process.env.NODE_ENV === 'development') {
      console.error('Customer Account API Error: ' + helpMessage);
    }

    super(`Bad request: ${message}`, {status: 400});
  }
}
