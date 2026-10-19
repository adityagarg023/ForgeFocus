export default function Header() {
  return (
    <div className="bg-[#010409] h-[10vh] w-[100vw] pl-10 flex items-center text-white justify-between pr-20">
      <a href="/" className="text-6xl font-bold">
        ForgeFocus
      </a>
      <div className=" w-[25vw] flex justify-between">
        <a href="../session-history" className="text-2xl">
          Session History
        </a>
        <a href="../profile" className="text-2xl">
          Profile
        </a>
      </div>
    </div>
  );
}
