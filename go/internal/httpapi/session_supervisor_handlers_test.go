package httpapi

import (
	"reflect"
	"testing"
)

func TestDefaultLocalSessionCommand(t *testing.T) {
	tests := []struct {
		name     string
		cliType  string
		args     []string
		wantCmd  string
		wantArgs []string
	}{
		{
			name:     "claude-code maps to installed claude executable",
			cliType:  "claude-code",
			wantCmd:  "claude",
			wantArgs: nil,
		},
		{
			name:     "claude-code preserves provided args",
			cliType:  "claude-code",
			args:     []string{"--resume"},
			wantCmd:  "claude",
			wantArgs: []string{"--resume"},
		},
		{
			name:     "factory-droid maps to droid",
			cliType:  "factory-droid",
			wantCmd:  "droid",
			wantArgs: nil,
		},
		{
			name:     "unknown cli type passes through",
			cliType:  "codex",
			wantCmd:  "codex",
			wantArgs: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotCmd, gotArgs := defaultLocalSessionCommand(tt.cliType, tt.args)
			if gotCmd != tt.wantCmd {
				t.Errorf("command = %q, want %q", gotCmd, tt.wantCmd)
			}
			if tt.wantArgs == nil {
				if len(gotArgs) != 0 {
					t.Errorf("args = %v, want none", gotArgs)
				}
			} else if !reflect.DeepEqual(gotArgs, tt.wantArgs) {
				t.Errorf("args = %v, want %v", gotArgs, tt.wantArgs)
			}
		})
	}
}
