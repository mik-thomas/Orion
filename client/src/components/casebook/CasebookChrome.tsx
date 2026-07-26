import { useId, useState, type ReactNode } from "react";

export type CasebookTab = {
  id: string;
  label: string;
  count?: number;
};

export function CasebookTabs({
  tabs,
  activeId,
  onChange,
}: {
  tabs: CasebookTab[];
  activeId: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="csbk-tabs" role="tablist">
      {tabs.map((tab) => {
        const selected = tab.id === activeId;
        const label = tab.count != null ? `${tab.label} (${tab.count})` : tab.label;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={selected ? "csbk-tabs__tab csbk-tabs__tab--active" : "csbk-tabs__tab"}
            onClick={() => onChange(tab.id)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function CasebookTabPanel({
  id,
  activeId,
  children,
}: {
  id: string;
  activeId: string;
  children: ReactNode;
}) {
  if (id !== activeId) return null;
  return (
    <div
      className="csbk-tabs__panel"
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
    >
      {children}
    </div>
  );
}

export function CasebookAccordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const buttonId = useId();

  return (
    <div className={open ? "csbk-accordion csbk-accordion--open" : "csbk-accordion"}>
      <h3 className="csbk-accordion__heading">
        <button
          type="button"
          id={buttonId}
          className="csbk-accordion__button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((current) => !current)}
        >
          <span className="csbk-accordion__title">{title}</span>
          <span className="csbk-accordion__toggle">{open ? "Collapse" : "Expand"}</span>
        </button>
      </h3>
      {open ? (
        <div className="csbk-accordion__body" id={panelId} role="region" aria-labelledby={buttonId}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function CasebookSidebar({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="csbk-sidebar" aria-label={title}>
      <div className="csbk-sidebar__header">{title}</div>
      <div className="csbk-sidebar__body">{children}</div>
    </aside>
  );
}

export type CasebookAction = {
  label: string;
  onClick?: () => void;
  href?: string;
  primary?: boolean;
  disabled?: boolean;
};

export function CasebookActionBar({ actions }: { actions: CasebookAction[] }) {
  return (
    <div className="csbk-action-bar">
      {actions.map((action) => {
        const className = action.primary
          ? "csbk-action-bar__btn csbk-action-bar__btn--primary"
          : "csbk-action-bar__btn";
        if (action.href) {
          return (
            <a
              key={action.label}
              href={action.href}
              className={className}
              aria-disabled={action.disabled || undefined}
              onClick={
                action.disabled
                  ? (event) => event.preventDefault()
                  : action.onClick
                    ? (event) => {
                        event.preventDefault();
                        action.onClick?.();
                      }
                    : undefined
              }
            >
              {action.label}
            </a>
          );
        }
        return (
          <button
            key={action.label}
            type="button"
            className={className}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

export function CasebookSplit({
  main,
  sidebar,
}: {
  main: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <div className="csbk-split">
      <div className="csbk-split__main">{main}</div>
      <div className="csbk-split__side">{sidebar}</div>
    </div>
  );
}

export function CasebookMetaRow({ children }: { children: ReactNode }) {
  return <p className="csbk-meta-row">{children}</p>;
}

export function CasebookDl({
  rows,
}: {
  rows: Array<{ key: string; value: ReactNode }>;
}) {
  return (
    <dl className="csbk-dl">
      {rows.map((row) => (
        <div key={row.key} className="csbk-dl__row">
          <dt className="csbk-dl__key">{row.key}</dt>
          <dd className="csbk-dl__value">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
