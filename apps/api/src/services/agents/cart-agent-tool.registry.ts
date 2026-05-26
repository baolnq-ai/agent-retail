export type CartAgentToolCategory = 'rag' | 'sql' | 'logic' | 'write' | 'audit';

export interface CartAgentToolDefinition {
  name: string;
  category: CartAgentToolCategory;
  purpose: string;
  write: boolean;
  requiresAuth: boolean;
  requiresIdempotency: boolean;
  requiresCartVersion: boolean;
  inputSchemaRef: string;
  outputSchemaRef: string;
}

export const CART_AGENT_PUBLIC_INTERFACE = 'cart.agent.run_goal';

export const CART_AGENT_PRIVATE_TOOLS: CartAgentToolDefinition[] = [
  tool('cart.rag.get_schema_context', 'rag', 'Return allowed cart schema, fields, relations, and tool descriptions.', false, false, false),
  tool('cart.rag.retrieve_cart_context', 'rag', 'Load current cart, pending action, near events, and goal-relevant context.', false, true, false),
  tool('cart.rag.retrieve_interaction_history', 'rag', 'Load Cart Agent private interaction history for vague follow-up goals.', false, true, false),
  tool('cart.rag.retrieve_memory', 'rag', 'Load near, mid, and far Cart Agent memory tiers.', false, true, false),
  tool('cart.rag.ground_rows_to_facts', 'rag', 'Convert rows and tool results into evidence-backed cart facts.', false, false, false),
  tool('cart.rag.compose_agent_response', 'rag', 'Compose structured facts, issues, and Lead Agent handoff.', false, false, false),
  tool('cart.sql.get_active_cart', 'sql', 'Get active cart by user/cart scope.', false, true, false),
  tool('cart.sql.get_cart_items', 'sql', 'Get all cart items with product snapshots needed for answer grounding.', false, true, false),
  tool('cart.sql.get_cart_totals', 'sql', 'Calculate subtotal, grand total, and item count from DB state.', false, true, false),
  tool('cart.sql.find_cart_item', 'sql', 'Find cart item by product id, title, brand, category, or alias.', false, true, false),
  tool('cart.sql.get_cart_events', 'sql', 'Load near add/remove/update/clear cart ledger events.', false, true, false),
  tool('cart.sql.get_agent_interactions', 'sql', 'Load prior Cart Agent goals, tool summaries, and conclusions.', false, true, false),
  tool('cart.sql.get_pending_action', 'sql', 'Load active pending cart action.', false, true, false),
  tool('cart.sql.get_cart_memory', 'sql', 'Load cart memory rows by tier/key.', false, true, false),
  tool('cart.logic.plan_from_goal', 'logic', 'Parse lead goal into a private tool plan.', false, false, false),
  tool('cart.logic.validate_private_plan', 'logic', 'Reject unknown tools, missing inputs, and unsafe write plans.', false, false, false),
  tool('cart.logic.evaluate_query_results', 'logic', 'Classify ok, empty, SQL error, conflict, out-of-stock, and verify fail.', false, false, false),
  tool('cart.logic.resolve_cart_reference', 'logic', 'Resolve references such as last added item or that product from cart context.', false, false, false),
  tool('cart.logic.decide_confirmation', 'logic', 'Decide whether a cart action needs pending confirmation.', false, false, false),
  tool('cart.logic.build_allowed_claims', 'logic', 'Build claims Lead Agent may safely say to the user.', false, false, false),
  tool('cart.logic.redact_trace_payload', 'logic', 'Redact sensitive payload before trace/log output.', false, false, false),
  tool('cart.write.add_item', 'write', 'Add a resolved product to cart.', true, true, true),
  tool('cart.write.set_quantity', 'write', 'Set an absolute item quantity; zero means remove.', true, true, true),
  tool('cart.write.increment_item', 'write', 'Increase item quantity by delta.', true, true, true),
  tool('cart.write.decrement_item', 'write', 'Decrease item quantity by delta.', true, true, true),
  tool('cart.write.remove_item', 'write', 'Remove one product from cart.', true, true, true),
  tool('cart.write.clear', 'write', 'Clear all cart items after confirmation rule passes.', true, true, true),
  tool('cart.write.create_pending_action', 'write', 'Create pending confirmation for risky, ambiguous, or multi-item action.', true, true, true),
  tool('cart.write.confirm_pending_action', 'write', 'Confirm and execute unexpired pending action.', true, true, true),
  tool('cart.write.cancel_pending_action', 'write', 'Cancel pending action.', true, true, true),
  tool('cart.audit.write_event', 'audit', 'Write CartEvent ledger entry.', true, true, false),
  tool('cart.audit.write_interaction', 'audit', 'Write CartAgentInteraction for each lead goal.', true, true, false),
  tool('cart.memory.write_near', 'audit', 'Write near cart memory.', true, true, false),
  tool('cart.memory.summarize_mid', 'audit', 'Summarize near events/interactions into mid memory.', true, true, false),
  tool('cart.memory.update_far', 'audit', 'Update stable far behavior signal.', true, true, false),
  tool('cart.trace.emit', 'audit', 'Emit redacted trace node/tool event.', true, false, false),
];

export function getCartAgentTool(name: string): CartAgentToolDefinition | undefined {
  return CART_AGENT_PRIVATE_TOOLS.find((definition) => definition.name === name);
}

export function isAllowedCartAgentTool(name: string): boolean {
  return Boolean(getCartAgentTool(name));
}

function tool(name: string, category: CartAgentToolCategory, purpose: string, write: boolean, requiresAuth: boolean, requiresIdempotency: boolean): CartAgentToolDefinition {
  const schemaName = name.replace(/\./g, '_');
  const requiresCartVersion = [
    'cart.write.add_item',
    'cart.write.set_quantity',
    'cart.write.increment_item',
    'cart.write.decrement_item',
    'cart.write.remove_item',
    'cart.write.clear',
  ].includes(name);
  return {
    name,
    category,
    purpose,
    write,
    requiresAuth,
    requiresIdempotency,
    requiresCartVersion,
    inputSchemaRef: `CartAgent.${schemaName}.input`,
    outputSchemaRef: `CartAgent.${schemaName}.output`,
  };
}
