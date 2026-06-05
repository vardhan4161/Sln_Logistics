const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
// Cache buster!

// Find the project and workspace directories
const projectRoot = __dirname;
// This should point to the root of your monorepo
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Enable symlink support for pnpm's .pnpm virtual store
config.resolver.unstable_enableSymlinks = true;

// 4. Allow hierarchical lookup so Metro walks up directories
config.resolver.disableHierarchicalLookup = false;

// 5. Custom resolver: when the default resolver fails (common with pnpm's isolated
//    .pnpm store), retry resolution from the project root's node_modules.
//    This handles transitive dependencies like abort-controller, regenerator-runtime,
//    etc. that react-native needs but pnpm isolates away from Metro's reach.
const projectNodeModules = path.resolve(projectRoot, "node_modules");
const workspaceNodeModules = path.resolve(workspaceRoot, "node_modules");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  let originalError;
  // First, try the default resolver
  try {
    return context.resolveRequest(context, moduleName, platform);
  } catch (error) {
    originalError = error;
    // If the default resolver fails, try resolving from known node_modules roots

    // This handles pnpm's .pnpm store isolation issue
  }

  // Try resolving from the mobile project's node_modules
  try {
    const fromProject = {
      ...context,
      originModulePath: path.join(projectNodeModules, "_virtual.js"),
    };
    return fromProject.resolveRequest(fromProject, moduleName, platform);
  } catch (e) {
    // fall through
  }

  // Try resolving from the workspace root's node_modules
  try {
    const fromWorkspace = {
      ...context,
      originModulePath: path.join(workspaceNodeModules, "_virtual.js"),
    };
    return fromWorkspace.resolveRequest(fromWorkspace, moduleName, platform);
  } catch (e) {
    // If all attempts fail, throw the original error to preserve the exact reason
    throw originalError;
  }
};

module.exports = config;
