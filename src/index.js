import dataIndex from 'magic-replace-data-index-import';

const VALID_COUNTRY_CODE = /^\w{2,3}$/;

const cachedValidationDataSubsets = {};

async function loadValidationData(countryCode = 'all') {
    if (!countryCode.match(VALID_COUNTRY_CODE)) {
        throw new Error(`${countryCode} is not a valid country code`);
    }
    if (!dataIndex.allowsAll && countryCode === 'all') {
        throw new Error('loading all countries is not allowed');
    }
    countryCode = countryCode.toUpperCase();
    if (!(countryCode in cachedValidationDataSubsets)) {
        const dataPromise = dataIndex(countryCode.toLowerCase());
        if (!dataPromise) throw new Error('no such country ' + countryCode);
        const data = await dataPromise();
        cachedValidationDataSubsets[countryCode] = data;
    }
    return cachedValidationDataSubsets[countryCode];
}

const FIELD_MAPPING = {
    A: 'streetAddress',
    C: 'city',
    D: 'cityArea',
    N: 'name',
    O: 'companyName',
    S: 'countryArea',
    X: 'sortingCode',
    Z: 'postalCode'
};

const KNOWN_FIELDS = Object.values(FIELD_MAPPING).concat(['countryCode']);

class ValidationRules {
    constructor ({
        countryCode,
        countryName,
        addressFormat,
        addressLatinFormat,
        allowedFields,
        requiredFields,
        upperFields,
        countryAreaType,
        countryAreaChoices,
        cityType,
        cityChoices,
        cityAreaType,
        cityAreaChoices,
        postalCodeType,
        postalCodeMatchers,
        postalCodeExamples,
        postalCodePrefix,
    }) {
        this.countryCode = countryCode;
        this.countryName = countryName;
        this.addressFormat = addressFormat;
        this.addressLatinFormat = addressLatinFormat;
        this.allowedFields = allowedFields;
        this.requiredFields = requiredFields;
        this.upperFields = upperFields;
        this.countryAreaType = countryAreaType;
        this.countryAreaChoices = countryAreaChoices;
        this.cityType = cityType;
        this.cityChoices = cityChoices;
        this.cityAreaType = cityAreaType;
        this.cityAreaChoices = cityAreaChoices;
        this.postalCodeType = postalCodeType;
        this.postalCodeMatchers = postalCodeMatchers;
        this.postalCodeExamples = postalCodeExamples;
        this.postalCodePrefix = postalCodePrefix;
    }
}

// polyfill
function* zip(a, b) {
    a = a[Symbol.iterator]();
    b = b[Symbol.iterator]();
    while (true) {
        let nextA = a.next();
        let nextB = b.next();
        if (nextA.done || nextB.done) break;
        yield [nextA.value, nextB.value];
    }
}

function makeChoices(rules, translated = false) {
    let subKeys = rules.sub_keys;
    if (!subKeys) return [];
    const choices = [];
    subKeys = subKeys.split(/~/g);
    const subNames = rules.sub_names;
    if (subNames) {
        choices.push(...[...zip(subKeys, subNames.split(/~/g))].filter(([k, v]) => v));
    } else if (!translated) {
        choices.push(...subKeys.map(x => [x, x]));
    }

    if (!translated) {
        const subLNames = rules.sub_lnames;
        if (subLNames) {
            choices.push(...[...zip(subKeys, subLNames.split(/~/g))].filter(([k, v]) => v));
        }
        const subLFNames = rules.sub_lfnames;
        if (subLFNames) {
            choices.push(...[...zip(subKeys, subLFNames.split(/~/g))].filter(([k, v]) => v));
        }
    }
    return choices;
}

function compactChoices(choices) {
    const valueMap = {};
    for (const [key, value] of choices) {
        if (!(key in valueMap)) {
            valueMap[key] = new Set();
        }
        valueMap[key].add(value);
    }
    const output = [];
    for (const key of Object.keys(valueMap).sort()) {
        for (const value of [...valueMap[key]].sort()) {
            output.push([key, value]);
        }
    }
    return output;
}

function matchChoices(value, choices) {
    if (value) {
        value = value.trim().toLowerCase();
    }
    for (const [name, label] of choices) {
        if (name.toLowerCase() === value || label.toLowerCase() === value) return name;
    }
    return null;
}

async function loadCountryData(countryCode) {
    let database = await loadValidationData('zz');
    let countryData = database.ZZ;

    if (countryCode) {
        countryCode = countryCode.toUpperCase();
        if (countryCode.toLowerCase() === 'zz') {
            throw new Error(`${countryCode} is not a valid country code`);
        }
        database = await loadValidationData(countryCode.toLowerCase());
        countryData = Object.assign({}, countryData, database[countryCode]);
    }

    return [countryData, database];
}

function* reFindIter(regex, string) {
    let match;
    while ((match = string.match(regex))) {
        yield match;
        string = string.substr(match.index + match[0].length);
    }
}

async function getValidationRules(address) {
    const countryCode = (address.countryCode || '').toUpperCase();
    const [countryData, database] = await loadCountryData(countryCode);
    const countryName = countryData.name || '';
    const addressFormat = countryData.fmt;
    const addressLatinFormat = countryData.lfmt || addressFormat;
    const formatFields = reFindIter(/%([ACDNOSXZ])/, addressFormat);
    const allowedFields = [];
    for (const m of formatFields) {
        allowedFields.push(FIELD_MAPPING[m[1]]);
    }
    const requiredFields = [];
    for (const f of countryData.require) {
        requiredFields.push(FIELD_MAPPING[f]);
    }
    const upperFields = [];
    for (const f of countryData.upper) {
        upperFields.push(FIELD_MAPPING[f]);
    }
    let languages = [null];
    if ('languages' in countryData) {
        languages = countryData.languages.split(/~/g);
    }

    const postalCodeMatchers = [];
    if (requiredFields.includes('postalCode')) {
        if ('zip' in countryData) {
            postalCodeMatchers.push(new RegExp(`^${countryData.zip}$`));
        }
    }
    let postalCodeExamples = [];
    if ('zipex' in countryData) {
        postalCodeExamples = countryData.zipex.split(/,/g)
    }

    let countryAreaChoices = [];
    let cityChoices = [];
    let cityAreaChoices = [];
    const countryAreaType = countryData.state_name_type;
    const cityType = countryData.locality_name_type;
    const cityAreaType = countryData.sublocality_name_type;
    const postalCodeType = countryData.zip_name_type;
    const postalCodePrefix = countryData.postprefix || '';
    // second level of data is for administrative areas
    let countryArea = null;
    let city = null;
    let cityArea = null;
    if (countryCode in database) {
        if ('sub_keys' in countryData) {
            for (const language of languages) {
                const isDefaultLanguage = language == null || language == countryData.lang;
                let matchedCountryArea = null;
                let matchedCity = null;
                let localizedCountryData;
                if (isDefaultLanguage) {
                    localizedCountryData = database[countryCode];
                } else {
                    localizedCountryData = database[`${countryCode}--${language}`];
                }
                let localizedCountryAreaChoices = makeChoices(localizedCountryData)

                countryAreaChoices.push(...localizedCountryAreaChoices);
                let existingChoice = countryArea != null;
                matchedCountryArea = matchChoices(address.countryArea, localizedCountryAreaChoices);
                countryArea = matchedCountryArea;

                if (matchedCountryArea) {
                    // third level of data is for cities
                    let countryAreaData;
                    if (isDefaultLanguage) {
                        countryAreaData = database[`${countryCode}/${countryArea}`];
                    } else {
                        countryAreaData = database[`${countryCode}/${countryArea}--${language}`];
                    }

                    if (!existingChoice) {
                        if ('zip' in countryAreaData) {
                            postalCodeMatchers.push(new RegExp('^' + countryAreaData.zip));
                        }
                        if ('zipex' in countryAreaData) {
                            postalCodeExamples = countryAreaData.zipex.split(/,/g);
                        }
                    }

                    if ('sub_keys' in countryAreaData) {
                        let localizedCityChoices = makeChoices(countryAreaData);
                        cityChoices.push(...localizedCityChoices);
                        existingChoice = !!city;
                        matchedCity = city = matchChoices(address.city, localizedCityChoices);
                    }

                    if (matchedCity) {
                        // fourth level of data is for dependent sublocalities
                        let cityData;
                        if (isDefaultLanguage) {
                            cityData = database[`${countryCode}/${countryArea}/${city}`];
                        } else {
                            cityData = database[`${countryCode}/${countryArea}/${city}--${language}`];
                        }
                        if (!existingChoice) {
                            if ('zip' in cityData) {
                                postalCodeMatchers.push(new RegExp('^' + cityData.zip));
                            }
                            if ('zipex' in cityData) {
                                postalCodeExamples = cityData.zipex.split(/,/g);
                            }
                        }

                        if ('sub_keys' in cityData) {
                            let localizedCityAreaChoices = makeChoices(cityData)
                            cityAreaChoices.push(...localizedCityAreaChoices);
                            existingChoice = !!cityArea;
                            let matchedCityArea = cityArea = matchChoices(address.cityArea, localizedCityAreaChoices);

                            if (matchedCityArea) {
                                let cityAreaData;
                                if (isDefaultLanguage) {
                                    cityAreaData = database[`${countryCode}/${countryArea}/${city}/${cityArea}`];
                                } else {
                                    cityAreaData = database[`${countryCode}/${countryArea}/${city}/${cityArea}--${language}`];
                                }

                                if (!existingChoice) {
                                    if ('zip' in cityAreaData) {
                                        postalCodeMatchers.push(new RegExp('^' + cityAreaData.zip));
                                    }
                                    if ('zipex' in cityAreaData) {
                                        postalCodeExamples = cityAreaData.zipex.split(/,/g);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        countryAreaChoices = compactChoices(countryAreaChoices);
        cityChoices = compactChoices(cityChoices);
        cityAreaChoices = compactChoices(cityAreaChoices);
    }

    return new ValidationRules({
        countryCode, countryName, addressFormat, addressLatinFormat,
        allowedFields, requiredFields, upperFields, countryAreaType,
        countryAreaChoices, cityType, cityChoices, cityAreaType,
        cityAreaChoices, postalCodeType, postalCodeMatchers,
        postalCodeExamples, postalCodePrefix,
    });
}

class InvalidAddress extends Error {
    constructor (message, errors, error) {
        super(message);
        this.errors = errors;
        this._error = error;
    }
}

function normalizeField(name, rules, data, choices, errors, formatLocale) {
    let value = data[name];
    if (rules.upperFields.includes(name) && value) {
        value = data[name] = value.toLocaleUpperCase(formatLocale);
    }
    if (!rules.allowedFields.includes(name)) data[name] = '';
    else if (!value && rules.requiredFields.includes(name)) {
        errors[name] = 'required';
    } else if (choices.length) {
        if (value || rules.requiredFields.includes(name)) {
            value = matchChoices(value, choices);
            if (value) data[name] = value;
            else errors[name] = 'invalid';
        }
    }

    if (!value) data[name] = '';
}

async function normalizeAddress(address, formatLocale) {
    const errors = {};
    let rules;
    try {
        rules = await getValidationRules(address);
    } catch (error) {
        errors.countryCode = 'invalid';
        throw new InvalidAddress('Invalid address', errors, error);
    }

    const cleanedData = Object.assign({}, address);
    const countryCode = cleanedData.countryCode;
    if (!countryCode) {
        errors.countryCode = 'required';
    } else {
        cleanedData.countryCode = countryCode.toLocaleUpperCase(formatLocale);
    }

    normalizeField('countryArea', rules, cleanedData, rules.countryAreaChoices, errors, formatLocale);
    normalizeField('city', rules, cleanedData, rules.cityChoices, errors, formatLocale);
    normalizeField('cityArea', rules, cleanedData, rules.cityAreaChoices, errors, formatLocale);
    normalizeField('postalCode', rules, cleanedData, [], errors, formatLocale);
    const postalCode = cleanedData.postalCode || '';
    if (rules.postalCodeMatchers.length && postalCode) {
        for (const matcher of rules.postalCodeMatchers) {
            if (!postalCode.match(matcher)) {
                errors.postalCode = 'invalid';
                break;
            }
        }
    }
    normalizeField('streetAddress', rules, cleanedData, [], errors, formatLocale);
    normalizeField('sortingCode', rules, cleanedData, [], errors, formatLocale);
    if (Object.keys(errors).length) {
        throw new InvalidAddress('Invalid address', errors);
    }

    return cleanedData;
}

function formatAddressLine(lineFormat, address, rules, formatLocale) {
    const getField = name => {
        let value = address[name] || '';
        if (rules.upperFields.includes(name)) {
            value = value.toLocaleUpperCase(formatLocale);
        }
        return value;
    };

    const replacements = {};

    for (const code in FIELD_MAPPING) {
        const fieldName = FIELD_MAPPING[code];
        replacements[`%${code}`] = getField(fieldName);
    }

    let fields = lineFormat.split(/(%.)/g);
    let fieldsp = [];
    for (const f of fields) {
        let s = replacements[f];
        if (s === undefined) s = f;
        fieldsp.push(s);
    }
    return fieldsp.join('').trim();
}

async function getFieldOrder(address, latin = false) {
    /*
     Returns expected order of address form fields as a list of lists.
     Example for PL:
     >>> getFieldOrder({ countryCode: 'PL' })
     [['name'], ['company_name'], ['street_address'], ['postal_code', 'city']]
     */

    const rules = await getValidationRules(address);
    const addressFormat = latin ? rules.addressLatinFormat : rules.addressFormat;
    const addressLines = addressFormat.split(/%n/g);

    const replacements = {};

    for (const code in FIELD_MAPPING) {
        const fieldName = FIELD_MAPPING[code];
        replacements[`%${code}`] = fieldName;
    }

    const allLines = [];
    for (const line of addressLines) {
        const fields = line.split(/(%.)/g);
        let singleLine = [];
        for (const field of fields) {
            singleLine.push(replacements[field]);
        }
        singleLine = singleLine.filter(x => x);
        allLines.push(singleLine);
    }
    return allLines;
}

async function formatAddress(address, latin = false, formatLocale, countryOverride) {
    const rules = await getValidationRules(address);
    const addressFormat = latin ? rules.addressLatinFormat : rules.addressFormat;
    const addressLineFormats = addressFormat.split(/%n/g);
    const addressLines = [];
    for (const lf of addressLineFormats) {
        addressLines.push(formatAddressLine(lf, address, rules, formatLocale));
    }
    addressLines.push(countryOverride ? countryOverride.toLocaleUpperCase(formatLocale) : rules.countryName);
    return addressLines.filter(x => x).join('\n');
}

async function latinizeAddress(address, normalized = false) {
    if (!normalized) {
        address = await normalizeAddress(address);
    }

    const cleanedData = Object.assign({}, address);
    const countryCode = (address.countryCode || '').toUpperCase();
    const [_, database] = await loadCountryData(countryCode);

    if (countryCode) {
        const countryArea = address.countryArea;
        if (countryArea) {
            const key = `${countryCode}/${countryArea}`;
            const countryAreaData = database[key];
            if (countryAreaData) {
                cleanedData.countryArea = countryAreaData.lname || countryAreaData.name || countryArea;
                const city = address.city;
                const key = `${countryCode}/${countryArea}/${city}`;
                const cityData = database[key];
                if (cityData) {
                    cleanedData.city = cityData.lname || cityData.name || city;
                    const cityArea = address.cityArea;
                    const key = `${countryCode}/${countryArea}/${city}/${cityArea}`;
                    const cityAreaData = database[key];
                    if (cityAreaData) {
                        cleanedData.cityArea = cityAreaData.lname || cityAreaData.name || cityArea;
                    }
                }
            }
        }
    }

    return cleanedData;
}

module.exports = {
    KNOWN_FIELDS,
    loadValidationData,
    ValidationRules,
    getValidationRules,
    InvalidAddress,
    normalizeAddress,
    getFieldOrder,
    formatAddress,
    latinizeAddress,
};
