import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { promises as fs } from "fs";
import path from "path";

/**
 * MCP server that provides access to project content
 */
class ProjectContentServer {
  private server: Server;

  /**
   * Creates a new ProjectContentServer instance
   */
  constructor() {
    this.server = new Server(
      {
        name: "project-content-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupResourceHandlers();
    this.setupToolHandlers();
  }

  /**
   * Sets up resource handlers for the MCP server
   */
  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async () => ({
      contents: [],
    }));
  }

  /**
   * Sets up tool handlers for the MCP server
   */
  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "latest_project_data",
          description:
            "Get latest project data including file names and contents",
          inputSchema: {
            type: "object",
            properties: {
              projectPath: {
                type: "string",
                description: "Path to the project directory",
              },
            },
            required: ["projectPath"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === "latest_project_data") {
        if (
          !request.params.arguments ||
          typeof request.params.arguments !== "object"
        ) {
          return {
            content: [
              {
                type: "text",
                text: "Invalid arguments provided",
              },
            ],
            isError: true,
          };
        }

        const { projectPath } = request.params.arguments as {
          projectPath: string;
        };

        if (!projectPath || typeof projectPath !== "string") {
          return {
            content: [
              {
                type: "text",
                text: "projectPath must be a valid string",
              },
            ],
            isError: true,
          };
        }

        try {
          const files = await this.getProjectFiles(projectPath);

          // Convert to JSON string
          const jsonString = JSON.stringify(files, null, 2);

          // Send the JSON string as individual characters (like FileReadingServer)
          return {
            content: [
              {
                type: "text",
                text: jsonString
              }
            ],
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error occurred";
          return {
            content: [
              {
                type: "text",
                text: `Error: ${message}`,
              },
            ],
            isError: true,
          };
        }
      }

      throw new Error(`Unknown tool: ${request.params.name}`);
    });
  }

  /**
   * Reads files based on directory mapping from MCP settings
   * @param projectPath - Path to the project directory
   * @returns Object mapping filenames to their contents
   * @throws Error if reading files fails
   */
  private cleanFileContent(content: string): string {
    return content
      .replace(/\r\n|\n/g, " ") // Replace all line endings with space
      .replace(/\s+/g, " ") // Normalize multiple spaces to single
      .trim(); // Remove leading/trailing whitespace
  }

  private async getProjectFiles(projectPath: string) {
    const result: Record<string, string> = {};
    const self = this; // Store reference to class instance

    const normalizePathForOutput = (
      filePath: string,
      basePath: string
    ): string => {
      return path.relative(basePath, filePath).replace(/\\/g, "/");
    };

    try {
      const settingsPath =
        "C:/Users/Mahes/AppData/Roaming/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json";

      let settings;
      try {
        const settingsContent = await fs.readFile(settingsPath, "utf-8");
        settings = JSON.parse(settingsContent);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        throw new Error(
          `Failed to read settings file at ${settingsPath}: ${errorMessage}`
        );
      }

      const mapping =
        settings.mcpServers?.ProjectContentServer?.directoryMapping?.[
          projectPath
        ];

      if (!mapping) {
        throw new Error(
          `No directory mapping found for project path: ${projectPath}`
        );
      }

      async function processPath(itemPath: string) {
        const fullPath = path.normalize(itemPath);
        try {
          const stats = await fs.stat(fullPath);

          if (stats.isDirectory()) {
            const files = await fs.readdir(fullPath);
            for (const file of files) {
              await processPath(path.join(itemPath, file));
            }
          } else if (stats.isFile()) {
            const content = await fs.readFile(fullPath, {
              encoding: "utf8",
              flag: "r",
            });
            const relativePath = normalizePathForOutput(fullPath, projectPath);
            // Use stored reference to access class method
            result[relativePath] = self.cleanFileContent(content);
          }
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : String(err);
          console.error(`Error processing path ${fullPath}: ${errorMessage}`);
        }
      }

      for (const pathItem of mapping) {
        await processPath(pathItem);
      }

      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to process project files: ${errorMessage}`);
    }
  }

  /**
   * Starts the MCP server
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("ProjectContentServer running on stdio");
  }
}

const server = new ProjectContentServer();
server.run().catch(console.error);