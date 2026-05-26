export default function Hero() {
  return (
    <section className="bg-[#f4f1eb] text-center py-24 px-6 h-screen flex flex-col items-center justify-center">
      <h1 className="text-6xl font-bold mb-3">TAKUO_Log</h1>
      <p className="text-base text-[#010101] mb-8">
        TAKUO2000が読んだ本と、学んだ技術の保管庫。
      </p>
      <div className="flex justify-center gap-4">
        <a
          href="#"
          className="bg-black text-white text-base px-6 py-2 hover:opacity-70 transition-opacity"
        >
          人気記事
        </a>
        <a
          href="#"
          className="bg-black text-white text-base px-6 py-2 hover:opacity-70 transition-opacity"
        >
          最新記事
        </a>
        <a
          href="#"
          className="bg-black text-white text-base px-6 py-2 hover:opacity-70 transition-opacity"
        >
          このサイトについて
        </a>
      </div>
    </section>
  );
}
