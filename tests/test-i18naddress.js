const { getFieldOrder, getValidationRules, loadValidationData } = require('..');

module.exports = {
    testInvalidCountryCode () {
        throws(() => loadValidationData('XX'));
        throws(() => loadValidationData('../../../etc/passwd'));
    },

    testDictionaryAccess () {
        data = loadValidationData('US');
        state = data['US/NV'];
        assertEq(state['name'], 'Nevada');
    },

    testValidationRulesCanada () {
        const validationData = getValidationRules({ countryCode: 'CA' })
        assertEq(validationData.countryCode, 'CA');
        assertEq(validationData.countryAreaChoices, [
            ['AB', 'Alberta'],
            ['BC', 'British Columbia'],
            ['BC', 'Colombie-Britannique'],
            ['MB', 'Manitoba'],
            ['NB', 'New Brunswick'],
            ['NB', 'Nouveau-Brunswick'],
            ['NL', 'Newfoundland and Labrador'],
            ['NL', 'Terre-Neuve-et-Labrador'],
            ['NS', 'Nouvelle-Écosse'],
            ['NS', 'Nova Scotia'],
            ['NT', 'Northwest Territories'],
            ['NT', 'Territoires du Nord-Ouest'],
            ['NU', 'Nunavut'],
            ['ON', 'Ontario'],
            ['PE', 'Prince Edward Island'],
            ['PE', 'Île-du-Prince-Édouard'],
            ['QC', 'Quebec'],
            ['QC', 'Québec'],
            ['SK', 'Saskatchewan'],
            ['YT', 'Yukon'],
        ]);
    },

    /*
    idk what’s going on here
    testValidationIndia () {
        const validationData = getValidationRules({ countryCode: 'IN' });
        assertEq(validationData.countryAreaChoices, [
            ['Andaman and Nicobar Islands', 'Andaman & Nicobar'],
            ['Andhra Pradesh', 'Andhra Pradesh'],
            ['Andhra Pradesh', 'आंध्र प्रदेश'],
            ['Arunachal Pradesh', 'Arunachal Pradesh'],
            ['Arunachal Pradesh', 'अरुणाचल प्रदेश'],
            ['Assam', 'Assam'],
            ['Assam', 'असम'],
            ['Bihar', 'Bihar'],
            ['Bihar', 'बिहार'],
            ['Chandigarh', 'Chandigarh'],
            ['Chandigarh', 'चंडीगढ़'],
            ['Chhattisgarh', 'Chhattisgarh'],
            ['Chhattisgarh', 'छत्तीसगढ़'],
            ['Dadra and Nagar Haveli', 'Dadra & Nagar Haveli'],
            ['Daman and Diu', 'Daman & Diu'],
            ['Delhi', 'Delhi'],
            ['Delhi', 'दिल्ली'],
            ['Goa', 'Goa'],
            ['Goa', 'गोआ'],
            ['Gujarat', 'Gujarat'],
            ['Gujarat', 'गुजरात'],
            ['Haryana', 'Haryana'],
            ['Haryana', 'हरियाणा'],
            ['Himachal Pradesh', 'Himachal Pradesh'],
            ['Himachal Pradesh', 'हिमाचल प्रदेश'],
            ['Jammu and Kashmir', 'Jammu & Kashmir'],
            ['Jharkhand', 'Jharkhand'],
            ['Jharkhand', 'झारखण्ड'],
            ['Karnataka', 'Karnataka'],
            ['Karnataka', 'कर्नाटक'],
            ['Kerala', 'Kerala'],
            ['Kerala', 'केरल'],
            ['Lakshadweep', 'Lakshadweep'],
            ['Lakshadweep', 'लक्षद्वीप'],
            ['Madhya Pradesh', 'Madhya Pradesh'],
            ['Madhya Pradesh', 'मध्य प्रदेश'],
            ['Maharashtra', 'Maharashtra'],
            ['Maharashtra', 'महाराष्ट्र'],
            ['Manipur', 'Manipur'],
            ['Manipur', 'मणिपुर'],
            ['Meghalaya', 'Meghalaya'],
            ['Meghalaya', 'मेघालय'],
            ['Mizoram', 'Mizoram'],
            ['Mizoram', 'मिजोरम'],
            ['Nagaland', 'Nagaland'],
            ['Nagaland', 'नागालैंड'],
            ['Odisha', 'Odisha'],
            ['Odisha', 'ओड़िशा'],
            ['Puducherry', 'Puducherry'],
            ['Puducherry', 'पांडिचेरी'],
            ['Punjab', 'Punjab'],
            ['Punjab', 'पंजाब'],
            ['Rajasthan', 'Rajasthan'],
            ['Rajasthan', 'राजस्थान'],
            ['Sikkim', 'Sikkim'],
            ['Sikkim', 'सिक्किम'],
            ['Tamil Nadu', 'Tamil Nadu'],
            ['Tamil Nadu', 'तमिल नाडु'],
            ['Telangana', 'Telangana'],
            ['Telangana', 'तेलंगाना'],
            ['Tripura', 'Tripura'],
            ['Tripura', 'त्रिपुरा'],
            ['Uttar Pradesh', 'Uttar Pradesh'],
            ['Uttar Pradesh', 'उत्तर प्रदेश'],
            ['Uttarakhand', 'Uttarakhand'],
            ['Uttarakhand', 'उत्तराखण्ड'],
            ['West Bengal', 'West Bengal'],
            ['West Bengal', 'पश्चिम बंगाल'],
            ['Andaman & Nicobar', 'अंडमान और निकोबार द्वीपसमूह'],
            ['Jammu & Kashmir', 'जम्मू और कश्मीर'],
            ['Daman & Diu', 'दमन और दीव'],
            ['Dadra & Nagar Haveli', 'दादरा और नगर हवेली'],
        ]);
    },
    */

    testValidationRulesSwitzerland () {
        const validationData = getValidationRules({ countryCode: 'CH' });
        assertEq(validationData.allowedFields.sort(), [
            'companyName', 'city', 'postalCode', 'streetAddress', 'name'
        ].sort());
        assertEq(validationData.requiredFields.sort(), [
            'city', 'postalCode', 'streetAddress'
        ].sort());
    },

    testFieldOrderPoland () {
        const fieldOrder = getFieldOrder({ countryCode: 'PL' });
        assertEq(fieldOrder, [
            ['name'],
            ['companyName'],
            ['streetAddress'],
            ['postalCode', 'city'],
        ]);
    },

    testFieldOrderChina() {
        const fieldOrder = getFieldOrder({ countryCode: 'CN' });
        assertEq(fieldOrder, [
            ['postalCode'],
            ['countryArea', 'city', 'cityArea'],
            ['streetAddress'],
            ['companyName'],
            ['name'],
        ]);
    },

    testLocalityTypes() {
        parametrize([
            ['CN', ['province', 'city', 'district']],
            ['JP', ['prefecture', 'city', 'suburb']],
            ['KR', ['do_si', 'city', 'district']],
        ] ,(country, levels) => {
            const validationData = getValidationRules({ countryCode: country });
            assertEq(validationData.countryAreaType, levels[0]);
            assertEq(validationData.cityType, levels[1]);
            assertEq(validationData.cityAreaType, levels[2]);
        });
    },
};
