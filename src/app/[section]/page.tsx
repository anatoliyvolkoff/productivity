import { notFound } from "next/navigation";
import { PhaseBadge } from "@/components/widgets/Placeholder";
import { PLACEHOLDER_SECTIONS } from "@/lib/nav";

export const dynamicParams = false;

export function generateStaticParams() {
  return PLACEHOLDER_SECTIONS.map((item) => ({ section: item.slug }));
}

export async function generateMetadata(props: PageProps<"/[section]">) {
  const { section } = await props.params;
  const item = PLACEHOLDER_SECTIONS.find((i) => i.slug === section);
  return { title: item ? `${item.label} · Productivity OS` : "Productivity OS" };
}

/** Temporary page for sections that later roadmap phases build out. */
export default async function SectionPage(props: PageProps<"/[section]">) {
  const { section } = await props.params;
  const item = PLACEHOLDER_SECTIONS.find((i) => i.slug === section);
  if (!item) notFound();
  const Icon = item.icon;

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="flex max-w-sm flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="size-8" strokeWidth={1.75} />
        </div>
        <h1 className="mt-5 text-[28px] font-semibold tracking-tight">{item.label}</h1>
        <p className="mt-2 text-[15px] text-fg-muted">{item.description}</p>
        <div className="mt-4">
          <PhaseBadge phase={item.phase} />
        </div>
      </div>
    </div>
  );
}
