import Image from "next/image";

interface ArticleCardProps {
  title: string;
  author: string;
  summary: string;
  image: string | null;
  href: string;
  priority?: boolean;
}

export default function ArticleCard({
  title,
  author,
  summary,
  image,
  href,
  priority = false,
}: ArticleCardProps) {
  return (
    <a
      href={href}
      className="group grid gap-5 transition-opacity hover:opacity-80 md:grid-cols-[288px_1fr] md:gap-8"
    >
      <article className="contents">
        <div className="relative aspect-16/10 w-full bg-black md:aspect-auto md:h-45.5">
          {image && (
            <Image
              src={image}
              alt=""
              fill
              sizes="(min-width: 768px) 288px, 100vw"
              className="object-cover"
              priority={priority}
            />
          )}
        </div>

        <div className="min-w-0 pt-0 md:pt-1">
          <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-8">
            <h3 className="text-2xl font-bold leading-tight md:text-3xl">
              {title}
            </h3>
            <p className="shrink-0 text-base text-gray-500 md:pt-2 md:text-lg">
              {author}
            </p>
          </div>
          <p className="line-clamp-4 text-base leading-tight text-black md:line-clamp-5">
            {summary}
          </p>
        </div>
      </article>
    </a>
  );
}
