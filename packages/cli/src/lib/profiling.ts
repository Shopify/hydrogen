import {Session, type Profiler} from 'node:inspector';

export function startProfiler(): Promise<
  (filepath?: string) => Promise<Profiler.Profile>
> {
  const session = new Session();
  session.connect();

  return new Promise((resolveStart) => {
    session.post('Profiler.enable', () => {
      session.post('Profiler.start', () => {
        resolveStart(() => {
          return new Promise((resolveStop, rejectStop) => {
            session.post('Profiler.stop', (err, {profile}) => {
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
