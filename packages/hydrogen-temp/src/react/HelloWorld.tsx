// TODO: Replace with real React bindings once the entrypoint pattern is validated
export interface HelloWorldProps {
  name?: string;
}

export function HelloWorld({name = 'World'}: HelloWorldProps) {
  return <div>{`Hello, ${name}!`}</div>;
}
