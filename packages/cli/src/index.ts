import Build from './commands/hydrogen/build.js';
import Check from './commands/hydrogen/check.js';
import Codegen from './commands/hydrogen/codegen.js';
import CustomerAccountPush from './commands/hydrogen/customer-account/push.js';
import DebugCpu from './commands/hydrogen/debug/cpu.js';
import Deploy from './commands/hydrogen/deploy.js';
import Dev from './commands/hydrogen/dev.js';
import EnvList from './commands/hydrogen/env/list.js';
import EnvPull from './commands/hydrogen/env/pull.js';
import EnvPush from './commands/hydrogen/env/push.js';
import GenerateRouteShortcut from './commands/hydrogen/g.js';
import GenerateRoute from './commands/hydrogen/generate/route.js';
import GenerateRoutes from './commands/hydrogen/generate/routes.js';
import Init from './commands/hydrogen/init.js';
import Link from './commands/hydrogen/link.js';
import List from './commands/hydrogen/list.js';
import Login from './commands/hydrogen/login.js';
import Logout from './commands/hydrogen/logout.js';
import Preview from './commands/hydrogen/preview.js';
import Setup from './commands/hydrogen/setup.js';
import SetupCSS from './commands/hydrogen/setup/css.js';
import SetupMarkets from './commands/hydrogen/setup/markets.js';
import SetupVite from './commands/hydrogen/setup/vite.js';
import Shortcut from './commands/hydrogen/shortcut.js';
import Unlink from './commands/hydrogen/unlink.js';
import Upgrade from './commands/hydrogen/upgrade.js';

const COMMANDS = {
  'hydrogen:dev': Dev,
  'hydrogen:build': Build,
  'hydrogen:check': Check,
  'hydrogen:codegen': Codegen,
  'hydrogen:deploy': Deploy,
  'hydrogen:g': GenerateRouteShortcut,
  'hydrogen:init': Init,
  'hydrogen:link': Link,
  'hydrogen:list': List,
  'hydrogen:login': Login,
  'hydrogen:logout': Logout,
  'hydrogen:preview': Preview,
  'hydrogen:setup': Setup,
  'hydrogen:shortcut': Shortcut,
  'hydrogen:unlink': Unlink,
  'hydrogen:upgrade': Upgrade,
  'hydrogen:customer-account-push': CustomerAccountPush,
  'hydrogen:debug:cpu': DebugCpu,
  'hydrogen:env:list': EnvList,
  'hydrogen:env:pull': EnvPull,
  'hydrogen:env:push': EnvPush,
  'hydrogen:generate:route': GenerateRoute,
  'hydrogen:generate:routes': GenerateRoutes,
  'hydrogen:setup:css': SetupCSS,
  'hydrogen:setup:markets': SetupMarkets,
  'hydrogen:setup:vite': SetupVite,
};

export default COMMANDS;
