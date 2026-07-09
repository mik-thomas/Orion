import type { ReactNode } from "react";

export type DashboardTagColour = "red" | "yellow" | "green" | "blue" | "grey";

interface DashboardSectionProps {
  title: string;
  headingLevel?: 2 | 3;
  description?: string;
  tag?: string;
  tagColour?: DashboardTagColour;
  headerAside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DashboardSection({
  title,
  headingLevel = 2,
  description,
  tag,
  tagColour = "grey",
  headerAside,
  children,
  className,
}: DashboardSectionProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const headingClass = headingLevel === 2 ? "govuk-heading-l" : "govuk-heading-m";

  return (
    <section className={["orion-dashboard-section", className].filter(Boolean).join(" ")}>
      <div className="orion-dashboard-section__header">
        <Heading className={`${headingClass} orion-dashboard-section__title`}>{title}</Heading>
        {headerAside ? <div className="orion-dashboard-section__aside">{headerAside}</div> : null}
        {tag ? (
          <strong className={`govuk-tag govuk-tag--${tagColour} orion-dashboard-section__tag`}>{tag}</strong>
        ) : null}
      </div>
      {description ? <p className="govuk-body orion-dashboard-section__description">{description}</p> : null}
      <div className="orion-dashboard-section__content">{children}</div>
    </section>
  );
}
