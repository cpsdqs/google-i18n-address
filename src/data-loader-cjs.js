const fs = require('fs');
const path = require('path');

const VALID_COUNTRY_CODE = /^\w{2,3}$/;

const VALIDATION_DATA_DIR = path.join(__dirname, '../data');
const VALIDATION_DATA_PATH = (name) => path.join(VALIDATION_DATA_DIR, `${name}.json`);

export default function loadValidationDataCJS(countryCode = 'all') {
    if (!countryCode.match(VALID_COUNTRY_CODE)) {
        throw new Error(`${countryCode} is not a valid country code`);
    }
    countryCode = countryCode.toLowerCase();
    const filePath = VALIDATION_DATA_PATH(countryCode);
    return () => new Promise((resolve, reject) => {
        fs.readFile(filePath, (err, contents) => {
            if (err) reject(err);
            else resolve(JSON.parse(contents));
        });
    });
}

loadValidationDataCJS.allowsAll = true;
