# frozen_string_literal: true

require "json"
require "yaml"

module ResearchKnowledge
  extend self

  ROOT = File.expand_path("../..", __dir__)
  OUTPUT = File.join(ROOT, "research-assistant", "src", "knowledge.json")
  FIELDS = {
    "research" => %w[title description keywords],
    "publications" => %w[status title authors venue year doi],
    "projects" => %w[title status summary methods],
    "news" => %w[date text],
    "teaching" => %w[course role institution semester]
  }.freeze

  def sources
    # Fixed inputs only. In particular, the public CV URL is never opened.
    config = YAML.safe_load_file(File.join(ROOT, "_config.yml"))
    author = config.fetch("author").slice(*%w[name bio employer location email cv github linkedin orcid])
    data = FIELDS.to_h do |name, fields|
      rows = YAML.safe_load_file(File.join(ROOT, "_data", "#{name}.yml"))
      [name, rows.map { |row| row.slice(*fields) }]
    end
    [config.slice("url", "google_scholar_id"), author, data]
  end

  def checked(value, pattern, field)
    raise ArgumentError, "Missing or invalid public #{field}" unless value.is_a?(String) && pattern.match?(value)
    value
  end

  def prose(value)
    raise ArgumentError, "Missing public text" unless value.is_a?(String) && !value.strip.empty?
    if value.match?(%r{\b(?:TODO|TBD|FIXME)\b|://|\\|(?:\A|\s)(?:/|~/|\.\.?/|assets/|images/)\w|-----BEGIN |\b(?:gh[pousr]_|github_pat_|sk-)[a-zA-Z0-9_-]{12,}|\b(?:\d[\d,]*\s+citations?|cited\s+by\s+\d+)\b}i)
      raise ArgumentError, "Non-public or placeholder value in public text"
    end
    value.gsub("**", "").split.join(" ")
  end

  def publication(row)
    title, authors, venue = %w[title authors venue].map { |key| prose(row.fetch(key)) }
    year = checked(row.fetch("year").to_s, /\A\d{4}\z/, "publication year")
    status = row["status"]&.strip
    doi = row["doi"]
    doi = checked(doi, %r{\A10\.\d{4,9}/[-._;()/:a-z0-9]+\z}i, "DOI") if doi
    status = "Published" if status.to_s.empty? && doi
    status = prose(status)
    listing = if status.casecmp?("under review")
                "Under review at #{venue} (#{year})"
              else
                "#{status}: #{venue} (#{year})"
              end
    ["#{listing}. #{authors}. \"#{title}\"", ("https://doi.org/#{doi}" if doi)].compact.join(" ")
  end

  def render(config, author, data)
    name, role, employer, location = %w[name bio employer location].map { |key| prose(author.fetch(key)) }
    site = checked(config["url"], %r{\Ahttps://[a-z0-9-]+\.github\.io\z}, "site URL")
    cv = checked(author["cv"], %r{\A/assets/pdf/[a-zA-Z0-9_-]+\.pdf\z}, "CV URL")
    email = checked(author["email"], /\A[\w.+-]+@[\w.-]+\.[a-z]+\z/i, "email")
    scholar = checked(config["google_scholar_id"], /\A[a-zA-Z0-9_-]+\z/, "Scholar profile")
    orcid = checked(author["orcid"], %r{\Ahttps://orcid\.org/(?:\d{4}-){3}\d{3}[\dX]\z}, "ORCID profile")
    github, linkedin = %w[github linkedin].map do |key|
      checked(author[key], /\A[a-zA-Z0-9-]+\z/, "#{key} profile")
    end

    research = data.fetch("research").map do |row|
      terms = row.fetch("keywords").map { |word| prose(word) }.join(", ")
      "#{prose(row.fetch('title'))}: \"#{prose(row.fetch('description'))}\" Topics: #{terms}."
    end
    projects = data.fetch("projects").map do |row|
      "#{prose(row.fetch('title'))} (#{prose(row.fetch('status'))}). #{prose(row.fetch('summary'))} Methods: #{prose(row.fetch('methods'))}"
    end
    news = data.fetch("news").filter_map do |row|
      date = row["date"].to_s
      next unless date.match?(/\b\d{4}\b/) && !date.match?(/\bTODO\b/i)
      "#{prose(date)}: \"#{prose(row.fetch('text'))}\""
    end
    teaching = data.fetch("teaching").map do |row|
      course, position, institution = %w[course role institution].map { |key| prose(row.fetch(key)) }
      semester = row["semester"]
      semester = nil if semester.to_s.empty? || semester.match?(/\b(?:TODO|TBD)\b/i)
      "#{position}, #{course}, #{institution}#{", #{prose(semester)}" if semester}."
    end

    topics = {
      "research" => ["#{name} describes her research:", *research].join("\n"),
      "publications" => data.fetch("publications").map { |row| publication(row) }.join("\n"),
      "projects" => projects.join("\n"),
      "awards-news" => ["From #{name}'s public news:", *news].join("\n"),
      "teaching" => teaching.join("\n"),
      "cv" => "#{name}, #{role}, #{employer}. Download the public curriculum vitae (PDF): #{site}#{cv}",
      "contact" => "#{name}, #{role}, #{employer}, #{location}. Email: #{email}.\nGoogle Scholar: https://scholar.google.com/citations?user=#{scholar}\nORCID: #{orcid}\nGitHub: https://github.com/#{github}\nLinkedIn: https://www.linkedin.com/in/#{linkedin}"
    }
    JSON.pretty_generate(topics) + "\n"
  end
end

if $PROGRAM_NAME == __FILE__
  abort "Usage: ruby research-assistant/content/generate.rb --check | --write" unless [%w[--check], %w[--write]].include?(ARGV)
  bytes = ResearchKnowledge.render(*ResearchKnowledge.sources).b
  output = ResearchKnowledge::OUTPUT
  if ARGV == %w[--write]
    Dir.mkdir(File.dirname(output)) unless Dir.exist?(File.dirname(output))
    File.binwrite(output, bytes)
    puts "Regenerated knowledge.json."
  elsif File.file?(output) && File.binread(output).gsub("\r\n", "\n") == bytes
    puts "knowledge.json is current."
  else
    abort "knowledge.json is missing or stale. Run with --write to regenerate."
  end
end
