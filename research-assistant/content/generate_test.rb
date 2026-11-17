# frozen_string_literal: true

require "minitest/autorun"
require_relative "generate"

class ResearchKnowledgeTest < Minitest::Test
  def setup
    @config, @author, @data = ResearchKnowledge.sources
  end

  def result
    ResearchKnowledge.render(@config, @author, @data)
  end

  def test_topic_contract_and_reproducibility
    topics = JSON.parse(result)
    assert_equal %w[research publications projects awards-news teaching cv contact], topics.keys
    assert topics.values.all? { |v| v.is_a?(String) && !v.strip.empty? }
    assert_equal result, ResearchKnowledge.render(*ResearchKnowledge.sources)
  end

  def test_only_allowlisted_fields_contribute
    original = result
    @author["notes"] = "unlisted value"
    @config["unlisted"] = "unlisted value"
    @data.each_value { |rows| rows.each { |row| row["citation_count"] = 765 } }
    @data["news"] << { "date" => "TODO", "text" => "unconfirmed milestone" }
    @data["teaching"].first["semester"] = "TBD"
    assert_equal original, result
  end

  def test_review_status_is_not_promoted_even_with_a_doi
    row = { "status" => "Under Review", "title" => "A study", "authors" => "A. Researcher",
            "venue" => "A journal", "year" => 2026, "doi" => "10.1234/example" }
    line = ResearchKnowledge.publication(row)
    assert_match(/\AUnder review at A journal/, line)
    refute_match(/published/i, line)
    assert_raises(ArgumentError) { ResearchKnowledge.publication(row.reject { |k, _| %w[status doi].include?(k) }) }
  end

  def test_cv_is_only_a_public_link
    assert_includes JSON.parse(result).fetch("cv"), @config.fetch("url") + @author.fetch("cv")
    @author["cv"] = "../unlisted.pdf"
    assert_raises(ArgumentError) { result }
  end

  def test_prose_fails_closed_on_placeholders_paths_and_counts
    ["TODO: add later", "see ../draft", "see images/draft.png", "cited by 40", "12 citations"].each do |value|
      assert_raises(ArgumentError) { ResearchKnowledge.prose(value) }
    end
  end
end
