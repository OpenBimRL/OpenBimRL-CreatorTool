import type { Rule, RuleSet } from '../graph/Types';
import { RuleOperator, RuleOrRuleSetType, RuleQuantifier, RuleSetOperator } from '../graph/enums';

export const createRule = (
    label = '',
    operand1 = '',
    operand2 = '',
    quantifier = RuleQuantifier.UNDEFINED,
    operator = RuleOperator.EQUALS,
): Rule => ({
    type: RuleOrRuleSetType.RULE,
    label,
    operand1,
    operand2,
    quantifier,
    operator,
});

export const createRuleSet = (
    label = '',
    operator = RuleSetOperator.OR,
    rulesOrRuleSets = new Array<Rule | RuleSet>(),
): RuleSet => ({
    type: RuleOrRuleSetType.RULESET,
    label,
    operator,
    rulesOrRuleSets,
});
