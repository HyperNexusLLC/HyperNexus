package tools

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// MemoryVault MCP tool handlers
// These handlers implement a simple file-based memory vault system
// where memories are stored as