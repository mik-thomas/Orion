import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface OrionBreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function OrionBreadcrumbs({ items }: OrionBreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="govuk-breadcrumbs orion-breadcrumbs" aria-label="You are at:">
      <ol className="govuk-breadcrumbs__list">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className="govuk-breadcrumbs__list-item"
              aria-current={isCurrent ? "page" : undefined}
            >
              {item.to && !isCurrent ? (
                <Link to={item.to} className="govuk-breadcrumbs__link">
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
