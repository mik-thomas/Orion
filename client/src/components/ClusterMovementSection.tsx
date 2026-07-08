import { MagistrateLink } from "./MagistrateLink";
import type { HomeCourtMovementReport } from "../types/domain";

interface ClusterMovementSectionProps {
  report: HomeCourtMovementReport;
}

function cellClass(homeCourthouse: string, sittingCourthouse: string, count: number, maxOffDiagonal: number) {
  if (count === 0) return "";
  if (homeCourthouse === sittingCourthouse) return "govuk-!-font-weight-bold";
  if (maxOffDiagonal > 0 && count >= maxOffDiagonal * 0.5) return "govuk-tag govuk-tag--yellow";
  return "";
}

export function ClusterMovementSection({ report }: ClusterMovementSectionProps) {
  const { summary, courthouses, by_home_court, matrix, flags } = report;

  const maxOffDiagonal = matrix.reduce((max, row) => {
    const rowMax = courthouses.reduce((innerMax, courthouse) => {
      if (courthouse === row.home_courthouse) return innerMax;
      return Math.max(innerMax, row.cells[courthouse] ?? 0);
    }, 0);
    return Math.max(max, rowMax);
  }, 0);

  const barnsleyZero = flags.zero_completed_sittings.filter((row) => row.home_courthouse === "Barnsley");

  return (
    <section className="govuk-!-margin-top-6">
      <h2 className="govuk-heading-l">Movement across the cluster</h2>
      <p className="govuk-body">
        Completed sittings in the current fiscal year, grouped by magistrate home court and actual sitting
        location. Diagonal cells are sittings at home; off-diagonal cells are away sittings.
      </p>

      <div className="govuk-grid-row govuk-!-margin-bottom-6">
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Completed sittings</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">{summary.total_completed_sittings}</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">At home court</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">{summary.completed_at_home}</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Away from home</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">{summary.completed_away}</p>
        </div>
        <div className="govuk-grid-column-one-quarter">
          <p className="govuk-body govuk-!-font-weight-bold govuk-!-margin-bottom-1">Away %</p>
          <p className="govuk-heading-m govuk-!-margin-top-0">{summary.away_pct}%</p>
        </div>
      </div>

      {summary.magistrates_missing_home_court > 0 && (
        <p className="govuk-body govuk-hint govuk-!-margin-bottom-4">
          {summary.magistrates_missing_home_court} magistrate
          {summary.magistrates_missing_home_court === 1 ? "" : "s"} without a recorded home court are excluded
          from this analysis.
        </p>
      )}

      <h3 className="govuk-heading-m">Home court summary</h3>
      {by_home_court.length === 0 ? (
        <p className="govuk-body">No movement data yet.</p>
      ) : (
        <table className="govuk-table govuk-!-margin-bottom-6">
          <thead className="govuk-table__head">
            <tr className="govuk-table__row">
              <th scope="col" className="govuk-table__header">
                Home court
              </th>
              <th scope="col" className="govuk-table__header">
                Magistrates
              </th>
              <th scope="col" className="govuk-table__header">
                At home
              </th>
              <th scope="col" className="govuk-table__header">
                Away
              </th>
              <th scope="col" className="govuk-table__header">
                Total
              </th>
              <th scope="col" className="govuk-table__header">
                Away %
              </th>
            </tr>
          </thead>
          <tbody className="govuk-table__body">
            {by_home_court.map((row) => (
              <tr key={row.home_courthouse} className="govuk-table__row">
                <th scope="row" className="govuk-table__header">
                  {row.home_courthouse}
                </th>
                <td className="govuk-table__cell">{row.magistrates}</td>
                <td className="govuk-table__cell">{row.completed_at_home}</td>
                <td className="govuk-table__cell">{row.completed_away}</td>
                <td className="govuk-table__cell">{row.completed_total}</td>
                <td className="govuk-table__cell">{row.away_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 className="govuk-heading-m">Movement matrix</h3>
      <p className="govuk-body govuk-hint">Rows = magistrate home court. Columns = where they sat.</p>
      {matrix.length === 0 ? (
        <p className="govuk-body">No movement data yet.</p>
      ) : (
        <div className="govuk-!-margin-bottom-6" style={{ overflowX: "auto" }}>
          <table className="govuk-table">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  Home → Sitting
                </th>
                {courthouses.map((courthouse) => (
                  <th key={courthouse} scope="col" className="govuk-table__header">
                    {courthouse}
                  </th>
                ))}
                <th scope="col" className="govuk-table__header">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {matrix.map((row) => (
                <tr key={row.home_courthouse} className="govuk-table__row">
                  <th scope="row" className="govuk-table__header">
                    {row.home_courthouse}
                  </th>
                  {courthouses.map((courthouse) => {
                    const count = row.cells[courthouse] ?? 0;
                    const highlight = cellClass(row.home_courthouse, courthouse, count, maxOffDiagonal);
                    return (
                      <td key={courthouse} className="govuk-table__cell">
                        {highlight ? <span className={highlight}>{count}</span> : count}
                      </td>
                    );
                  })}
                  <td className="govuk-table__cell govuk-!-font-weight-bold">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {flags.sheffield_at_barnsley.length > 0 && (
        <>
          <h3 className="govuk-heading-m">Sheffield magistrates sitting at Barnsley</h3>
          <p className="govuk-body govuk-hint">
            Flagged when 2+ completed sittings at Barnsley, or 30%+ of completed sittings at Barnsley.
          </p>
          <table className="govuk-table govuk-!-margin-bottom-6">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  Magistrate
                </th>
                <th scope="col" className="govuk-table__header">
                  Barnsley sittings
                </th>
                <th scope="col" className="govuk-table__header">
                  Total completed
                </th>
                <th scope="col" className="govuk-table__header">
                  Barnsley %
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {flags.sheffield_at_barnsley.map((row) => (
                <tr key={row.magistrate_id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <MagistrateLink id={row.magistrate_id} name={row.magistrate} />
                  </td>
                  <td className="govuk-table__cell">
                    <strong className="govuk-tag govuk-tag--yellow">{row.barnsley_sittings}</strong>
                  </td>
                  <td className="govuk-table__cell">{row.total_completed}</td>
                  <td className="govuk-table__cell">{row.barnsley_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {flags.zero_completed_sittings.length > 0 && (
        <>
          <h3 className="govuk-heading-m">Active magistrates with no completed sittings</h3>
          {barnsleyZero.length > 0 && (
            <p className="govuk-body">
              <strong className="govuk-tag govuk-tag--red">{barnsleyZero.length}</strong> Barnsley-home
              magistrate{barnsleyZero.length === 1 ? "" : "s"} with zero completed sittings this fiscal year.
            </p>
          )}
          <table className="govuk-table">
            <thead className="govuk-table__head">
              <tr className="govuk-table__row">
                <th scope="col" className="govuk-table__header">
                  Magistrate
                </th>
                <th scope="col" className="govuk-table__header">
                  Home court
                </th>
              </tr>
            </thead>
            <tbody className="govuk-table__body">
              {flags.zero_completed_sittings.map((row) => (
                <tr key={row.magistrate_id} className="govuk-table__row">
                  <td className="govuk-table__cell">
                    <MagistrateLink id={row.magistrate_id} name={row.magistrate} />
                  </td>
                  <td className="govuk-table__cell">
                    {row.home_courthouse === "Barnsley" ? (
                      <strong className="govuk-tag govuk-tag--red">{row.home_courthouse}</strong>
                    ) : (
                      row.home_courthouse
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
