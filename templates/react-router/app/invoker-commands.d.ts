// Native invoker-commands API (command/commandfor) used to open the cart drawer
// <dialog> declaratively. React's published types do not yet describe these
// button attributes, so augment them here.
declare module "react" {
  interface ButtonHTMLAttributes<T> {
    command?: string;
    commandfor?: string;
  }
}

export {};
