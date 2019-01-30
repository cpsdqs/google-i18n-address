global.throws = function throws (closure) {
    try {
        closure();
        throw new Error('Closure did not throw error');
    } catch (err) {}
}

global.assert = function assert (condition, error) {
    if (!condition) {
        throw new Error('Assertion failed: ' + error);
    }
}

global.assertEq = function assertEq (a, b, msgParent) {
    let msg = `${a} == ${b}`;
    if (msgParent) msg = `${msg} (in ${msgParent})`;
    if (typeof b === 'object') {
        for (let k in b) {
            assertEq(a[k], b[k], msg);
        }
        for (let k in a) {
            assertEq(a[k], b[k], msg);
        }
    } else {
        assert(a == b, msg);
    }
}

global.parametrize = function parametrize (params, closure) {
    for (const p of params) {
        closure(...p);
    }
}

const tests = Object.assign({}, require('./test-i18naddress'), require('./test-normalization'));

for (const testName in tests) {
    const test = tests[testName];

    try {
        test();
        console.error(`\x1b[32m${testName} passed\x1b[m`);
    } catch (err) {
        console.error(`\x1b[31m${testName} failed:\x1b[37m`);
        console.error(err);
        console.error('\x1b[m');
        break;
    }
}
