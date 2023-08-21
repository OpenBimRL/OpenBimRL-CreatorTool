export enum RuleSetOperator {
    AND = 'and',
    OR = 'or',
    XOR = 'xor',
}
export enum RuleOrRuleSetType {
    RULE = 'rule',
    RULESET = 'ruleSet',
}
export enum RuleQuantifier {
    UNDEFINED = 'undefined',
    EXISTS = 'exists',
    ALL = 'all',
    NOTEXISTS = 'notexists',
}

export enum RuleOperator {
    EQUALS = 'equals',
    INCLUDES = 'includes',
    GREATERTHAN = 'greaterthan',
    LESSOREQUALS = 'lessorequals',
}