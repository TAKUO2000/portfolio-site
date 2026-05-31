import Image from "next/image";

interface AboutSiteProps {
  id?: string;
  about: "site" | "me";
  icon: string;
  title: string[];
  text: string;
}

export default function AboutSite({
  id,
  about,
  icon,
  title,
  text,
}: AboutSiteProps) {
  const iconElement = (
    <div className="flex-1 flex justify-center">
      <Image
        src={icon}
        alt="Site Icon"
        width={300}
        height={300}
        priority={about === "site"}
        className={`${
          about === "site"
            ? "w-auto h-auto object-contain rounded-full border-4 border-[#8B7355]"
            : "w-auto h-auto object-contain rounded-full"
        }`}
      />
    </div>
  );

  const textElement = (
    <div className={`flex-1 ${about === "site" ? "text-end" : "text-start"}`}>
      <h2 className="text-5xl font-bold mb-6 leading-tight">
        {title.map((line, index) => (
          <span key={index} className="block">
            {line}
          </span>
        ))}
      </h2>
      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
    </div>
  );

  return (
    <section id={id} className="bg-[#f5f0e8] py-24 px-6">
      <div className="max-w-2xl mx-auto flex items-center gap-16">
        {about === "site" ? (
          <>
            {iconElement}
            {textElement}
          </>
        ) : (
          <>
            {textElement}
            {iconElement}
          </>
        )}
      </div>
    </section>
  );
}
