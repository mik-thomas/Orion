# frozen_string_literal: true

require "test_helper"

class OrionPiiAnonymizerTest < ActiveSupport::TestCase
  test "same magistrate id always yields the same fake identity" do
    first = Orion::PiiAnonymizer.for_magistrate(magistrates(:alice))
    second = Orion::PiiAnonymizer.for_magistrate(magistrates(:alice))

    assert_equal first, second
    assert_match(/\ADEMO-[0-9A-F]{4}\z/, first["reference_code"])
    assert_includes first["email"], "@demo.orion.local"
  end

  test "different magistrates get different identities" do
    alice = Orion::PiiAnonymizer.for_magistrate(magistrates(:alice))
    bob = Orion::PiiAnonymizer.for_magistrate(magistrates(:bob))

    refute_equal alice["display_name"], bob["display_name"]
    refute_equal alice["reference_code"], bob["reference_code"]
  end
end
