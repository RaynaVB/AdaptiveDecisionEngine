module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'js'],
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.json'
        }]
    },
    transformIgnorePatterns: [
        "node_modules/(?!(uuid)/)"
    ],
    moduleNameMapper: {
        '^uuid$': '<rootDir>/tests/mocks/uuid.js'
    }
};
