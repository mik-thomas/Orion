import { useId, useState, type ReactNode } from "react";

type ShowTableToggleProps = {
  children: ReactNode;
  table: ReactNode;
  tableCaption: string;
  hasData?: boolean;
};

export function ShowTableToggle({
  children,
  table,
  tableCaption,
  hasData = true,
}: ShowTableToggleProps) {
  const [showTable, setShowTable] = useState(false);
  const panelId = useId();

  if (!hasData) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <p className="govuk-!-margin-top-3 govuk-!-margin-bottom-0">
        <button
          type="button"
          className="govuk-link"
          aria-expanded={showTable}
          aria-controls={panelId}
          onClick={() => setShowTable((current) => !current)}
        >
          {showTable ? "Hide table" : "Show table"}
        </button>
      </p>
      {showTable ? (
        <div id={panelId} className="govuk-!-margin-top-3">
          <table className="govuk-table">
            <caption className="govuk-table__caption govuk-table__caption--m">{tableCaption}</caption>
            {table}
          </table>
        </div>
      ) : null}
    </>
  );
}
