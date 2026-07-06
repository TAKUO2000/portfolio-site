"use client";

import { useEffect, useState } from "react";
import CategoryBox from "@/app/components/ui/CategoryBox";
import TagBox from "@/app/components/ui/TagBox";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface Category {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

export default function DevPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE_URL}/api/categories`, {
        headers: { Accept: "application/json" },
      }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/api/tags`, {
        headers: { Accept: "application/json" },
      }).then((r) => r.json()),
    ])
      .then(([cats, tgs]: [Category[], Tag[]]) => {
        setCategories(cats);
        setTags(tgs);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="p-8 flex flex-col gap-8">
      <section>
        <h2 className="text-lg font-bold mb-4">CategoryBox</h2>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <CategoryBox key={cat.id} category={cat.name} id={cat.id} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-4">TagBox</h2>
        <div className="flex gap-2">
          {tags.map((tag) => (
            <TagBox key={tag.id} tag={tag.name} id={tag.id} />
          ))}
        </div>
      </section>
    </div>
  );
}
