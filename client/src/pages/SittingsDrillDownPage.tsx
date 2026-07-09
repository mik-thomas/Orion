import { useEffect, useId, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { listSittingsDrillDownFromSearch } from "../api/sittings";
import { ApiError } from "../api/http";
import { MagistrateLink } from "../components/MagistrateLink";
import { PeriodFilter } from "../components/PeriodFilter";
import { DashboardSection } from "../components/DashboardSection";
import { DonutOrBarChart } from "../components/charts/DonutOrBarChart";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { SittingPositionCell } from "../lib/sittingPosition";
import { SittingStatusCell } from "../lib/sittingStatus";
import { useRole } from "../context/RoleContext";
import {
  periodFilterFromResponse,
  periodFilterLabel,
  type PeriodFilterState,
} from "../lib/periodFilter";
import {
  parseSittingsDrillDownSearch,
  sittingsDrillDownHeading,
  sittingsDrillDownPath,
  type SittingsDrillDownFilters,
} from "../lib/sittingsDrillDown";
import type { SittingsDrillDownResponse } from "../types/domain";

function filtersFromParams(search: string): SittingsDrillDownFilters & PeriodFilterState {
  return parseSittingsDrillDownSearch(search);
}

export function SittingsDrillDownPage() {
  const { role } = useRole();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const search = searchParams.toString();

  const parsed = useMemo(() => filtersFromParams(search ? `?${search}` : ""), [search]);
  const { mode, fiscalYear, quarter, ...filters } = parsed;
  const periodFilter: PeriodFilterState = { mode, fiscalYear, quarter };

  const [data, setData] = useState<SittingsDrillDownResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const statusSummaryId = useId();
  const locationSummaryId = useId();

  useEffect(() => {
    setLoading(true);
    listSittingsDrillDownFromSearch(search ? `?${search}` : "")
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load sittings");
      })
      .finally(() => setLoading(false));
  }, [search, role]);

  function handlePeriodChange(next: PeriodFilterState) {
    navigate(sittingsDrillDownPath(filters, next));
  }

  function goToPage(page: number) {
    navigate(sittingsDrillDownPath({ ...filters, page }, periodFilter));
  }

  const heading = sittingsDrillDownHeading(filters);
  const periodLabel = data?.period.label ?? periodFilterLabel(periodFilter);

  return (
    <>
      <nav className="govuk-breadcrumbs" aria-label="Breadcrumb">
        <ol className="govuk-breadcrumbs__list">
          <li className="govuk-breadcrumbs__list-item">
            <Link to="/" className="govuk-breadcrumbs__link">
              Dashboard
            </Link>
          </li>
          <li className="govuk-breadcrumbs__list-item" aria-current="page">
            Sittings
          </li>
        </ol>
      </nav>

      <h1 className="govuk-heading-xl">{heading}</h1>
      <p className="govuk-body-l">
        {periodLabel}
        {data ? ` — ${data.pagination.total_count} sitting${data.pagination.total_count === 1 ? "" : "s"}` : ""}
      </p>

      <PeriodFilter
        value={data ? periodFilterFromResponse(data.period) : periodFilter}
        onChange={handlePeriodChange}
        availableYears={data?.available_fiscal_years ?? []}
      />

      {error && (
        <div className="govuk-error-summary" role="alert">
          <h2 className="govuk-error-summary__title">There is a problem</h2>
          <div className="govuk-error-summary__body">
            <p className="govuk-body">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="govuk-body">Loading sittings…</p>
      ) : data ? (
        <>
          {data.summary ? (
            <div className="orion-profile-charts-grid orion-profile-charts-grid--two govuk-!-margin-bottom-6">
              <DashboardSection title="Status breakdown" headingLevel={2}>
                <DonutOrBarChart
                  totals={data.summary.totals}
                  summaryContext={periodLabel}
                  summaryId={statusSummaryId}
                  variant="donut"
                />
              </DashboardSection>
              <DashboardSection title="By location" headingLevel={2}>
                <HorizontalBarChart
                  rows={data.summary.by_courthouse.map((row) => ({
                    key: row.courthouse,
                    label: row.courthouse,
                    value: row.sittings,
                  }))}
                  emptyMessage="No location data for these filters."
                  summaryContext={periodLabel}
                  summaryId={locationSummaryId}
                />
              </DashboardSection>
            </div>
          ) : null}

          {data.sittings.length === 0 ? (
            <p className="govuk-body">No sittings match these filters.</p>
          ) : (
            <>
              <table className="govuk-table">
                <caption className="govuk-table__caption govuk-table__caption--m">{heading}</caption>
                <thead className="govuk-table__head">
                  <tr className="govuk-table__row">
                    <th scope="col" className="govuk-table__header">
                      Date
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Session
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Magistrate
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Location
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Court room
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Business type
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Court type
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Role
                    </th>
                    <th scope="col" className="govuk-table__header">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="govuk-table__body">
                  {data.sittings.map((sitting) => (
                    <tr key={sitting.id} className="govuk-table__row">
                      <td className="govuk-table__cell">{sitting.session_date}</td>
                      <td className="govuk-table__cell">{sitting.session ?? "—"}</td>
                      <td className="govuk-table__cell">
                        <MagistrateLink id={sitting.magistrate_id} name={sitting.display_name} />
                      </td>
                      <td className="govuk-table__cell">
                        {sitting.courthouse}
                        {sitting.away_from_home ? " (away)" : ""}
                      </td>
                      <td className="govuk-table__cell">{sitting.court_room ?? "—"}</td>
                      <td className="govuk-table__cell">{sitting.sitting_type}</td>
                      <td className="govuk-table__cell">{sitting.court_type ?? "—"}</td>
                      <td className="govuk-table__cell">
                        <SittingPositionCell sittingPosition={sitting.sitting_position} />
                      </td>
                      <td className="govuk-table__cell">
                        <SittingStatusCell sitting={sitting} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.pagination.total_pages > 1 && (
                <nav className="govuk-pagination" role="navigation" aria-label="Pagination">
                  <ul className="govuk-pagination__list">
                    {data.pagination.page > 1 && (
                      <li className="govuk-pagination__item govuk-pagination__item--prev">
                        <button
                          type="button"
                          className="govuk-link govuk-pagination__link"
                          onClick={() => goToPage(data.pagination.page - 1)}
                        >
                          Previous<span className="govuk-visually-hidden"> page</span>
                        </button>
                      </li>
                    )}
                    <li className="govuk-pagination__item govuk-pagination__item--active">
                      Page {data.pagination.page} of {data.pagination.total_pages}
                    </li>
                    {data.pagination.page < data.pagination.total_pages && (
                      <li className="govuk-pagination__item govuk-pagination__item--next">
                        <button
                          type="button"
                          className="govuk-link govuk-pagination__link"
                          onClick={() => goToPage(data.pagination.page + 1)}
                        >
                          Next<span className="govuk-visually-hidden"> page</span>
                        </button>
                      </li>
                    )}
                  </ul>
                </nav>
              )}
            </>
          )}
        </>
      ) : null}
    </>
  );
}
