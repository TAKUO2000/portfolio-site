export default function AboutSite() {
  return (
    <section className="bg-[#f5f0e8] py-24 px-6">
      <div className="max-w-5xl mx-auto flex items-center gap-16">
        <div className="flex-1">
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            About
            <br />
            This
            <br />
            Site
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            ここにサイトの説明文が入ります。読んだ本や学んだ技術について記録していくサイトです。
          </p>
        </div>
        <div className="flex-1 flex justify-center">
          {/* イラストは後で差し替え */}
          <div className="w-56 h-56 rounded-full border-4 border-[#8B7355] flex items-center justify-center bg-[#f5f0e8]">
            <span className="text-gray-400 text-sm">イラスト</span>
          </div>
        </div>
      </div>
    </section>
  );
}
