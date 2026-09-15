import type { HandlerCtx } from "../types.js";
import { registerBattleJoinHandlers } from "./battle-join.js";
import { registerBattleAcceptHandlers } from "./battle-accept.js";
import { registerBattleSurrenderHandlers } from "./battle-surrender.js";
import { registerBattleActionHandlers } from "./battle-action.js";

export function registerBattleHandlers(ctx: HandlerCtx): void {
    registerBattleJoinHandlers(ctx);
    registerBattleAcceptHandlers(ctx);
    registerBattleSurrenderHandlers(ctx);
    registerBattleActionHandlers(ctx);
}
