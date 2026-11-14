import { NotesTool } from "./mcp/notes.tool.js";
import { NotesController } from "./modules/notes/notes.controller.js";
import { NotesService } from "./modules/notes/notes.service.js";

/** Example slice registration. Infrastructure imports these arrays and does not name the slice. */
export const mcpScopesSupported = ["notes:ver"];
export const sliceControllers = [NotesController];
export const sliceProviders = [NotesService, NotesTool];
