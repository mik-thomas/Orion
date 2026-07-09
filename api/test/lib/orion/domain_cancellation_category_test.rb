# frozen_string_literal: true

require "test_helper"

class OrionDomainCancellationCategoryTest < ActiveSupport::TestCase
  test "maps district judge cancellations from reason text" do
    assert_equal "district_judge", Orion::Domain.cancellation_category(
      reason: "Q Court requires a DJ",
      action_by: "Andrew Sharp"
    )
  end

  test "maps magistrate vacated sittings" do
    assert_equal "magistrate", Orion::Domain.cancellation_category(
      reason: "Holiday",
      action_by: "Vacated by Magistrate"
    )
  end

  test "maps HMCTS removals from rota administrator action" do
    assert_equal "hmcts", Orion::Domain.cancellation_category(
      reason: "Professional-work-commitment",
      action_by: "Removed by RA"
    )
  end

  test "maps HMCTS staff names on cancelled sittings" do
    assert_equal "hmcts", Orion::Domain.cancellation_category(
      reason: "B No Work Listed",
      action_by: "Debbie Jones"
    )
  end

  test "returns nil when reason and actor are blank" do
    assert_nil Orion::Domain.cancellation_category(reason: "", action_by: "")
  end
end
