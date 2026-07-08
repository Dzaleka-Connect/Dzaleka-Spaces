export interface ContentSection {
  heading: string;
  body?: string;
  items?: string[];
}

export function ContentPage({
  title,
  intro,
  sections,
  footnote,
}: {
  title: string;
  intro: string;
  sections: ContentSection[];
  footnote?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{intro}</p>
      </div>
      <div className="flex flex-col gap-6">
        {sections.map((section) => (
          <section key={section.heading}>
            <h2 className="mb-2 text-lg font-semibold">{section.heading}</h2>
            {section.body ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {section.body}
              </p>
            ) : null}
            {section.items ? (
              <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
      {footnote ? (
        <p className="border-t pt-6 text-xs text-muted-foreground">
          {footnote}
        </p>
      ) : null}
    </div>
  );
}
