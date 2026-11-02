$message = @'
Meta OAuth from Pi's Coding Harness Subscription is not available in Copilot.
Meta's terms restrict subscription credentials to their subscribed harness and
prohibit proxy access without Meta's written authorization.

To use HyperNexus with your Copilot account, run:
  .\addons\copilot\use-hypernexus.ps1

This launcher is intentionally disabled and does not read credentials or start
Copilot. A separate Meta Model API key and direct BYOK setup would be a
different billing and data-use arrangement.
'@

[Console]::Error.WriteLine($message)
exit 1
