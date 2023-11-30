import { useState } from "react";

export default function INP() {
  return (
    <>
      <TestINP className="a-1" key="button-1" timeout={1000} />
      <TestINP className="a-1" key="button-2" timeout={500} />
      <TestINP className="a-1" key="button-3" timeout={300} />
      <TestINP className="a-1" key="button-4" timeout={200} />
      <TestINP className="a-1" key="button-5" timeout={100} />
    </>
  );
}

function TestINP({timeout, className}: {timeout: number, className: string}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        className={className}
        onClick={() => {
          const time = performance.now();
          while (performance.now() - time < timeout) {}
          setOpen(true);
        }}
      >Click me</button>
      {open && <div>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.</div>}
    </div>
  );
}
