import Image from "next/image";

interface LatestArticleProps {
  id?: string;
  title: string;
  moreButtonHref: string;
  article: {
    title: string;
    author: string;
    excerpt: string;
    image: string | null;
    href: string;
  };
  ref?: React.Ref<HTMLDivElement>;
}

export default function LatestArticle({
  id,
  title,
  moreButtonHref,
  article,
}: LatestArticleProps) {
  return (
    <section id={id} className="bg-[#f4f1eb] px-6 py-20">
      <div className="mx-auto max-w-197.5">
        <div className="mb-10 flex justify-center">
          <h2 className="text-4xl font-bold">{title}</h2>
        </div>
        <article>
          <a
            href={article.href}
            className="group grid gap-5 transition-opacity hover:opacity-80 md:grid-cols-2 md:gap-8"
          >
            <div className="relative aspect-16/10 w-full bg-black ">
              {article.image && (
                <Image
                  src={article.image}
                  alt={article.title}
                  fill
                  sizes="(min-width: 768px) 288px, 100vw"
                  className="object-cover"
                />
              )}
            </div>

            <div className="min-w-0 pt-0 md:pt-1">
              <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-8">
                <h3 className="text-2xl font-bold leading-tight md:text-3xl">
                  {article.title}
                </h3>
                <p className="shrink-0 text-base text-gray-500 md:pt-2 md:text-lg">
                  {article.author}
                </p>
              </div>
              <p className="line-clamp-4 text-base leading-tight text-black md:line-clamp-5">
                {article.excerpt}
              </p>
            </div>
          </a>
        </article>
      </div>

      <div className="mt-12 flex justify-center">
        <a
          href={moreButtonHref}
          className="bg-black px-14 py-4 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          最近の投稿
        </a>
      </div>
    </section>
  );
}
