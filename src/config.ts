/* IMPORT */

import * as _ from "lodash";
import merge from "conf-merge";
import * as JSON5 from "json5";
import * as path from "path";
import * as vscode from "vscode";
import Utils from "./utils";

/* CONFIG */

const Config = {
  async getDefaults(rootPath?: string) {
    if (!rootPath) {
      // check if there is workspace terminals configuration available
      const hasWorkspaceFile = !!vscode.workspace.workspaceFile;
      if (hasWorkspaceFile) {
        const workspaceFilePath = vscode.workspace.workspaceFile.fsPath;
        // read workspace file json and check if it has settings.terminals.terminals property
        const workspaceFileJson = JSON5.parse(
          await Utils.file.read(workspaceFilePath)
        );
        if (
          workspaceFileJson?.settings?.hasOwnProperty("terminals.terminals")
        ) {
          rootPath = path.dirname(workspaceFilePath);
          // returning up the workspace file path
          return { configPath: rootPath };
        }
      }

      rootPath = Utils.folder.getActiveRootPath();
    }

    const configPath = rootPath
      ? path.join(rootPath, ".vscode", "terminals.json")
      : "";

    return { configPath };
  },

  getExtension(extension = "terminals") {
    return vscode.workspace.getConfiguration().get(extension) as any;
  },

  async getFile(filepath) {
    const content = await Utils.file.read(filepath);

    if (!content || !content.trim()) return;

    const config: any = _.attempt(JSON5.parse, content);

    if (_.isError(config)) {
      const option = await vscode.window.showErrorMessage(
        "[Terminals] Your configuration file contains improperly formatted JSON",
        { title: "Overwrite" },
        { title: "Edit" }
      );

      if (option && option.title === "Overwrite") {
        await Utils.file.write(filepath, "{}");

        return {};
      } else {
        if (option && option.title === "Edit") {
          Utils.file.open(filepath);
        }

        throw new Error("Can't read improperly formatted configuration file");
      }
    }

    return config;
  },

  async get(rootPath?: string) {
    const defaults = await Config.getDefaults(rootPath),
      extension: any = Config.getExtension(),
      configPath: string = extension.configPath || defaults.configPath,
      config = configPath && (await Config.getFile(configPath));

    return merge({}, defaults, extension, config, { configPath }) as any;
  },
};

/* EXPORT */

export default Config;
