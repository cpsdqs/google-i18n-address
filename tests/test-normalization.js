const { InvalidAddress, formatAddress, latinizeAddress, normalizeAddress } = require('..');

module.exports = {
    testValidateAreasErrors() {
        parametrize([
            [{},
             {countryCode: 'required', city: 'required',
              streetAddress: 'required'}],
            [{countryCode: 'AR'},
             {city: 'required', streetAddress: 'required'}],
            [{countryCode: 'CN', countryArea: '北京市', postalCode: '100084',
              city: 'Invalid', streetAddress: '...'},
             {city: 'invalid'}],
            [{countryCode: 'CN', countryArea: '云南省', postalCode: '677400',
              city: '临沧市', cityArea: 'Invalid', streetAddress: '...'},
             {cityArea: 'invalid'}],
            [{countryCode: 'DE', city: 'Berlin', postalCode: '77-777',
              streetAddress: '...'},
             {postalCode: 'invalid'}],
            [{countryCode: 'PL', city: 'Wrocław', postalCode: '77777',
              streetAddress: '...'},
             {postalCode: 'invalid'}],
            [{countryCode: 'KR'},
             {countryArea: 'required', postalCode: 'required',
              city: 'required', streetAddress: 'required'}],
            [{countryCode: 'US', countryArea: 'Nevada',
              postalCode: '90210', city: 'Las Vegas', streetAddress: '...'},
             {postalCode: 'invalid'}],
            [{countryCode: 'XX'},
             {countryCode: 'invalid'}],
            [{countryCode: 'ZZ'},
             {countryCode: 'invalid'}],
        ], (address, errors) => {
            try {
                normalizeAddress(address);
                assert(false, 'Should not pass');
            } catch (err) {
                assert(err instanceof InvalidAddress, `${err} should be an InvalidAddress error`);
                assertEq(err.errors, errors);
            }
        });
    },

    testValidateKnownAddresses () {
        parametrize([
            [{countryCode: 'AE', countryArea: 'Dubai', city: 'Dubai',
             streetAddress: 'P.O Box 1234'}],
            [{countryCode: 'CA', countryArea: 'QC', city: 'Montreal',
             postalCode: 'H3Z 2Y7', streetAddress: '10-123 1/2 MAIN STREET NW'}],
            [{countryCode: 'CH', city: 'Zürich', postalCode: '8022',
             streetAddress: 'Kappelergasse 1'}],
            [{countryCode: 'CN', countryArea: '北京市', postalCode: '100084',
             city: '海淀区', streetAddress: '中关村东路1号'}],
            [{countryCode: 'CN', countryArea: '云南省', postalCode: '677400',
             city: '临沧市', cityArea: '凤庆县', streetAddress: '中关村东路1号'}],
            [{countryCode: 'CN', countryArea: 'Beijing Shi',
             postalCode: '100084', city: 'Haidian Qu',
             streetAddress: '#1 Zhongguancun East Road'}],
            [{countryCode: 'JP', countryArea: '東京都', postalCode: '150-8512',
             city: '渋谷区', streetAddress: '桜丘町26-1'}],
            [{countryCode: 'JP', countryArea: 'Tokyo', postalCode: '150-8512',
             city: 'Shibuya-ku', streetAddress: '26-1 Sakuragaoka-cho'}],
            [{countryCode: 'KR', countryArea: '서울', postalCode: '06136',
             city: '강남구', streetAddress: '역삼동 737번지 강남파이낸스센터'}],
            [{countryCode: 'KR', countryArea: '서울특별시', postalCode: '06136',
             city: '강남구', streetAddress: '역삼동 737번지 강남파이낸스센터'}],
            [{countryCode: 'KR', countryArea: 'Seoul', postalCode: '06136',
             city: 'Gangnam-gu', streetAddress: '역삼동 737번지 강남파이낸스센터'}],
            [{countryCode: 'PL', city: 'Warszawa', postalCode: '00-374',
             streetAddress: 'Aleje Jerozolimskie 2'}],
            [{countryCode: 'US', countryArea: 'California',
             postalCode: '94037', city: 'Mountain View',
             streetAddress: '1600 Charleston Rd.'}],
        ], address => {
            normalizeAddress(address);
        });
    },

    testLocalizationHandling () {
        let address;
        address = normalizeAddress({
            countryCode: 'us',
            countryArea: 'California',
            postalCode: '94037',
            city: 'Mountain View',
            streetAddress: '1600 Charleston Rd.',
        });
        assertEq(address.countryCode, 'US');
        assertEq(address.countryArea, 'CA');
        address = normalizeAddress({
            countryCode: 'us',
            countryArea: 'CALIFORNIA',
            postalCode: '94037',
            city: 'Mountain View',
            streetAddress: '1600 Charleston Rd.',
        });
        assertEq(address.countryArea, 'CA');
        address = normalizeAddress({
            countryCode: 'CN',
            countryArea: 'Beijing Shi',
            postalCode: '100084',
            city: 'Haidian Qu',
            streetAddress: '#1 Zhongguancun East Road',
        });
        assertEq(address.countryArea, '北京市');
        assertEq(address.city, '海淀区');
        address = normalizeAddress({
            countryCode: 'AE',
            countryArea: 'Dubai',
            postalCode: '123456',
            sortingCode: '654321',
            streetAddress: 'P.O Box 1234',
        });
        assertEq(address.countryArea, 'إمارة دبيّ');
        assertEq(address.city, '');
        assertEq(address.postalCode, '');
        assertEq(address.sortingCode, '');
    },

    testAddressFormatting () {
        const address = {
            countryCode: 'CN',
            countryArea: '云南省',
            postalCode: '677400',
            city: '临沧市',
            cityArea: '凤庆县',
            streetAddress: '中关村东路1号'
        };
        const result = formatAddress(address, false);
        assertEq(result,
            '677400\n' +
            '云南省临沧市凤庆县\n' +
            '中关村东路1号\n' +
            'CHINA'
        );
    },

    testCapitalization () {
        const address = normalizeAddress({
            countryCode: 'GB',
            postalCode: 'sw1a 0aa',
            city: 'London',
            streetAddress: 'Westminster',
        });
        assertEq(address.city, 'LONDON');
        assertEq(address.postalCode, 'SW1A 0AA');
    },

    testAddressLatinization () {
        let address;
        address = {};
        address = latinizeAddress(address, true);
        assertEq(address, {});
        address = {
            countryCode: 'US',
            countryArea: 'CA',
            postalCode: '94037',
            city: 'Mountain View',
            streetAddress: '1600 Charleston Rd.',
        };
        address = latinizeAddress(address);
        assertEq(address.countryArea, 'California');
        address = {
            countryCode: 'CN',
            countryArea: '云南省',
            postalCode: '677400',
            city: '临沧市',
            cityArea: '凤庆县',
            streetAddress: '中关村东路1号',
        };
        address = latinizeAddress(address);
        assertEq(address, {
            countryCode: 'CN',
            countryArea: 'Yunnan Sheng',
            postalCode: '677400',
            city: 'Lincang Shi',
            cityArea: 'Fengqing Xian',
            streetAddress: '中关村东路1号',
            sortingCode: '',
        });
        address = {
            name: 'Zhang San',
            companyName: 'Beijing Kid Toy Company',
            countryCode: 'CN',
            countryArea: '北京市',
            city: '海淀区',
            postalCode: '100084',
            sortingCode: '',
            streetAddress: '#1 Zhongguancun East Road',
        };
        address = latinizeAddress(address);
        result = formatAddress(address, true);
        assertEq(result,
            'Zhang San\n' +
            'Beijing Kid Toy Company\n' +
            '#1 Zhongguancun East Road\n' +
            'Haidian Qu\n' +
            'BEIJING SHI, 100084\n' +
            'CHINA'
        );
    },
};
