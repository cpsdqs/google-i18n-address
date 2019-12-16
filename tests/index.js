global.throws = function throws (closure) {
    closure().then(() => {
        throw new Error('Closure did not throw error');
    }).catch(() => {});
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

global.parametrize = async function parametrize (params, closure) {
    for (const p of params) {
        await closure(...p);
    }
}

const tests = Object.assign({}, require('./test-i18naddress'), require('./test-normalization'));

async function run () {
    for (const testName in tests) {
        const test = tests[testName];

        try {
            await test();
            console.error(`\x1b[32m${testName} passed\x1b[m`);
        } catch (err) {
            console.error(`\x1b[31m${testName} failed:\x1b[37m`);
            console.error(err);
            console.error('\x1b[m');
            break;
        }
    }
}
run();
