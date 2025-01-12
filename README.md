# Project Content Server

An MCP server that provides access to project files and their contents.

<a href="https://glama.ai/mcp/servers/qmqbqlz2c4"><img width="380" height="200" src="https://glama.ai/mcp/servers/qmqbqlz2c4/badge" alt="Project Content Server MCP server" /></a>

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Usage

Start the server:
```bash
node build/index.js
```

### API

#### latest_project_data

Get all files and their contents from a project directory.

**Parameters:**
- `projectPath` (string): Path to the project directory

**Example Request:**
```json
{
  "name": "latest_project_data",
  "arguments": {
    "projectPath": "/path/to/project"
  }
}
```

**Example Response:**
```json
{
  "file1.txt": "Contents of file1",
  "subdir/file2.js": "Contents of file2"
}
```

## Configuration

The server can be configured using environment variables:

- `PORT`: Port to run the server on (default: stdio)

## Error Handling

The server returns errors in the following format:
```json
{
  "content": [{
    "type": "text",
    "text": "Error message"
  }],
  "isError": true
}
```

Common errors include:
- Invalid project path
- Permission denied errors
- File system errors

## License

MIT
