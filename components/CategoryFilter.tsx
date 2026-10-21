/**
 * components/CategoryFilter.tsx
 * แถบกรองหมวดหมู่สินค้า
 */
"use client";
import { Category } from "../lib/types";
interface CategoryFilterProps {
    categories: Category[];
    active: string;
    onChange: (id: string) => void;
}
export default function CategoryFilter({ categories, active, onChange }: CategoryFilterProps) {
    return (
        <div className="category-row" role="group" aria-label="กรองหมวดหมู่">
            <button
                id="cat-all"
                className={active === "ทั้งหมด" ? "selected" : ""}
                onClick={() => onChange("ทั้งหมด")}
            >
                ทั้งหมด
            </button>
            {categories
                .filter((c) => c.isActive ?? true)
                .map((c) => (
                    <button
                        key={c.id}
                        id={`cat-${c.id}`}
                        className={active === c.id ? "selected" : ""}
                        onClick={() => onChange(c.id)}
                    >
                        {c.nameTh}
                    </button>
                ))}
        </div>
    );
}
