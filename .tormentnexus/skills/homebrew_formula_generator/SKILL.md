---
name: homebrew-formula-generator
description: Generate Homebrew formula for CLI distribution on macOS and Linux.
source: ~\.a5c\process-library\babysitter-repo\library\specializations\cli-mcp-development\skills\homebrew-formula-generator\SKILL.md
category: process-library
date: 2026-06-14T07:33:25.339711

---



# Homebrew Formula Generator

Generate Homebrew formula for CLI distribution.

## Generated Patterns

```ruby
class Myapp < Formula
  desc "My CLI application"
  homepage "https://github.com/myuser/myapp"
  url "https://github.com/myuser/myapp/releases/download/v1.0.0/myapp-1.0.0.tar.gz"
  sha256 "abc123..."
  license "MIT"

  depends_on "node" => :build

  def install
    system "npm", "install", *std_npm_args
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    assert_match "myapp v#{version}", shell_output("#{bin}/myapp --version")
  end
end
```

## Target Processes

- package-manager-publishing
- cli-binary-distribution
