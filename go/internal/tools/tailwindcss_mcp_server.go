package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const (
	tailwindDocsURL = "https://tailwindcss.com/docs"
)

var http.DefaultClient = http.DefaultClient

func HandleGetTailwindUtilities(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	category, _ :=getString(args, "category")
	property, _ :=getString(args, "property")
	search, _ :=getString(args, "search")

	// In a real implementation, we would fetch from TailwindCSS docs or a local cache
	// For this example, we'll return some mock data
	utilities := []map[string]string{
		{"name": "p-4", "category": "spacing", "property": "padding", "description": "Padding of 1rem"},
		{"name": "text-blue-500", "category": "colors", "property": "color", "description": "Blue text color"},
		{"name": "flex", "category": "layout", "property": "display", "description": "Flexbox display"},
	}

	// Filter utilities based on parameters
	filtered := make([]map[string]string, 0)
	for _, util := range utilities {
		match := true
		if category != "" && util["category"] != category {
			match = false
		}
		if property != "" && util["property"] != property {
			match = false
		}
		if search != "" && !strings.Contains(util["name"], search) && !strings.Contains(util["description"], search) {
			match = false
		}
		if match {
			filtered = append(filtered, util)

	}

	if len(filtered) == 0 {
		return err("No utilities found matching the criteria")
}

	// Format the response
	var response strings.Builder
	response.WriteString("TailwindCSS Utilities:\n")
	for _, util := range filtered {
		response.WriteString(fmt.Sprintf("- %s (%s): %s\n", util["name"], util["category"], util["description"]))

	return ok(response.String())
}

}
}

func HandleGetTailwindColors(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	colorName, _ :=getString(args, "colorName")
	includeShades, _ :=getBool(args, "includeShades", true)

	// In a real implementation, we would fetch from TailwindCSS docs or a local cache
	// For this example, we'll return some mock data
	colors := map[string][]string{
		"blue": {"#3B82F6", "#1D4ED8", "#1E40AF", "#1E40AF", "#1E40AF", "#1E40AF", "#1E40AF", "#1E40AF", "#1E40AF", "#1E40AF", "#1E40AF"},
		"red": {"#EF4444", "#DC2626", "#B91C1C", "#B91C1C", "#B91C1C", "#B91C1C", "#B91C1C", "#B91C1C", "#B91C1C", "#B91C1C", "#B91C1C"},
	}

	var response strings.Builder
	if colorName != "" {
		// Return specific color
		shades, exists := colors[colorName]
		if !exists {
			return err(fmt.Sprintf("Color '%s' not found", colorName))
}

		response.WriteString(fmt.Sprintf("Color: %s\n", colorName))
		if includeShades {
			response.WriteString("Shades:\n")
			for i, shade := range shades {
				response.WriteString(fmt.Sprintf("- Shade %d: %s\n", i+1, shade))

		}
	} else {
		// Return all colors
		response.WriteString("Available Colors:\n")
		for name := range colors {
			response.WriteString(fmt.Sprintf("- %s\n", name))

	}

	return ok(response.String())
}

}
}

func HandleSearchTailwindDocs(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	query, _ :=getString(args, "query")
	if query == "" {
		return err("Search query is required")
}

	category, _ :=getString(args, "category")
	limit, _ :=getInt(args, "limit", 10)

	// In a real implementation, we would fetch from TailwindCSS docs
	// For this example, we'll return some mock data
	results := []map[string]string{
		{"title": "Installation", "url": "/docs/installation", "description": "How to install TailwindCSS"},
		{"title": "Utility Classes", "url": "/docs/utility-classes", "description": "Overview of utility classes"},
		{"title": "Responsive Design", "url": "/docs/responsive-design", "description": "Responsive utility classes"},
	}

	// Filter by category if provided
	if category != "" {
		filtered := make([]map[string]string, 0)
		for _, result := range results {
			if strings.Contains(result["title"], category) || strings.Contains(result["description"], category) {
				filtered = append(filtered, result)

		}
		results = filtered
	}

	// Limit results
	if len(results) > limit {
		results = results[:limit]
	}

	if len(results) == 0 {
		return err("No documentation found matching the query")
}

	// Format the response
	var response strings.Builder
	response.WriteString(fmt.Sprintf("Search results for '%s':\n", query))
	for _, result := range results {
		response.WriteString(fmt.Sprintf("- %s: %s\n  %s\n", result["title"], result["description"], result["url"]))

	return ok(response.String())
}

}
}

func HandleInstallTailwind(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	framework, _ :=getString(args, "framework")
	if framework == "" {
		return err("Framework is required")
}

	packageManager, _ :=getString(args, "packageManager")
	if packageManager == "" {
		packageManager = "npm"
	}

	includeTypescript, _ :=getBool(args, "includeTypescript", false)

	// In a real implementation, we would have more comprehensive installation commands
	// For this example, we'll return some basic commands
	var response strings.Builder
	response.WriteString(fmt.Sprintf("Installation commands for %s using %s:\n", framework, packageManager))

	switch framework {
	case "react", "nextjs":
		response.WriteString(fmt.Sprintf("1. %s install tailwindcss postcss autoprefixer\n", packageManager))
		response.WriteString("2. npx tailwindcss init\n")
		response.WriteString("3. Configure tailwind.config.js\n")
		if includeTypescript {
			response.WriteString("4. Add TypeScript support\n")

	case "vue", "nuxt":
		response.WriteString(fmt.Sprintf("1. %s install tailwindcss postcss autoprefixer\n", packageManager))
		response.WriteString("2. npx tailwindcss init\n")
		response.WriteString("3. Configure tailwind.config.js for Vue\n")
	case "angular":
		response.WriteString(fmt.Sprintf("1. %s install tailwindcss postcss autoprefixer\n", packageManager))
		response.WriteString("2. npx tailwindcss init\n")
		response.WriteString("3. Configure tailwind.config.js for Angular\n")
	default:
		return err(fmt.Sprintf("Framework '%s' not supported", framework))
}

	return ok(response.String())
}

}

func HandleConvertCssToTailwind(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	css, _ :=getString(args, "css")
	if css == "" {
		return err("CSS input is required")
}

	mode, _ :=getString(args, "mode")
	if mode == "" {
		mode = "classes"
	}

	// In a real implementation, we would parse the CSS and convert to Tailwind classes
	// For this example, we'll return some mock conversions
	var response strings.Builder
	response.WriteString("Converted TailwindCSS:\n")

	switch mode {
	case "classes":
		response.WriteString("/* Converted to utility classes */\n")
		response.WriteString(".example {\n")
		response.WriteString("  p-4 bg-blue-500 text-white\n")
		response.WriteString("}\n")
	case "inline":
		response.WriteString("<div class=\"p-4 bg-blue-500 text-white\">\n")
		response.WriteString("  <!-- Inline converted classes -->\n")
		response.WriteString("</div>\n")
	case "component":
		response.WriteString("@apply p-4 bg-blue-500 text-white;\n")
		response.WriteString("/* Component with @apply directive */\n")
	default:
		return err(fmt.Sprintf("Mode '%s' not supported", mode))
}

	return ok(response.String())
}