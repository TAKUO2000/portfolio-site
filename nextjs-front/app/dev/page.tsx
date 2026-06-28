import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";

export default function DevPage() {
  return (
    <div className="p-8 flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-bold mb-4">CategoryBox</h2>
        <div className="flex gap-2">
          <CategoryBox category="技術" id={1} />
          <CategoryBox category="ライフスタイル" id={2} />
          <CategoryBox category="ビジネス" id={3} />
          <CategoryBox category="未知のカテゴリ" id={99} />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">TagBox</h2>
        <div className="flex gap-2">
          <TagBox tag="Laravel" id={1} />
          <TagBox tag="Docker" id={2} />
          <TagBox tag="JavaScript" id={3} />
        </div>
      </section>
    </div>
  );
}
