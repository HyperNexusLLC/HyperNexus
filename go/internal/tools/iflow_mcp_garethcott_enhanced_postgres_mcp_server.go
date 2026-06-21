package tools

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

// Required for PostgreSQL driver
)

func HandleQuery(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	connStr, _ :=getString(args, "connection_string")
	query, _ :=getString(args, "query")

	if connStr == "" || query == "" {
		return err("connection_string and query are required")
}

	db, e := sql.Open("postgres", connStr)
	if e != nil {
		return err(fmt.Sprintf("failed to connect to database: %v", e))
}

	defer db.Close()

	rows, e := db.Query(query)
	if e != nil {
		return err(fmt.Sprintf("query failed: %v", e))
}

	defer rows.Close()

	columns, e := rows.Columns()
	if e != nil {
		return err(fmt.Sprintf("failed to get columns: %v", e))
}

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if e := rows.Scan(valuePtrs...); e != nil {
			return err(fmt.Sprintf("scan failed: %v", e))
}

		row := make(map[string]interface{})
		for i, col := range columns {
			var val interface{}
			if values[i] != nil {
				val = values[i]
			}
			row[col] = val
		}
		results = append(results, row)

	if len(results) == 0 {
		return ok("No results found")
}

	return ok(fmt.Sprintf("Query results:\n%v", results))
}

}

func HandleExecute(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	connStr, _ :=getString(args, "connection_string")
	command, _ :=getString(args, "command")

	if connStr == "" || command == "" {
		return err("connection_string and command are required")
}

	db, e := sql.Open("postgres", connStr)
	if e != nil {
		return err(fmt.Sprintf("failed to connect to database: %v", e))
}

	defer db.Close()

	result, e := db.Exec(command)
	if e != nil {
		return err(fmt.Sprintf("command failed: %v", e))
}

	rowsAffected, e := result.RowsAffected()
	if e != nil {
		return err(fmt.Sprintf("failed to get rows affected: %v", e))
}

	return ok(fmt.Sprintf("Command executed successfully. Rows affected: %d", rowsAffected))
}

func HandleTableInfo(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	connStr, _ :=getString(args, "connection_string")
	tableName, _ :=getString(args, "table_name")

	if connStr == "" || tableName == "" {
		return err("connection_string and table_name are required")
}

	db, e := sql.Open("postgres", connStr)
	if e != nil {
		return err(fmt.Sprintf("failed to connect to database: %v", e))
}

	defer db.Close()

	query := fmt.Sprintf(`
		SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
		FROM information_schema.columns
		WHERE table_name = '%s'`, tableName)

	rows, e := db.Query(query)
	if e != nil {
		return err(fmt.Sprintf("query failed: %v", e))
}

	defer rows.Close()

	columns, e := rows.Columns()
	if e != nil {
		return err(fmt.Sprintf("failed to get columns: %v", e))
}

	var results []map[string]interface{}
	for rows.Next() {
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		if e := rows.Scan(valuePtrs...); e != nil {
			return err(fmt.Sprintf("scan failed: %v", e))
}

		row := make(map[string]interface{})
		for i, col := range columns {
			var val interface{}
			if values[i] != nil {
				val = values[i]
			}
			row[col] = val
		}
		results = append(results, row)

	if len(results) == 0 {
		return ok(fmt.Sprintf("No information found for table %s", tableName))
}

	return ok(fmt.Sprintf("Table information for %s:\n%v", tableName, results))
}

}

func HandleBackup(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	connStr, _ :=getString(args, "connection_string")
	backupPath, _ :=getString(args, "backup_path")

	if connStr == "" || backupPath == "" {
		return err("connection_string and backup_path are required")
}

	// Extract connection details from connection string
	conn, e := sql.Open("postgres", connStr)
	if e != nil {
		return err(fmt.Sprintf("failed to parse connection string: %v", e))
}

	defer conn.Close()

	var dbName string
e = conn.QueryRow("SELECT current_database()").Scan(&dbName)
	if e != nil {
		return err(fmt.Sprintf("failed to get database name: %v", e))
}

	// Extract host, port, user, password from connection string
	// This is a simplified approach; in production, use a proper parser
	parts := strings.Split(connStr, " ")
	var host, port, user, password string
	for _, part := range parts {
		if strings.HasPrefix(part, "host=") {
			host = strings.TrimPrefix(part, "host=")
		} else if strings.HasPrefix(part, "port=") {
			port = strings.TrimPrefix(part, "port=")
		} else if strings.HasPrefix(part, "user=") {
			user = strings.TrimPrefix(part, "user=")
		} else if strings.HasPrefix(part, "password=") {
			password = strings.TrimPrefix(part, "password=")

	}

	// Construct pg_dump command
	cmd := fmt.Sprintf("pg_dump -h %s -p %s -U %s -d %s -f %s",
		host, port, user, dbName, backupPath)

	// In a real implementation, you would execute this command
	// For this example, we'll just return the command that would be executed
	return ok(fmt.Sprintf("Backup command:\n%s\nNote: This is the command that would be executed. Actual execution is not implemented in this example.", cmd))
}

}

func HandleRestore(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	connStr, _ :=getString(args, "connection_string")
	backupPath, _ :=getString(args, "backup_path")

	if connStr == "" || backupPath == "" {
		return err("connection_string and backup_path are required")
}

	// Extract connection details from connection string
	conn, e := sql.Open("postgres", connStr)
	if e != nil {
		return err(fmt.Sprintf("failed to parse connection string: %v", e))
}

	defer conn.Close()

	var dbName string
e = conn.QueryRow("SELECT current_database()").Scan(&dbName)
	if e != nil {
		return err(fmt.Sprintf("failed to get database name: %v", e))
}

	// Extract host, port, user, password from connection string
	parts := strings.Split(connStr, " ")
	var host, port, user, password string
	for _, part := range parts {
		if strings.HasPrefix(part, "host=") {
			host = strings.TrimPrefix(part, "host=")
		} else if strings.HasPrefix(part, "port=") {
			port = strings.TrimPrefix(part, "port=")
		} else if strings.HasPrefix(part, "user=") {
			user = strings.TrimPrefix(part, "user=")
		} else if strings.HasPrefix(part, "password=") {
			password = strings.TrimPrefix(part, "password=")

	}

	// Construct pg_restore command
	cmd := fmt.Sprintf("pg_restore -h %s -p %s -U %s -d %s -f %s",
		host, port, user, dbName, backupPath)

	// In a real implementation, you would execute this command
	// For this example, we'll just return the command that would be executed
	return ok(fmt.Sprintf("Restore command:\n%s\nNote: This is the command that would be executed. Actual execution is not implemented in this example.", cmd))
}

}

func HandleVersion(ctx context.Context, args map[string]interface{}) (ToolResponse, error) {
	connStr, _ :=getString(args, "connection_string")

	if connStr == "" {
		return err("connection_string is required")
}

	db, e := sql.Open("postgres", connStr)
	if e != nil {
		return err(fmt.Sprintf("failed to connect to database: %v", e))
}

	defer db.Close()

	var version string
e = db.QueryRow("SELECT version()").Scan(&version)
	if e != nil {
		return err(fmt.Sprintf("failed to get version: %v", e))
}

	return ok(fmt.Sprintf("PostgreSQL version: %s", version))
}