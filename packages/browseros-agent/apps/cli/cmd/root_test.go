package cmd

import "testing"

func TestCommandName(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want string
	}{
		{"empty args", nil, "unknown"},
		{"known command", []string{"health"}, "browseros-cli health"},
		{"unknown command", []string{"nonexistent"}, "unknown"},
		{"subcommand", []string{"bookmark", "search"}, "browseros-cli bookmark search"},
		{"known with extra args", []string{"snap", "--enhanced"}, "browseros-cli snap"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := commandName(tt.args)
			if got != tt.want {
				t.Errorf("commandName(%v) = %q, want %q", tt.args, got, tt.want)
			}
		})
	}
}
