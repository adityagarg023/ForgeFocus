import { AlertTriangle } from "react-feather";

export default function NotFound() {
  return (
    <div className=" h-[100vh] w-[100vw] flex flex-col items-center justify-center">
      <div className="flex items-center justify-center">
        <AlertTriangle className="size-40 inline" />
        <h1 className="text-6xl font-bold"> Error 404</h1>
      </div>
      <div className="flex-col justify-center text-2xl">
        <h1>This page doesn't exist bro,</h1>
        <h1> What are you even doing.</h1>
      </div>
    </div>
  );
}
