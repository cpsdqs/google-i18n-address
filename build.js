const rollup = require('rollup');
const replace = require('rollup-plugin-re');
const nodeResolve = require('rollup-plugin-node-resolve');
const babel = require('rollup-plugin-babel');
const fs = require('fs');
const path = require('path');
const pkg = require('./package.json');

const PARTITION_SPLIT_SIZE = 36000;

async function bundleData () {
    console.log('Bundling data…');
    const items = fs.readdirSync('data').filter(item => item !== 'all.json');
    const outFiles = {};

    let partitionItems = [];
    let partitionKeys = new Set();
    let partitionData = {};
    let partitionSize = 0;
    for (const item of items) {
        const dataStr = fs.readFileSync(path.join(__dirname, 'data/' + item));
        if (partitionSize + dataStr.length > PARTITION_SPLIT_SIZE && partitionSize) {
            // split
            outFiles[partitionItems.join('-')] = 'export default ' + JSON.stringify(partitionData);
            partitionKeys = new Set();
            partitionItems = [];
            partitionData = {};
            partitionSize = 0;
        }
        partitionItems.push(item.split('.')[0]);
        const data = JSON.parse(dataStr);
        for (const key in data) partitionKeys.add(key.split('/')[0]);
        partitionSize += dataStr.length;
        Object.assign(partitionData, data);
    }
    if (partitionSize) {
        outFiles[partitionItems.join('-')] = 'export default ' + JSON.stringify(partitionData);
    }

    fs.mkdirSync(path.join(__dirname,  'src/data-bundles'), { recursive: true, mode: 0o775 });

    for (const name in outFiles) {
        fs.writeFileSync(path.join(__dirname, 'src/data-bundles/' + name + '.js'), outFiles[name]);
    }

    console.log('Bundled into', Object.keys(outFiles).length, 'partitions');

    let importStatements = [];
    for (const name in outFiles) {
        importStatements.push(`    ${JSON.stringify(name)}: () => import("./data-bundles/${name}.js")`);
    }
    const indexContents = `const imports = {\n` + importStatements.join(',\n') + `\n};
export default function (code) {
    for (const key in imports) {
        if (key.split('-').includes(code)) return () => imports[key]().then(x => x.default);
    }
}`;
    fs.writeFileSync(path.join(__dirname, 'src/data-index.js'), indexContents);
    console.log('Wrote index file');
}

const inputOptions = esm => ({
    input: 'src/index.js',
    plugins: [
       replace({
           patterns: [
               {
                   match: /src\/index\.js/,
                   test: 'magic-replace-data-index-import',
                   replace: esm ? './data-index.js' : './data-loader-cjs.js',
               }
           ],
       }),
       esm ? babel({
           presets: [
               ['@babel/preset-env', {
                    useBuiltIns: 'usage',
                    corejs: pkg.dependencies['core-js']
               }]
           ],

       }) : null,
       nodeResolve(),
    ].filter(x => x),
    external: id => id.startsWith('core-js') || id.startsWith('regenerator-runtime'),
});
const outputOptions = esm => ({
    dir: esm ? 'dist-esm' : 'dist',
    format: esm ? 'esm' : 'cjs',
});

async function build (esm) {
    console.log('Running rollup…' + (esm ? ' (esm build)' : ''));
    const bundle = await rollup.rollup(inputOptions(esm));
    await bundle.write(outputOptions(esm));
    console.log('\x1b[32mdone\x1b[m');
}

if (process.argv[2] === 'esm') {
    bundleData();
    build(true);
} else build(false);
