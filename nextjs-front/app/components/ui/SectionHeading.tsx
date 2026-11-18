interface SectionHeadingProps {
  children: React.ReactNode;
}

/**
 * トップのセクションの見出し（英字）と、その下のドットの点線。
 *
 * 英字の書体（Silkscreen）は1文字が広く、「Popular Articles」は 26px だと約 350px 要る。
 * md未満は画面の幅に合わせて文字を小さくし、幅 320px でも1行に収める
 */
export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <div className="mb-7 flex flex-col items-center gap-3 md:mb-11 md:gap-3.5">
      <h2 className="text-center font-pixel text-[clamp(18px,6vw,26px)] leading-[1.1] font-bold whitespace-nowrap md:text-[clamp(24px,4vw,36px)]">
        {children}
      </h2>
      <div
        aria-hidden="true"
        className="h-1 w-23 bg-[repeating-linear-gradient(90deg,var(--color-foreground)_0_4px,transparent_4px_8px)] md:w-31"
      />
    </div>
  );
}
