import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CURRENT_SCHEMA_VERSION, migrateOpenBimRL, migratePath } from './migrate-openbimrl.mjs';

const OLD = `<?xml version="1.0" encoding="UTF-8"?>
<BIMRule schemaVersion="0.1" xmlns="http://inf.bi.rub.de/OpenBimRL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://inf.bi.rub.de/OpenBimRL OpenBimRL.xsd">
<Precalculations>
<Node id="n1" function="input.textInput"><Outputs><Output name="text" value="Hello"/></Outputs></Node>
<Edge id="e1" source="n1" sourceHandle="0" target="n2" targetHandle="0"/>
</Precalculations>
<ModelCheck name="graph.openbimrl">
<RuleIdentifiers><RuleIdentifier label="L" source="n1" sourceHandle="0"/></RuleIdentifiers>
<ModelSubChecks><ModelSubCheck name="c"><Rules operator="and"><Rule label="r" operator="equals" operand1="L" operand2="Hello"/></Rules></ModelSubCheck></ModelSubChecks>
<ResultSets/>
</ModelCheck>
</BIMRule>
`;

test('wraps a legacy BIMRule document in openBIMRLType', () => {
    const result = migrateOpenBimRL(OLD, { uuid: '11111111-1111-4111-8111-111111111111' });
    assert.equal(result.changed, true);
    assert.equal(result.version, CURRENT_SCHEMA_VERSION);
    assert.match(result.xml, /^<\?xml version="1.0" encoding="UTF-8" standalone="yes"\?>/);
    assert.match(result.xml, /<openBIMRLType version="2026\.3\.1" xmlns="http:\/\/inf\.bi\.rub\.de\/OpenBimRL">/);
    assert.match(result.xml, /<BIMRule name="graph.openbimrl">/);
    assert.doesNotMatch(result.xml, /schemaVersion/);
    assert.doesNotMatch(result.xml, /schemaLocation/);
    assert.match(result.xml, /<Node id="n1" function="input.textInput">/);
    assert.match(result.xml, /<Edge id="e1" source="n1" sourceHandle="0" target="n2" targetHandle="0"\/>/);
    assert.match(result.xml, /<Rule label="r" operator="equals" operand1="L" operand2="Hello"\/>/);
    assert.match(result.xml, /<uuid>11111111-1111-4111-8111-111111111111<\/uuid>/);
});

test('keeps an existing BIMRule name and uuid', () => {
    const named = OLD.replace(
        '<BIMRule schemaVersion="0.1"',
        '<BIMRule name="Halbrahmen" schemaVersion="0.1"',
    ).replace('</ModelCheck>\n</BIMRule>', '</ModelCheck>\n<uuid>87d84908-9ece-4da7-98bd-3af13be4ef21</uuid>\n</BIMRule>');
    const result = migrateOpenBimRL(named, { uuid: '00000000-0000-4000-8000-000000000000' });
    assert.match(result.xml, /<BIMRule name="Halbrahmen">/);
    assert.match(result.xml, /<uuid>87d84908-9ece-4da7-98bd-3af13be4ef21<\/uuid>/);
    assert.doesNotMatch(result.xml, /00000000-0000-4000-8000-000000000000/);
});

test('leaves a current document unchanged', () => {
    const current = migrateOpenBimRL(OLD, { uuid: '22222222-2222-4222-8222-222222222222' }).xml;
    const again = migrateOpenBimRL(current);
    assert.equal(again.changed, false);
    assert.equal(again.version, CURRENT_SCHEMA_VERSION);
    assert.equal(again.xml, current);
});

test('accepts the OpenBIMRL root name as already current', () => {
    const xml = `<OpenBIMRL version="2026.3.1" xmlns="http://inf.bi.rub.de/OpenBimRL"><BIMRule name="r"><uuid>33333333-3333-4333-8333-333333333333</uuid></BIMRule></OpenBIMRL>`;
    const result = migrateOpenBimRL(xml);
    assert.equal(result.changed, false);
    assert.equal(result.xml, xml);
});

test('rejects an unknown root', () => {
    assert.throws(() => migrateOpenBimRL('<Rules name="x"></Rules>'), /Unrecognized OpenBimRL root/);
});

test('CLI migrates a directory in place and skips files that are already current', () => {
    const dir = mkdtempSync(join(tmpdir(), 'openbimrl-migrate-'));
    const legacy = join(dir, 'legacy.openbimrl');
    const current = join(dir, 'current.openbimrl');
    writeFileSync(legacy, OLD);
    writeFileSync(current, migrateOpenBimRL(OLD, { uuid: '44444444-4444-4444-8444-444444444444' }).xml);

    const script = fileURLToPath(new URL('./migrate-openbimrl.mjs', import.meta.url));
    const run = spawnSync(process.execPath, [script, '--in-place', dir], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    assert.match(run.stdout, /migrated/);
    assert.match(run.stdout, /unchanged/);

    const migrated = readFileSync(legacy, 'utf8');
    assert.match(migrated, /<openBIMRLType version="2026\.3\.1"/);
    assert.match(migrated, /function="input.textInput"/);
    assert.equal(readFileSync(current, 'utf8').includes('<openBIMRLType'), true);

    const second = migratePath(legacy);
    assert.equal(second.changed, false);
});
